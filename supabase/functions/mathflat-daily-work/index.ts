import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MathFlatApiClient } from "../_shared/mathflat-api-client.ts";
import type {
  DBMathflatDailyWork,
  DailyWorkCollectionResult,
  MathFlatWorkItem,
} from "../_shared/mathflat-types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

async function collectDailyWork(options: {
  targetDate: Date;
  studentIds?: string[];
}): Promise<DailyWorkCollectionResult> {
  const startedAt = new Date().toISOString();
  const targetDate = formatDateKST(options.targetDate);
  const errors: string[] = [];

  console.log(`[DailyWork] Phase 1 시작: ${targetDate}`);

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

    console.log(`[DailyWork] ${records.length}개 레코드 변환 완료`);

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
        console.log(`[DailyWork] ${records.length}개 레코드 저장 완료`);
      }
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
    `[DailyWork] Phase 1 완료: ${result.totalStudents}명, ${result.totalWorkCount}건, ${result.durationMs}ms`
  );
  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // cron 인증 통과
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

  let body: { targetDate?: string; studentIds?: string[] };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { targetDate, studentIds } = body;

  let parsedDate: Date;
  if (targetDate) {
    parsedDate = new Date(targetDate + "T00:00:00+09:00");
  } else {
    parsedDate = new Date();
  }

  console.log(`[EdgeFunction] 일일 풀이 수집 시작 (Phase 1 only)`);

  try {
    const result = await collectDailyWork({
      targetDate: parsedDate,
      studentIds,
    });

    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.success
          ? `일일 풀이 수집 완료 (오답 상세는 별도 함수에서 수집)`
          : `수집 실패`,
        data: {
          targetDate: result.targetDate,
          totalStudents: result.totalStudents,
          totalWorkCount: result.totalWorkCount,
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
