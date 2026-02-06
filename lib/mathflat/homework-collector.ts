/**
 * MathFlat 숙제 수집 로직
 *
 * 크론잡 (밤 23:30):
 *   - 오늘 수업 있는 반의 숙제 목록 수집
 *   - WORKSHEET의 경우 추가 API 호출로 total_problems 저장
 */

import { createClient } from '@supabase/supabase-js';
import { getMathFlatApiClient } from './api-client';
import type {
  HomeworkCollectionOptions,
  HomeworkCollectionResult,
  ProcessedClassResult,
  TargetClassInfo,
  DBMathflatHomework,
} from './types';

// 요일 매핑 (한국어 -> 숫자)
const DAY_OF_WEEK_MAP: Record<string, number> = {
  '일': 0,
  '월': 1,
  '화': 2,
  '수': 3,
  '목': 4,
  '금': 5,
  '토': 6,
};

// 숫자 -> 한국어 요일
const DAY_NUMBER_TO_KR: Record<number, string> = {
  0: '일',
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
  6: '토',
};

/**
 * KST 날짜를 YYYY-MM-DD 형식으로 변환
 */
function formatDateKST(date: Date): string {
  // KST = UTC+9
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(date.getTime() + kstOffset);
  return kstDate.toISOString().split('T')[0];
}

/**
 * KST 기준 요일 반환 (0=일, 1=월, ..., 6=토)
 */
function getDayOfWeekKST(date: Date): number {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(date.getTime() + kstOffset);
  return kstDate.getUTCDay();
}

/**
 * Supabase Admin 클라이언트 생성
 */
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * mathflat_class_id로 반 정보 직접 조회 (수동 수집용)
 */
async function getClassesByMathflatIds(mathflatClassIds: string[]): Promise<TargetClassInfo[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('classes')
    .select('id, name, mathflat_class_id')
    .in('mathflat_class_id', mathflatClassIds)
    .eq('is_active', true);

  if (error) {
    throw new Error(`반 정보 조회 실패: ${error.message}`);
  }

  return (data || []).map(c => ({
    id: c.id,
    name: c.name,
    mathflatClassId: c.mathflat_class_id,
    dayOfWeek: '', // 수동 수집 시 요일 정보 불필요
  }));
}

/**
 * 오늘 수업이 있는 반 조회
 */
async function getTodayClasses(targetDate: Date): Promise<TargetClassInfo[]> {
  const supabase = getSupabaseAdmin();
  const dayOfWeek = getDayOfWeekKST(targetDate);
  const dayKr = DAY_NUMBER_TO_KR[dayOfWeek];

  const { data, error } = await supabase
    .from('class_schedules')
    .select(`
      class_id,
      day_of_week,
      classes!inner (
        id,
        name,
        mathflat_class_id,
        is_active
      )
    `)
    .eq('day_of_week', dayKr);

  if (error) {
    throw new Error(`수업 스케줄 조회 실패: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // 중복 제거 및 활성 반만 필터링
  const classMap = new Map<string, TargetClassInfo>();

  for (const schedule of data) {
    const classInfo = schedule.classes as unknown as {
      id: string;
      name: string;
      mathflat_class_id: string | null;
      is_active: boolean;
    };

    if (classInfo.is_active && classInfo.mathflat_class_id && !classMap.has(classInfo.id)) {
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

/**
 * 숙제 데이터 upsert
 */
async function upsertHomework(
  homework: DBMathflatHomework
): Promise<{ id: string; isNew: boolean }> {
  const supabase = getSupabaseAdmin();

  // 기존 레코드 확인 (student_homework_id 기준)
  const { data: existing } = await supabase
    .from('mathflat_homework')
    .select('id')
    .eq('mathflat_class_id', homework.mathflat_class_id)
    .eq('mathflat_student_id', homework.mathflat_student_id)
    .eq('homework_date', homework.homework_date)
    .eq('student_homework_id', homework.student_homework_id)
    .single();

  if (existing) {
    // 업데이트 데이터 구성
    const updateData: Record<string, unknown> = {
      completed: homework.completed,
      score: homework.score,
      title: homework.title,
      page: homework.page,
      progress_id_list: homework.progress_id_list,
    };

    // WORKSHEET의 경우 worksheet_problem_ids, total_problems 업데이트
    if (homework.worksheet_problem_ids !== undefined) {
      updateData.worksheet_problem_ids = homework.worksheet_problem_ids;
    }
    if (homework.total_problems !== undefined) {
      updateData.total_problems = homework.total_problems;
    }

    const { error } = await supabase
      .from('mathflat_homework')
      .update(updateData)
      .eq('id', existing.id);

    if (error) {
      throw new Error(`숙제 업데이트 실패: ${error.message}`);
    }

    return { id: existing.id, isNew: false };
  }

  // 새로 삽입
  const { data, error } = await supabase
    .from('mathflat_homework')
    .insert(homework)
    .select('id')
    .single();

  if (error) {
    throw new Error(`숙제 삽입 실패: ${error.message}`);
  }

  return { id: data.id, isNew: true };
}

/**
 * 숙제 수집 실행
 */
async function collectHomeworkData(
  targetClasses: TargetClassInfo[],
  targetDateStr: string,
  homeworkDateStr: string,  // DB에 저장할 숙제 날짜 (수업일 기준)
  apiClient: ReturnType<typeof getMathFlatApiClient>,
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
      console.log(`[숙제수집] ${classInfo.name} (${classInfo.mathflatClassId}) 시작`);

      const apiResult = await apiClient.collectClassHomework(
        classInfo.mathflatClassId,
        targetDateStr,
        false // 문제 상세 없이 목록만
      );

      classResult.studentCount = apiResult.students.length;

      // DB 저장
      for (const studentData of apiResult.students) {
        for (const homeworkData of studentData.homeworks) {
          const hw = homeworkData.homework;

          // WORKSHEET: 추가 API 호출로 문제 ID 배열 가져오기
          let worksheetProblemIds: number[] | undefined;
          let totalProblems: number | undefined;
          if (hw.bookType === 'WORKSHEET' && hw.studentBookId) {
            try {
              const problems = await apiClient.getWorksheetProblems(hw.studentBookId);
              worksheetProblemIds = problems.map(p => p.worksheetProblemId);
              totalProblems = problems.length;
              console.log(`[숙제수집] WORKSHEET ${hw.title} 문제 수: ${totalProblems}`);
            } catch (err) {
              console.error(`[숙제수집] WORKSHEET 문제 조회 실패: ${err}`);
            }
          }

          const dbHomework: DBMathflatHomework = {
            class_id: classInfo.id,
            mathflat_class_id: classInfo.mathflatClassId,
            mathflat_student_id: studentData.studentId ? String(studentData.studentId) : studentData.studentName,
            student_name: studentData.studentName,
            homework_date: homeworkDateStr,  // 수업일 기준 날짜 (수동 수집 시 오버라이드 가능)
            book_type: hw.bookType,
            book_id: hw.bookId ? String(hw.bookId) : (hw.studentWorkbookId ? String(hw.studentWorkbookId) : undefined),
            student_book_id: hw.studentBookId ? String(hw.studentBookId) : undefined,
            student_homework_id: hw.studentHomeworkId ? String(hw.studentHomeworkId) : undefined,
            progress_id_list: hw.progressIdList,
            worksheet_problem_ids: worksheetProblemIds,
            total_problems: totalProblems,
            title: hw.title || '숙제',
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

      console.log(`[숙제수집] ${classInfo.name} 완료: 학생 ${classResult.studentCount}명, 숙제 ${classResult.homeworkCount}개`);
    } catch (error) {
      classResult.error = String(error);
      result.errors.push(`${classInfo.name}: ${error}`);
      console.error(`[숙제수집] ${classInfo.name} 실패:`, error);
    }

    result.processedClasses.push(classResult);
    result.totalHomeworkCount += classResult.homeworkCount;
  }
}

/**
 * 숙제 수집 메인 함수
 */
export async function collectHomework(
  options: HomeworkCollectionOptions
): Promise<HomeworkCollectionResult> {
  const startedAt = new Date();
  const targetDateStr = formatDateKST(options.targetDate);
  // homeworkDate가 지정되면 해당 날짜로, 아니면 targetDate로 저장
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
    completedAt: '',
    durationMs: 0,
  };

  try {
    // 1. 대상 반 조회
    let targetClasses: TargetClassInfo[];

    // classIds가 주어지면 요일 체크 없이 직접 조회 (수동 수집용)
    if (options.classIds && options.classIds.length > 0) {
      targetClasses = await getClassesByMathflatIds(options.classIds);
    } else {
      // 기본: 오늘 수업 있는 반 조회
      targetClasses = await getTodayClasses(options.targetDate);
    }

    if (targetClasses.length === 0) {
      result.errors.push('오늘 수업이 있는 대상 반이 없습니다');
      result.completedAt = new Date().toISOString();
      result.durationMs = Date.now() - startedAt.getTime();
      return result;
    }

    console.log(`[HomeworkCollector] 대상 반 ${targetClasses.length}개: ${targetClasses.map(c => c.name).join(', ')}`);
    if (homeworkDateStr !== targetDateStr) {
      console.log(`[HomeworkCollector] 숙제 날짜 오버라이드: ${targetDateStr} → ${homeworkDateStr}`);
    }

    // 2. MathFlat API 클라이언트 초기화
    const apiClient = getMathFlatApiClient();
    await apiClient.login();

    // 3. 숙제 수집 실행
    await collectHomeworkData(targetClasses, targetDateStr, homeworkDateStr, apiClient, result);

  } catch (error) {
    result.success = false;
    result.errors.push(`전체 수집 실패: ${error}`);
    console.error('[HomeworkCollector] 전체 실패:', error);
  }

  result.completedAt = new Date().toISOString();
  result.durationMs = Date.now() - startedAt.getTime();

  console.log(
    `[HomeworkCollector] 수집 완료: ${result.totalHomeworkCount}개 숙제 (${result.durationMs}ms)`
  );

  return result;
}
