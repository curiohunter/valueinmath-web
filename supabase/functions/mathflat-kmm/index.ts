import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MathFlatApiClient } from "../_shared/mathflat-api-client.ts";
import type {
  DBMathflatKmmResult,
  KmmCollectionResult,
} from "../_shared/mathflat-types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getYearMonthKST(date: Date): string {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(date.getTime() + kstOffset);
  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
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

async function collectKmmResults(options: {
  yearMonth: string;
}): Promise<KmmCollectionResult> {
  const startedAt = new Date().toISOString();
  const { yearMonth } = options;
  const errors: string[] = [];

  console.log(`[KMM] 수집 시작: ${yearMonth}`);

  const result: KmmCollectionResult = {
    success: false,
    yearMonth,
    totalExamGroups: 0,
    totalStudentResults: 0,
    errors: [],
    startedAt,
    completedAt: "",
    durationMs: 0,
  };

  try {
    const apiClient = new MathFlatApiClient();
    const supabase = getSupabaseAdmin();

    const examGroups = await apiClient.getKmmResults(yearMonth);
    result.totalExamGroups = examGroups.length;

    const records: DBMathflatKmmResult[] = [];

    for (const group of examGroups) {
      for (const studentExam of group.studentExams) {
        records.push({
          year_month: yearMonth,
          exam_id: group.id,
          school_type: group.schoolType,
          grade: group.grade,
          student_exam_id: studentExam.id,
          mathflat_student_id: studentExam.studentId,
          student_name: studentExam.studentName,
          status: studentExam.status,
          score: studentExam.score,
          correct_count: studentExam.correctCount,
          wrong_count: studentExam.wrongCount,
          tier: studentExam.tier,
        });
      }
    }

    console.log(`[KMM] ${records.length}개 레코드 변환 완료`);

    if (records.length > 0) {
      const { error: upsertError } = await supabase
        .from("mathflat_kmm_results")
        .upsert(records, {
          onConflict: "year_month,student_exam_id",
          ignoreDuplicates: false,
        });

      if (upsertError) {
        errors.push(`DB 저장 실패: ${upsertError.message}`);
      } else {
        console.log(`[KMM] ${records.length}개 레코드 저장 완료`);
      }
    }

    result.success = errors.length === 0;
    result.totalStudentResults = records.length;
  } catch (error) {
    errors.push(`수집 중 오류: ${error}`);
  }

  result.errors = errors;
  result.completedAt = new Date().toISOString();
  result.durationMs =
    new Date(result.completedAt).getTime() - new Date(startedAt).getTime();

  console.log(
    `[KMM] 수집 완료: ${result.totalExamGroups}개 그룹, ${result.totalStudentResults}명, ${result.durationMs}ms`
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

  let body: { yearMonth?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const yearMonth = body.yearMonth || getYearMonthKST(new Date());

  console.log(`[EdgeFunction] KMM 경시대회 수집 시작: ${yearMonth}`);

  try {
    const result = await collectKmmResults({ yearMonth });

    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.success
          ? `KMM 경시대회 수집 완료`
          : `수집 실패`,
        data: {
          yearMonth: result.yearMonth,
          totalExamGroups: result.totalExamGroups,
          totalStudentResults: result.totalStudentResults,
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
    console.error("[EdgeFunction] KMM 수집 중 예외 발생:", error);
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
