import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MathFlatApiClient } from "../_shared/mathflat-api-client.ts";
import type {
  DBMathflatHomework,
  HomeworkCollectionResult,
  ProcessedClassResult,
  TargetClassInfo,
} from "../_shared/mathflat-types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// 요일 매핑
const DAY_NUMBER_TO_KR: Record<number, string> = {
  0: "일", 1: "월", 2: "화", 3: "수", 4: "목", 5: "금", 6: "토",
};

function formatDateKST(date: Date): string {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(date.getTime() + kstOffset);
  return kstDate.toISOString().split("T")[0];
}

function getDayOfWeekKST(date: Date): number {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(date.getTime() + kstOffset);
  return kstDate.getUTCDay();
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

async function getClassesByMathflatIds(
  mathflatClassIds: string[]
): Promise<TargetClassInfo[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("classes")
    .select("id, name, mathflat_class_id")
    .in("mathflat_class_id", mathflatClassIds)
    .eq("is_active", true);

  if (error) {
    throw new Error(`반 정보 조회 실패: ${error.message}`);
  }

  return (data || []).map((c) => ({
    id: c.id,
    name: c.name,
    mathflatClassId: c.mathflat_class_id,
    dayOfWeek: "",
  }));
}

async function getTodayClasses(targetDate: Date): Promise<TargetClassInfo[]> {
  const supabase = getSupabaseAdmin();
  const dayOfWeek = getDayOfWeekKST(targetDate);
  const dayKr = DAY_NUMBER_TO_KR[dayOfWeek];

  const { data, error } = await supabase
    .from("class_schedules")
    .select(
      `
      class_id,
      day_of_week,
      classes!inner (
        id,
        name,
        mathflat_class_id,
        is_active
      )
    `
    )
    .eq("day_of_week", dayKr);

  if (error) {
    throw new Error(`수업 스케줄 조회 실패: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  const classMap = new Map<string, TargetClassInfo>();

  for (const schedule of data) {
    const classInfo = schedule.classes as unknown as {
      id: string;
      name: string;
      mathflat_class_id: string | null;
      is_active: boolean;
    };

    if (
      classInfo.is_active &&
      classInfo.mathflat_class_id &&
      !classMap.has(classInfo.id)
    ) {
      classMap.set(classInfo.id, {
        id: classInfo.id,
        name: classInfo.name,
        mathflatClassId: classInfo.mathflat_class_id,
        dayOfWeek: schedule.day_of_week,
      });
    }
  }

  return Array.from(classMap.values());
}

async function upsertHomework(
  homework: DBMathflatHomework
): Promise<{ id: string; isNew: boolean }> {
  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from("mathflat_homework")
    .select("id")
    .eq("mathflat_class_id", homework.mathflat_class_id)
    .eq("mathflat_student_id", homework.mathflat_student_id)
    .eq("homework_date", homework.homework_date)
    .eq("student_homework_id", homework.student_homework_id)
    .single();

  if (existing) {
    const updateData: Record<string, unknown> = {
      completed: homework.completed,
      score: homework.score,
      title: homework.title,
      page: homework.page,
      progress_id_list: homework.progress_id_list,
    };

    if (homework.worksheet_problem_ids !== undefined) {
      updateData.worksheet_problem_ids = homework.worksheet_problem_ids;
    }
    if (homework.total_problems !== undefined) {
      updateData.total_problems = homework.total_problems;
    }

    const { error } = await supabase
      .from("mathflat_homework")
      .update(updateData)
      .eq("id", existing.id);

    if (error) {
      throw new Error(`숙제 업데이트 실패: ${error.message}`);
    }

    return { id: existing.id, isNew: false };
  }

  const { data, error } = await supabase
    .from("mathflat_homework")
    .insert(homework)
    .select("id")
    .single();

  if (error) {
    throw new Error(`숙제 삽입 실패: ${error.message}`);
  }

  return { id: data.id, isNew: true };
}

async function getDbStudentNameToId(classId: string): Promise<Map<string, string>> {
  const supabase = getSupabaseAdmin();
  const nameToId = new Map<string, string>();

  const { data, error } = await supabase
    .from("class_students")
    .select("students!inner(name, mathflat_student_id)")
    .eq("class_id", classId);

  if (error) {
    console.error(`[숙제수집] DB 학생 매핑 조회 실패: ${error.message}`);
    return nameToId;
  }

  for (const row of data || []) {
    const student = row.students as unknown as {
      name: string;
      mathflat_student_id: string | null;
    };
    if (student.name && student.mathflat_student_id) {
      nameToId.set(student.name, student.mathflat_student_id);
    }
  }

  return nameToId;
}

async function collectHomeworkData(
  targetClasses: TargetClassInfo[],
  targetDateStr: string,
  homeworkDateStr: string,
  apiClient: MathFlatApiClient,
  result: HomeworkCollectionResult
): Promise<void> {
  for (const classInfo of targetClasses) {
    const classResult: ProcessedClassResult = {
      classId: classInfo.id,
      className: classInfo.name,
      mathflatClassId: classInfo.mathflatClassId,
      studentCount: 0,
      homeworkCount: 0,
      problemCount: 0,
    };

    try {
      console.log(
        `[숙제수집] ${classInfo.name} (${classInfo.mathflatClassId}) 시작`
      );

      const dbStudentNameToId = await getDbStudentNameToId(classInfo.id);

      const apiResult = await apiClient.collectClassHomework(
        classInfo.mathflatClassId,
        targetDateStr,
        false,
        dbStudentNameToId
      );

      classResult.studentCount = apiResult.students.length;

      for (const studentData of apiResult.students) {
        for (const homeworkData of studentData.homeworks) {
          const hw = homeworkData.homework;

          let worksheetProblemIds: number[] | undefined;
          let totalProblems: number | undefined;
          if (hw.bookType === "WORKSHEET" && hw.studentBookId) {
            try {
              const problems = await apiClient.getWorksheetProblems(
                hw.studentBookId
              );
              worksheetProblemIds = problems.map(
                (p) => p.worksheetProblemId
              );
              totalProblems = problems.length;
              console.log(
                `[숙제수집] WORKSHEET ${hw.title} 문제 수: ${totalProblems}`
              );
            } catch (err) {
              console.error(`[숙제수집] WORKSHEET 문제 조회 실패: ${err}`);
            }
          }

          const dbHomework: DBMathflatHomework = {
            class_id: classInfo.id,
            mathflat_class_id: classInfo.mathflatClassId,
            mathflat_student_id: studentData.studentId
              ? String(studentData.studentId)
              : studentData.studentName,
            student_name: studentData.studentName,
            homework_date: homeworkDateStr,
            book_type: hw.bookType,
            book_id: hw.bookId
              ? String(hw.bookId)
              : hw.studentWorkbookId
                ? String(hw.studentWorkbookId)
                : undefined,
            student_book_id: hw.studentBookId
              ? String(hw.studentBookId)
              : undefined,
            student_homework_id: hw.studentHomeworkId
              ? String(hw.studentHomeworkId)
              : undefined,
            progress_id_list: hw.progressIdList,
            worksheet_problem_ids: worksheetProblemIds,
            total_problems: totalProblems,
            title: hw.title || "숙제",
            page: hw.page,
            completed: hw.completed,
            score: hw.score,
          };

          await upsertHomework(dbHomework);
          classResult.homeworkCount++;
        }
      }

      if (apiResult.errors.length > 0) {
        result.errors.push(...apiResult.errors);
      }

      console.log(
        `[숙제수집] ${classInfo.name} 완료: 학생 ${classResult.studentCount}명, 숙제 ${classResult.homeworkCount}개`
      );
    } catch (error) {
      classResult.error = String(error);
      result.errors.push(`${classInfo.name}: ${error}`);
      console.error(`[숙제수집] ${classInfo.name} 실패:`, error);
    }

    result.processedClasses.push(classResult);
    result.totalHomeworkCount += classResult.homeworkCount;
  }
}

async function collectHomework(options: {
  collectionType: "first";
  targetDate: Date;
  classIds?: string[];
  homeworkDate?: Date;
}): Promise<HomeworkCollectionResult> {
  const startedAt = new Date();
  const targetDateStr = formatDateKST(options.targetDate);
  const homeworkDateStr = options.homeworkDate
    ? formatDateKST(options.homeworkDate)
    : targetDateStr;

  const result: HomeworkCollectionResult = {
    success: true,
    collectionType: options.collectionType,
    targetDate: targetDateStr,
    processedClasses: [],
    totalHomeworkCount: 0,
    totalProblemCount: 0,
    errors: [],
    startedAt: startedAt.toISOString(),
    completedAt: "",
    durationMs: 0,
  };

  try {
    let targetClasses: TargetClassInfo[];

    if (options.classIds && options.classIds.length > 0) {
      targetClasses = await getClassesByMathflatIds(options.classIds);
    } else {
      targetClasses = await getTodayClasses(options.targetDate);
    }

    if (targetClasses.length === 0) {
      result.errors.push("오늘 수업이 있는 대상 반이 없습니다");
      result.completedAt = new Date().toISOString();
      result.durationMs = Date.now() - startedAt.getTime();
      return result;
    }

    console.log(
      `[HomeworkCollector] 대상 반 ${targetClasses.length}개: ${targetClasses.map((c) => c.name).join(", ")}`
    );
    if (homeworkDateStr !== targetDateStr) {
      console.log(
        `[HomeworkCollector] 숙제 날짜 오버라이드: ${targetDateStr} → ${homeworkDateStr}`
      );
    }

    const apiClient = new MathFlatApiClient();
    await apiClient.login();

    await collectHomeworkData(
      targetClasses,
      targetDateStr,
      homeworkDateStr,
      apiClient,
      result
    );
  } catch (error) {
    result.success = false;
    result.errors.push(`전체 수집 실패: ${error}`);
    console.error("[HomeworkCollector] 전체 실패:", error);
  }

  result.completedAt = new Date().toISOString();
  result.durationMs = Date.now() - startedAt.getTime();

  console.log(
    `[HomeworkCollector] 수집 완료: ${result.totalHomeworkCount}개 숙제 (${result.durationMs}ms)`
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
    collectionType?: string;
    classIds?: string[];
    targetDate?: string;
    homeworkDate?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { collectionType, classIds, targetDate, homeworkDate } = body;

  if (!collectionType) {
    return new Response(
      JSON.stringify({ error: "collectionType이 필요합니다" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  let parsedDate: Date;
  if (targetDate) {
    parsedDate = new Date(targetDate + "T00:00:00+09:00");
  } else {
    parsedDate = new Date();
  }

  let parsedHomeworkDate: Date | undefined;
  if (homeworkDate) {
    parsedHomeworkDate = new Date(homeworkDate + "T00:00:00+09:00");
  }

  console.log(
    `[EdgeFunction] MathFlat 숙제 수집 시작, 수집 날짜: ${targetDate || "오늘"}`
  );
  if (classIds && classIds.length > 0) {
    console.log(`[EdgeFunction] 대상 반 제한: ${classIds.join(", ")}`);
  }

  try {
    const result = await collectHomework({
      collectionType: "first",
      targetDate: parsedDate,
      classIds,
      homeworkDate: parsedHomeworkDate,
    });

    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.success ? "숙제 수집 완료" : "숙제 수집 실패",
        data: {
          targetDate: result.targetDate,
          processedClasses: result.processedClasses.map((c) => ({
            className: c.className,
            studentCount: c.studentCount,
            homeworkCount: c.homeworkCount,
            error: c.error,
          })),
          totalHomeworkCount: result.totalHomeworkCount,
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
