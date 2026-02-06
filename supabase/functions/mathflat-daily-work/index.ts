import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MathFlatApiClient } from "../_shared/mathflat-api-client.ts";
import type {
  DBMathflatDailyWork,
  DBMathflatProblemResult,
  DailyWorkCollectionResult,
  MathFlatWorkItem,
  MathFlatWorkbookProblem,
  MathFlatWorksheetProblem,
} from "../_shared/mathflat-types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DELAY_BETWEEN_PROBLEMS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDateKST(date: Date): string {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(date.getTime() + kstOffset);
  return kstDate.toISOString().split("T")[0];
}

function getCategory(
  type: string
): "CHALLENGE" | "CHALLENGE_WRONG" | "CUSTOM" {
  if (type === "CHALLENGE") return "CHALLENGE";
  if (type === "SUPPLEMENTARY_WRONG_CHALLENGE") return "CHALLENGE_WRONG";
  return "CUSTOM";
}

function calcCorrectRate(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

function workDate(datetime?: string): string | null {
  if (!datetime) return null;
  return datetime.split("T")[0];
}

function convertToDBRecord(
  studentId: string,
  studentName: string,
  recordWorkDate: string,
  item: MathFlatWorkItem,
  component: MathFlatWorkItem["components"][0]
): DBMathflatDailyWork {
  return {
    mathflat_student_id: studentId,
    student_name: studentName,
    work_date: recordWorkDate,
    work_type: item.bookType,
    category: getCategory(item.type),
    book_id: item.bookId?.toString(),
    student_book_id: component.studentBookId?.toString(),
    student_workbook_id: component.studentWorkbookId?.toString(),
    progress_id_list: component.progressIdList,
    title: item.title,
    subtitle: item.subtitle,
    chapter: item.chapter,
    page: component.page,
    assigned_count: component.assignedCount || 0,
    correct_count: component.correctCount || 0,
    wrong_count: component.wrongCount || 0,
    correct_rate: calcCorrectRate(
      component.correctCount || 0,
      component.assignedCount || 0
    ),
    update_datetime: component.updateDatetime,
  };
}

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * 오답 문제 상세 수집 (시간 기반 동적 배치 처리)
 */
async function collectProblemDetails(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  apiClient: MathFlatApiClient,
  targetDate: string,
  errors: string[],
  maxDurationMs: number = 5 * 60 * 1000
): Promise<{
  totalWrongCollected: number;
  remainingDailyWorks: number;
  batchesProcessed: number;
}> {
  const startTime = Date.now();
  let totalWrongCollected = 0;
  let remainingDailyWorks = 0;
  let batchesProcessed = 0;
  const processedDailyWorkIds = new Set<string>();

  console.log(
    `[DailyWorkCollector] 오답 수집 시작 (최대 ${maxDurationMs / 1000}초)`
  );

  while (true) {
    const elapsed = Date.now() - startTime;
    if (elapsed > maxDurationMs) {
      console.log(
        `[DailyWorkCollector] 시간 초과 (${Math.round(elapsed / 1000)}초), 중단`
      );
      break;
    }

    const { data: dailyWorks, error: dwError } = await supabase
      .from("mathflat_daily_work")
      .select(
        "id, mathflat_student_id, student_name, work_type, student_book_id, student_workbook_id, progress_id_list, wrong_count"
      )
      .eq("work_date", targetDate)
      .gt("wrong_count", 0)
      .order("wrong_count", { ascending: true });

    if (dwError || !dailyWorks || dailyWorks.length === 0) {
      console.log(`[DailyWorkCollector] 오답 수집 대상 없음`);
      break;
    }

    const dailyWorkIds = dailyWorks.map((dw) => dw.id);
    const { data: existingResults } = await supabase
      .from("mathflat_problem_results")
      .select("daily_work_id")
      .in("daily_work_id", dailyWorkIds);

    const existingDailyWorkIds = new Set(
      existingResults?.map((r) => r.daily_work_id) || []
    );

    const newDailyWorks = dailyWorks.filter(
      (dw) =>
        !existingDailyWorkIds.has(dw.id) && !processedDailyWorkIds.has(dw.id)
    );

    if (newDailyWorks.length === 0) {
      console.log(`[DailyWorkCollector] 모든 오답 수집 완료!`);
      remainingDailyWorks = 0;
      break;
    }

    let estimatedWrongCount = 0;
    const batchDailyWorks: typeof newDailyWorks = [];

    for (const dw of newDailyWorks) {
      if (
        estimatedWrongCount + (dw.wrong_count || 0) > 100 &&
        batchDailyWorks.length > 0
      ) {
        break;
      }
      batchDailyWorks.push(dw);
      estimatedWrongCount += dw.wrong_count || 0;
    }

    remainingDailyWorks = newDailyWorks.length - batchDailyWorks.length;
    batchesProcessed++;

    console.log(
      `[DailyWorkCollector] 배치 ${batchesProcessed}: ${batchDailyWorks.length}건 처리 중 (예상 오답 ${estimatedWrongCount}개, 남은 건: ${remainingDailyWorks})`
    );

    const batchResults: DBMathflatProblemResult[] = [];

    for (const dw of batchDailyWorks) {
      if (Date.now() - startTime > maxDurationMs) {
        console.log(`[DailyWorkCollector] 배치 처리 중 시간 초과, 중단`);
        remainingDailyWorks =
          newDailyWorks.length - batchDailyWorks.indexOf(dw);
        break;
      }

      try {
        let problems: (MathFlatWorkbookProblem | MathFlatWorksheetProblem)[] =
          [];

        if (
          dw.work_type === "WORKBOOK" &&
          dw.progress_id_list &&
          dw.student_workbook_id &&
          dw.student_book_id
        ) {
          for (const progressId of dw.progress_id_list) {
            await delay(DELAY_BETWEEN_PROBLEMS);
            try {
              const workbookProblems = await apiClient.getWorkbookProblems(
                dw.mathflat_student_id,
                dw.student_workbook_id,
                parseInt(dw.student_book_id, 10),
                progressId
              );
              workbookProblems.forEach((p) => {
                if (!p.studentWorkbookProgressId) {
                  p.studentWorkbookProgressId = progressId;
                }
              });
              problems.push(...workbookProblems);
            } catch (e) {
              errors.push(`Workbook 문제 조회 실패 (${dw.id}): ${e}`);
            }
          }
        } else if (dw.work_type === "WORKSHEET" && dw.student_book_id) {
          await delay(DELAY_BETWEEN_PROBLEMS);
          try {
            const worksheetProblems = await apiClient.getWorksheetProblems(
              parseInt(dw.student_book_id, 10)
            );
            problems.push(...worksheetProblems);
          } catch (e) {
            errors.push(`Worksheet 문제 조회 실패 (${dw.id}): ${e}`);
          }
        }

        const wrongProblems = problems.filter(
          (p) => p.result === "WRONG" || (p.result as string) === "UNKNOWN"
        );

        for (const problem of wrongProblems) {
          const isWorkbook = "workbookProblemId" in problem;
          const workbookProblem = problem as MathFlatWorkbookProblem;
          batchResults.push({
            daily_work_id: dw.id,
            progress_id: isWorkbook
              ? workbookProblem.studentWorkbookProgressId
              : undefined,
            problem_id: String(problem.problemId),
            workbook_problem_id: isWorkbook
              ? String(workbookProblem.workbookProblemId)
              : undefined,
            worksheet_problem_id: !isWorkbook
              ? String(
                  (problem as MathFlatWorksheetProblem).worksheetProblemId
                )
              : undefined,
            problem_title: problem.problemTitle,
            problem_number: problem.problemNumber,
            concept_id: problem.conceptId
              ? String(problem.conceptId)
              : undefined,
            concept_name: problem.conceptName,
            topic_id: problem.topicId ? String(problem.topicId) : undefined,
            sub_topic_id: problem.subTopicId
              ? String(problem.subTopicId)
              : undefined,
            level: problem.level,
            type: problem.type,
            tag_top: problem.tagTop,
            correct_answer: problem.correctAnswer,
            user_answer: problem.userAnswer,
            result: problem.result as DBMathflatProblemResult["result"],
            total_used: problem.totalUsed,
            correct_times: problem.correctTimes,
            wrong_times: problem.wrongTimes,
            answer_rate: problem.answerRate,
            problem_image_url: problem.problemImageUrl,
            solution_image_url: problem.solutionImageUrl,
          });
        }

        totalWrongCollected += wrongProblems.length;
        processedDailyWorkIds.add(dw.id);
        console.log(
          `[DailyWorkCollector] ${dw.student_name}: ${wrongProblems.length}개 오답`
        );
      } catch (error) {
        errors.push(`오답 수집 실패 (${dw.id}): ${error}`);
        processedDailyWorkIds.add(dw.id);
      }
    }

    if (batchResults.length > 0) {
      const saveBatchSize = 100;
      for (let i = 0; i < batchResults.length; i += saveBatchSize) {
        const batch = batchResults.slice(i, i + saveBatchSize);
        const { error: insertError } = await supabase
          .from("mathflat_problem_results")
          .insert(batch);

        if (insertError) {
          errors.push(`오답 저장 실패: ${insertError.message}`);
        }
      }
      console.log(
        `[DailyWorkCollector] 배치 ${batchesProcessed} 저장 완료: ${batchResults.length}개`
      );
    }
  }

  const totalElapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(
    `[DailyWorkCollector] 오답 수집 종료: ${batchesProcessed}배치, ${totalWrongCollected}개 수집, ${totalElapsed}초 소요, 남은 건: ${remainingDailyWorks}`
  );

  return { totalWrongCollected, remainingDailyWorks, batchesProcessed };
}

/**
 * 일일 풀이 수집 메인 함수
 */
async function collectDailyWork(options: {
  targetDate: Date;
  studentIds?: string[];
  collectProblemDetails?: boolean;
  maxDurationMs?: number;
}): Promise<DailyWorkCollectionResult> {
  const startedAt = new Date().toISOString();
  const targetDate = formatDateKST(options.targetDate);
  const errors: string[] = [];

  console.log(`[DailyWorkCollector] 시작: ${targetDate}`);

  const result: DailyWorkCollectionResult = {
    success: false,
    targetDate,
    totalStudents: 0,
    totalWorkCount: 0,
    errors: [],
    startedAt,
    completedAt: "",
    durationMs: 0,
  };

  try {
    const apiClient = new MathFlatApiClient();
    const supabase = getSupabaseAdmin();

    const { works, errors: apiErrors } = await apiClient.collectAllDailyWork(
      targetDate,
      options.studentIds
    );
    errors.push(...apiErrors);

    const records: DBMathflatDailyWork[] = [];

    for (const work of works) {
      for (const item of work.items) {
        for (const component of item.components || []) {
          if (component.assignedCount > 0) {
            records.push(
              convertToDBRecord(
                work.studentId,
                work.studentName,
                workDate(component.updateDatetime) || targetDate,
                item,
                component
              )
            );
          }
        }

        for (const selfLearning of item.selfLearnings || []) {
          for (const component of selfLearning.components || []) {
            if (component.assignedCount > 0) {
              records.push(
                convertToDBRecord(
                  work.studentId,
                  work.studentName,
                  workDate(component.updateDatetime) || targetDate,
                  selfLearning,
                  component
                )
              );
            }
          }
        }
      }
    }

    console.log(`[DailyWorkCollector] ${records.length}개 레코드 변환 완료`);

    if (records.length > 0) {
      const { error: upsertError } = await supabase
        .from("mathflat_daily_work")
        .upsert(records, {
          onConflict: "mathflat_student_id,work_date,student_book_id",
          ignoreDuplicates: false,
        });

      if (upsertError) {
        errors.push(`DB 저장 실패: ${upsertError.message}`);
      } else {
        console.log(
          `[DailyWorkCollector] ${records.length}개 레코드 저장 완료`
        );
      }
    }

    // 오답 상세 수집 (Edge Function은 5분까지 가능)
    if (options.collectProblemDetails !== false) {
      const maxDurationMs = options.maxDurationMs || 5 * 60 * 1000;
      console.log(
        `[DailyWorkCollector] 오답 상세 수집 시작 (최대 ${maxDurationMs / 1000}초)...`
      );
      const { totalWrongCollected, remainingDailyWorks, batchesProcessed } =
        await collectProblemDetails(
          supabase,
          apiClient,
          targetDate,
          errors,
          maxDurationMs
        );
      result.totalProblemCount = totalWrongCollected;
      result.remainingDailyWorks = remainingDailyWorks;
      result.batchesProcessed = batchesProcessed;
      console.log(
        `[DailyWorkCollector] 오답 수집 완료: ${batchesProcessed}배치, ${totalWrongCollected}개, 남은 작업: ${remainingDailyWorks}건`
      );
    }

    result.success = errors.length === 0;
    result.totalStudents = works.length;
    result.totalWorkCount = records.length;
  } catch (error) {
    errors.push(`수집 중 오류: ${error}`);
  }

  result.errors = errors;
  result.completedAt = new Date().toISOString();
  result.durationMs =
    new Date(result.completedAt).getTime() - new Date(startedAt).getTime();

  console.log(
    `[DailyWorkCollector] 완료: ${result.totalWorkCount}건, ${result.durationMs}ms`
  );
  return result;
}

// ─── Deno.serve 진입점 ───

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 인증: CRON_SECRET Bearer 토큰 또는 Supabase JWT
  const authHeader = req.headers.get("authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");

  // pg_cron은 CRON_SECRET으로 인증
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // OK - cron 인증 통과
  } else {
    // Supabase JWT 인증 시도 (수동 호출 시)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (supabaseUrl && anonKey && authHeader) {
      const supabase = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // 요청 파싱
  let body: {
    targetDate?: string;
    studentIds?: string[];
    collectProblemDetails?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { targetDate, studentIds, collectProblemDetails } = body;

  let parsedDate: Date;
  if (targetDate) {
    parsedDate = new Date(targetDate + "T00:00:00+09:00");
  } else {
    parsedDate = new Date();
  }

  console.log(
    `[EdgeFunction] 일일 풀이 수집 시작 (오답 상세: ${collectProblemDetails !== false ? "예" : "아니오"})`
  );

  try {
    const result = await collectDailyWork({
      targetDate: parsedDate,
      studentIds,
      collectProblemDetails,
    });

    const hasRemaining = (result.remainingDailyWorks || 0) > 0;
    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.success
          ? hasRemaining
            ? `수집 완료 (오답 ${result.remainingDailyWorks}건 남음, 다음 호출에서 계속)`
            : `수집 완료 (모든 오답 처리됨)`
          : `수집 실패`,
        data: {
          targetDate: result.targetDate,
          totalStudents: result.totalStudents,
          totalWorkCount: result.totalWorkCount,
          batchesProcessed: result.batchesProcessed || 0,
          wrongProblemsCollected: result.totalProblemCount || 0,
          remainingDailyWorks: result.remainingDailyWorks || 0,
          errorCount: result.errors.length,
          durationMs: result.durationMs,
        },
        errors: result.errors.length > 0 ? result.errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[EdgeFunction] 수집 중 예외 발생:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        message: String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
