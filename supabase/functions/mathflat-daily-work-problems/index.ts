import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MathFlatApiClient } from "../_shared/mathflat-api-client.ts";
import type {
  DBMathflatProblemResult,
  MathFlatWorkbookProblem,
  MathFlatWorksheetProblem,
} from "../_shared/mathflat-types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_DURATION_MS = 120_000;
const MAX_CHAIN_DEPTH = 15;
const DELAY_BETWEEN_PROBLEMS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatDateKST(date: Date): string {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(date.getTime() + kstOffset);
  return kstDate.toISOString().split("T")[0];
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
 * 다음 체인을 트리거 (AbortController로 응답 대기 없이 요청만 전송)
 */
async function triggerNextChain(
  targetDate: string,
  chainDepth: number
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (!supabaseUrl || !cronSecret) {
    console.error("[ProblemCollector] 체인 트리거 실패: 환경변수 없음");
    return;
  }

  console.log(`[ProblemCollector] 체인 ${chainDepth + 1} 트리거 중...`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    await fetch(
      `${supabaseUrl}/functions/v1/mathflat-daily-work-problems`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${cronSecret}`,
        },
        body: JSON.stringify({ targetDate, chainDepth: chainDepth + 1 }),
        signal: controller.signal,
      }
    );
    console.log(`[ProblemCollector] 체인 트리거 응답 수신`);
  } catch {
    console.log(`[ProblemCollector] 체인 트리거 전송됨 (응답 대기 중단)`);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 오답 문제 상세 수집 (120초 타임아웃, 배치 처리)
 */
async function collectProblemDetails(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  apiClient: MathFlatApiClient,
  targetDate: string,
  errors: string[]
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
    `[ProblemCollector] 오답 수집 시작 (최대 ${MAX_DURATION_MS / 1000}초)`
  );

  while (true) {
    const elapsed = Date.now() - startTime;
    if (elapsed > MAX_DURATION_MS) {
      console.log(
        `[ProblemCollector] 시간 초과 (${Math.round(elapsed / 1000)}초), 중단`
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
      console.log(`[ProblemCollector] 오답 수집 대상 없음`);
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
      console.log(`[ProblemCollector] 모든 오답 수집 완료!`);
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
      `[ProblemCollector] 배치 ${batchesProcessed}: ${batchDailyWorks.length}건 (예상 오답 ${estimatedWrongCount}개, 남은 건: ${remainingDailyWorks})`
    );

    const batchResults: DBMathflatProblemResult[] = [];

    for (const dw of batchDailyWorks) {
      if (Date.now() - startTime > MAX_DURATION_MS) {
        console.log(`[ProblemCollector] 배치 처리 중 시간 초과, 중단`);
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
          `[ProblemCollector] ${dw.student_name}: ${wrongProblems.length}개 오답`
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
        `[ProblemCollector] 배치 ${batchesProcessed} 저장: ${batchResults.length}개`
      );
    }
  }

  const totalElapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(
    `[ProblemCollector] 완료: ${batchesProcessed}배치, ${totalWrongCollected}개, ${totalElapsed}초, 남은 건: ${remainingDailyWorks}`
  );

  return { totalWrongCollected, remainingDailyWorks, batchesProcessed };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // cron/chain 인증 통과
  } else {
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

  let body: { targetDate?: string; chainDepth?: number };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { targetDate, chainDepth = 0 } = body;

  if (chainDepth >= MAX_CHAIN_DEPTH) {
    console.log(
      `[ProblemCollector] 최대 체인 깊이(${MAX_CHAIN_DEPTH}) 도달, 종료`
    );
    return new Response(
      JSON.stringify({
        success: true,
        message: `최대 체인 깊이(${MAX_CHAIN_DEPTH}) 도달`,
        chainDepth,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const resolvedDate = targetDate || formatDateKST(new Date());

  console.log(`[ProblemCollector] 체인 ${chainDepth} 시작: ${resolvedDate}`);

  try {
    const apiClient = new MathFlatApiClient();
    const supabase = getSupabaseAdmin();
    const errors: string[] = [];

    const { totalWrongCollected, remainingDailyWorks, batchesProcessed } =
      await collectProblemDetails(supabase, apiClient, resolvedDate, errors);

    // 남은 작업이 있으면 다음 체인 트리거
    if (remainingDailyWorks > 0 && chainDepth < MAX_CHAIN_DEPTH - 1) {
      await triggerNextChain(resolvedDate, chainDepth);
    }

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        message:
          remainingDailyWorks > 0
            ? `오답 수집 진행 중 (${remainingDailyWorks}건 남음, 체인 ${chainDepth + 1} 트리거됨)`
            : `오답 수집 완료`,
        data: {
          targetDate: resolvedDate,
          chainDepth,
          batchesProcessed,
          wrongProblemsCollected: totalWrongCollected,
          remainingDailyWorks,
          errorCount: errors.length,
        },
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ProblemCollector] 예외 발생:", error);
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
