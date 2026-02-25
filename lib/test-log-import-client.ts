import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  TestLogInsertData,
  WorksheetItem,
  KmmResult,
  SourceType,
} from "@/types/test-log-import";

const supabase = getSupabaseBrowserClient();

/**
 * mathflat_student_id 목록으로 학생 정보 조회
 * students.mathflat_student_id → students + class_students 조인
 */
export async function resolveStudentsByMathflatIds(
  mathflatIds: string[]
): Promise<
  Map<
    string,
    {
      studentId: string;
      studentName: string;
      classes: Array<{ classId: string; className: string }>;
    }
  >
> {
  if (mathflatIds.length === 0) return new Map();

  const { data: studentsData } = await supabase
    .from("students")
    .select("id, name, mathflat_student_id")
    .in("mathflat_student_id", mathflatIds)
    .eq("is_active", true);

  if (!studentsData || studentsData.length === 0) return new Map();

  const studentIds = studentsData.map((s) => s.id);
  const { data: classStudentsData } = await supabase
    .from("class_students")
    .select("student_id, class_id")
    .in("student_id", studentIds);

  const classIds = [
    ...new Set((classStudentsData || []).map((cs) => cs.class_id)),
  ];
  const { data: classesData } = await supabase
    .from("classes")
    .select("id, name")
    .in("id", classIds)
    .eq("is_active", true);

  const classMap = new Map(
    (classesData || []).map((c) => [c.id, c.name])
  );

  const result = new Map<
    string,
    {
      studentId: string;
      studentName: string;
      classes: Array<{ classId: string; className: string }>;
    }
  >();

  for (const student of studentsData) {
    const studentClasses = (classStudentsData || [])
      .filter((cs) => cs.student_id === student.id)
      .map((cs) => ({
        classId: cs.class_id,
        className: classMap.get(cs.class_id) || "",
      }))
      .filter((c) => c.className);

    result.set(student.mathflat_student_id!, {
      studentId: student.id,
      studentName: student.name,
      classes: studentClasses,
    });
  }

  return result;
}

/**
 * 특정 반의 학생들의 mathflat_student_id 목록 조회
 */
export async function getMathflatIdsForClass(
  classId: string
): Promise<Array<{ studentId: string; studentName: string; mathflatStudentId: string }>> {
  const { data: classStudentsData } = await supabase
    .from("class_students")
    .select("student_id")
    .eq("class_id", classId);

  if (!classStudentsData || classStudentsData.length === 0) return [];

  const studentIds = classStudentsData.map((cs) => cs.student_id);
  const { data: studentsData } = await supabase
    .from("students")
    .select("id, name, mathflat_student_id")
    .in("id", studentIds)
    .eq("is_active", true)
    .not("mathflat_student_id", "is", null);

  return (studentsData || []).map((s) => ({
    studentId: s.id,
    studentName: s.name,
    mathflatStudentId: s.mathflat_student_id!,
  }));
}

/**
 * 이미 등록된 source_id 목록 조회 (중복 방지)
 */
export async function checkDuplicates(
  sourceType: Exclude<SourceType, "manual">,
  sourceIds: string[]
): Promise<Set<string>> {
  if (sourceIds.length === 0) return new Set();

  const { data } = await supabase
    .from("test_logs")
    .select("source_id")
    .eq("source_type", sourceType)
    .in("source_id", sourceIds);

  return new Set((data || []).map((d) => d.source_id).filter(Boolean));
}

/**
 * CUSTOM WORKSHEET 데이터 조회
 */
export async function fetchWorksheetData(
  mathflatStudentIds: string[],
  startDate: string,
  endDate: string
): Promise<WorksheetItem[]> {
  if (mathflatStudentIds.length === 0) return [];

  const { data } = await supabase
    .from("mathflat_daily_work")
    .select("*")
    .in("mathflat_student_id", mathflatStudentIds)
    .eq("work_type", "WORKSHEET")
    .eq("category", "CUSTOM")
    .gte("work_date", startDate)
    .lte("work_date", endDate)
    .order("work_date", { ascending: false });

  if (!data) return [];

  // 학생 매칭을 위한 맵 생성
  const studentMap = await resolveStudentsByMathflatIds(
    [...new Set(data.map((d) => d.mathflat_student_id))]
  );

  // source_id 중복 체크
  const sourceIds = data.map((d) => d.id);
  const importedIds = await checkDuplicates("mathflat_worksheet", sourceIds);

  return data.map((d) => {
    const studentInfo = studentMap.get(d.mathflat_student_id);
    return {
      id: d.id,
      mathflatStudentId: d.mathflat_student_id,
      studentId: studentInfo?.studentId || "",
      studentName: studentInfo?.studentName || d.student_name,
      classId: studentInfo?.classes[0]?.classId || "",
      className: studentInfo?.classes[0]?.className || "",
      title: d.title || "",
      subtitle: d.subtitle,
      workDate: d.work_date,
      assignedCount: d.assigned_count || 0,
      correctCount: d.correct_count || 0,
      wrongCount: d.wrong_count || 0,
      correctRate: d.correct_rate || 0,
      alreadyImported: importedIds.has(d.id),
    };
  });
}

/**
 * KMM 경시대회 결과 조회
 */
export async function fetchKmmResults(
  yearMonth: string
): Promise<KmmResult[]> {
  const { data } = await supabase
    .from("mathflat_kmm_results")
    .select("*")
    .eq("year_month", yearMonth)
    .not("status", "eq", "INCOMPLETE")
    .not("score", "is", null)
    .order("student_name", { ascending: true });

  if (!data) return [];

  const mathflatIds = [...new Set(data.map((d) => d.mathflat_student_id))];
  const studentMap = await resolveStudentsByMathflatIds(mathflatIds);

  const sourceIds = data.map((d) => d.id);
  const importedIds = await checkDuplicates("kmm", sourceIds);

  return data.map((d) => {
    const studentInfo = studentMap.get(d.mathflat_student_id);
    return {
      id: d.id,
      yearMonth: d.year_month,
      mathflatStudentId: d.mathflat_student_id,
      studentId: studentInfo?.studentId || null,
      studentName: studentInfo?.studentName || d.student_name,
      schoolType: d.school_type,
      grade: d.grade,
      score: d.score,
      correctCount: d.correct_count || 0,
      wrongCount: d.wrong_count || 0,
      status: d.status || "",
      tier: d.tier,
      alreadyImported: importedIds.has(d.id),
    };
  });
}

/**
 * test_logs 일괄 삽입 (사전 중복 체크 후 insert)
 */
export async function importTestLogs(
  logs: TestLogInsertData[]
): Promise<{ inserted: number; duplicates: number; error: string | null }> {
  if (logs.length === 0) {
    return { inserted: 0, duplicates: 0, error: null };
  }

  // 사전 중복 체크: source_type별로 그룹화하여 이미 등록된 source_id 필터링
  const nonManualLogs = logs.filter(l => l.source_type !== 'manual' && l.source_id);
  const sourceTypeGroups = new Map<string, string[]>();
  for (const log of nonManualLogs) {
    const key = log.source_type;
    if (!sourceTypeGroups.has(key)) sourceTypeGroups.set(key, []);
    sourceTypeGroups.get(key)!.push(log.source_id!);
  }

  const alreadyImported = new Set<string>();
  for (const [sourceType, sourceIds] of sourceTypeGroups) {
    const imported = await checkDuplicates(
      sourceType as Exclude<SourceType, "manual">,
      sourceIds
    );
    for (const id of imported) {
      alreadyImported.add(`${sourceType}:${id}`);
    }
  }

  // 중복 제거
  const newLogs = logs.filter(l => {
    if (l.source_type === 'manual' || !l.source_id) return true;
    return !alreadyImported.has(`${l.source_type}:${l.source_id}`);
  });

  const duplicates = logs.length - newLogs.length;

  if (newLogs.length === 0) {
    return { inserted: 0, duplicates, error: null };
  }

  // @ts-ignore
  const { data, error } = await supabase
    .from("test_logs")
    .insert(newLogs)
    .select("id");

  if (error) {
    return { inserted: 0, duplicates, error: error.message };
  }

  return { inserted: data?.length || 0, duplicates, error: null };
}

/**
 * 현재 로그인 직원 ID 조회
 */
export async function getCurrentEmployeeId(
  authUserId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("employees")
    .select("id")
    .eq("auth_id", authUserId)
    .single();

  return data?.id || null;
}

/**
 * 학교 시험지 목록 조회 (school-exam-client 패턴 재사용)
 */
export async function fetchSchoolExams(filters?: {
  schoolType?: string;
  grade?: number;
  semester?: number;
  examType?: string;
  examYear?: number;
  schoolName?: string;
}) {
  let query = supabase
    .from("school_exams")
    .select("*")
    .order("exam_year", { ascending: false })
    .order("school_name", { ascending: true });

  if (filters?.schoolType) query = query.eq("school_type", filters.schoolType);
  if (filters?.grade) query = query.eq("grade", filters.grade);
  if (filters?.semester) query = query.eq("semester", filters.semester);
  if (filters?.examType) query = query.eq("exam_type", filters.examType);
  if (filters?.examYear) query = query.eq("exam_year", filters.examYear);
  if (filters?.schoolName) query = query.ilike("school_name", `%${filters.schoolName}%`);

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * 반 학생 목록 조회 (재원생만)
 */
export async function getClassStudentsForImport(
  classId: string
): Promise<Array<{ id: string; name: string }>> {
  const { data: csData } = await supabase
    .from("class_students")
    .select("student_id")
    .eq("class_id", classId);

  if (!csData || csData.length === 0) return [];

  const { data: studentsData } = await supabase
    .from("students")
    .select("id, name, status")
    .in("id", csData.map((cs) => cs.student_id))
    .eq("is_active", true);

  return (studentsData || [])
    .filter((s) => s.status?.includes("재원"))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .map((s) => ({ id: s.id, name: s.name }));
}
