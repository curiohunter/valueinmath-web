/**
 * MathFlat 숙제 수집 로직
 *
 * 1차 수집 (밤 23:50):
 *   - 오늘 수업 있는 반의 숙제 목록 수집
 *   - 문제 상세 없이 목록만 저장
 *
 * 2차 수집 (아침 10:00):
 *   - 오늘 수업 있는 반의 "이전 수업일" 숙제 업데이트
 *   - 문제 상세(채점 결과) 포함
 *   - 예: 월/금 반 → 금요일 아침에 월요일 숙제 업데이트
 */

import { createClient } from '@supabase/supabase-js';
import { getMathFlatApiClient } from './api-client';
import type {
  HomeworkCollectionOptions,
  HomeworkCollectionResult,
  ProcessedClassResult,
  TargetClassInfo,
  DBMathflatHomework,
  DBMathflatProblemResult,
  MathFlatWorkbookProblem,
  MathFlatWorksheetProblem,
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
 * 특정 반의 이전 수업일 계산
 * 예: 월/금 반, 오늘 금요일 → 이전 수업일은 월요일
 */
async function getPreviousClassDate(classId: string, todayDate: Date): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  // 해당 반의 수업 요일 목록 조회
  const { data: schedules, error } = await supabase
    .from('class_schedules')
    .select('day_of_week')
    .eq('class_id', classId);

  if (error || !schedules || schedules.length === 0) {
    return null;
  }

  // 수업 요일을 숫자로 변환하고 정렬
  const classDays = schedules
    .map(s => DAY_OF_WEEK_MAP[s.day_of_week])
    .filter(d => d !== undefined)
    .sort((a, b) => a - b);

  if (classDays.length === 0) {
    return null;
  }

  const todayDayOfWeek = getDayOfWeekKST(todayDate);

  // 오늘 이전의 가장 가까운 수업일 찾기
  let prevDay: number | null = null;
  let daysBack = 0;

  for (let i = classDays.length - 1; i >= 0; i--) {
    if (classDays[i] < todayDayOfWeek) {
      prevDay = classDays[i];
      daysBack = todayDayOfWeek - prevDay;
      break;
    }
  }

  // 이번 주에 이전 수업일이 없으면 지난 주에서 찾기
  if (prevDay === null) {
    prevDay = classDays[classDays.length - 1]; // 가장 큰 요일 (예: 금요일)
    daysBack = 7 - prevDay + todayDayOfWeek;
  }

  // 이전 수업일 날짜 계산
  const kstOffset = 9 * 60 * 60 * 1000;
  const todayKST = new Date(todayDate.getTime() + kstOffset);
  const prevDate = new Date(todayKST.getTime() - daysBack * 24 * 60 * 60 * 1000);

  return prevDate.toISOString().split('T')[0];
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
    // 업데이트
    const { error } = await supabase
      .from('mathflat_homework')
      .update({
        completed: homework.completed,
        score: homework.score,
        title: homework.title,
        page: homework.page,
      })
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
 * concept_id로 concept_name 조회 (캐시 사용)
 */
const conceptNameCache = new Map<string, string>();

async function getConceptNames(conceptIds: string[]): Promise<Map<string, string>> {
  if (conceptIds.length === 0) return new Map();

  const supabase = getSupabaseAdmin();

  // 캐시에 없는 ID만 조회
  const uncachedIds = conceptIds.filter(id => !conceptNameCache.has(id));

  if (uncachedIds.length > 0) {
    const { data } = await supabase
      .from('mathflat_concepts')
      .select('concept_id, concept_name')
      .in('concept_id', uncachedIds.map(id => parseInt(id, 10)));

    if (data) {
      data.forEach((row: { concept_id: number; concept_name: string }) => {
        conceptNameCache.set(String(row.concept_id), row.concept_name);
      });
    }
  }

  // 요청한 ID들의 이름 반환
  const result = new Map<string, string>();
  conceptIds.forEach(id => {
    const name = conceptNameCache.get(id);
    if (name) result.set(id, name);
  });

  return result;
}

/**
 * 문제 결과 upsert (bulk)
 */
async function upsertProblemResults(
  homeworkId: string,
  problems: Array<MathFlatWorkbookProblem | MathFlatWorksheetProblem>,
  bookType: 'WORKBOOK' | 'WORKSHEET'
): Promise<number> {
  if (problems.length === 0) return 0;

  const supabase = getSupabaseAdmin();

  // 기존 문제 삭제 (전체 교체 방식)
  await supabase
    .from('mathflat_problem_results')
    .delete()
    .eq('homework_id', homeworkId);

  // concept_name이 없는 문제들의 concept_id 수집
  const conceptIdsToLookup = problems
    .filter(p => p.conceptId && !p.conceptName)
    .map(p => String(p.conceptId));

  // concept_id로 concept_name 조회
  const conceptNameMap = await getConceptNames([...new Set(conceptIdsToLookup)]);

  // 새로운 문제 결과 삽입
  const problemRecords: DBMathflatProblemResult[] = problems.map((p) => {
    const isWorkbook = bookType === 'WORKBOOK';
    const workbookProblem = p as MathFlatWorkbookProblem;
    const worksheetProblem = p as MathFlatWorksheetProblem;

    // concept_name이 없으면 조회한 값 사용
    const conceptName = p.conceptName ||
      (p.conceptId ? conceptNameMap.get(String(p.conceptId)) : undefined);

    return {
      homework_id: homeworkId,
      problem_id: String(p.problemId),
      workbook_problem_id: isWorkbook ? String(workbookProblem.workbookProblemId) : undefined,
      worksheet_problem_id: !isWorkbook ? String(worksheetProblem.worksheetProblemId) : undefined,
      problem_title: p.problemTitle,
      problem_number: p.problemNumber,
      concept_id: p.conceptId ? String(p.conceptId) : undefined,
      concept_name: conceptName,
      topic_id: p.topicId ? String(p.topicId) : undefined,
      sub_topic_id: p.subTopicId ? String(p.subTopicId) : undefined,
      level: p.level,
      type: p.type,
      tag_top: p.tagTop,
      correct_answer: p.correctAnswer,
      user_answer: p.userAnswer,
      result: p.result,
      total_used: p.totalUsed,
      correct_times: p.correctTimes,
      wrong_times: p.wrongTimes,
      answer_rate: p.answerRate,
      problem_image_url: p.problemImageUrl,
      solution_image_url: p.solutionImageUrl,
    };
  });

  const { error } = await supabase
    .from('mathflat_problem_results')
    .insert(problemRecords);

  if (error) {
    throw new Error(`문제 결과 삽입 실패: ${error.message}`);
  }

  return problems.length;
}

/**
 * 1차 수집: 오늘 숙제 목록 수집
 */
async function collectFirstPass(
  targetClasses: TargetClassInfo[],
  targetDateStr: string,
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
      console.log(`[1차수집] ${classInfo.name} (${classInfo.mathflatClassId}) 시작`);

      const apiResult = await apiClient.collectClassHomework(
        classInfo.mathflatClassId,
        targetDateStr,
        false // 문제 상세 없이 목록만
      );

      classResult.studentCount = apiResult.students.length;

      // DB 저장 (숙제 목록만)
      for (const studentData of apiResult.students) {
        for (const homeworkData of studentData.homeworks) {
          const hw = homeworkData.homework;

          const dbHomework: DBMathflatHomework = {
            class_id: classInfo.id,
            mathflat_class_id: classInfo.mathflatClassId,
            mathflat_student_id: studentData.studentId ? String(studentData.studentId) : studentData.studentName,
            student_name: studentData.studentName,
            homework_date: targetDateStr,
            book_type: hw.bookType,
            book_id: hw.bookId ? String(hw.bookId) : (hw.studentWorkbookId ? String(hw.studentWorkbookId) : undefined),
            student_book_id: hw.studentBookId ? String(hw.studentBookId) : undefined,
            student_homework_id: hw.studentHomeworkId ? String(hw.studentHomeworkId) : undefined,
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

      console.log(`[1차수집] ${classInfo.name} 완료: 학생 ${classResult.studentCount}명, 숙제 ${classResult.homeworkCount}개`);
    } catch (error) {
      classResult.error = String(error);
      result.errors.push(`${classInfo.name}: ${error}`);
      console.error(`[1차수집] ${classInfo.name} 실패:`, error);
    }

    result.processedClasses.push(classResult);
    result.totalHomeworkCount += classResult.homeworkCount;
  }
}

/**
 * 2차 수집: 오늘 숙제 업데이트 (문제 상세 포함)
 */
async function collectSecondPass(
  targetClasses: TargetClassInfo[],
  targetDateStr: string,
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
      console.log(`[2차수집] ${classInfo.name} (${classInfo.mathflatClassId}) 시작 - 날짜: ${targetDateStr}`);

      // 숙제 조회 및 문제 상세 수집
      const apiResult = await apiClient.collectClassHomework(
        classInfo.mathflatClassId,
        targetDateStr,
        true // 문제 상세 포함
      );

      classResult.studentCount = apiResult.students.length;

      // DB 업데이트 (숙제 + 문제 상세)
      for (const studentData of apiResult.students) {
        for (const homeworkData of studentData.homeworks) {
          const hw = homeworkData.homework;

          const dbHomework: DBMathflatHomework = {
            class_id: classInfo.id,
            mathflat_class_id: classInfo.mathflatClassId,
            mathflat_student_id: studentData.studentId ? String(studentData.studentId) : studentData.studentName,
            student_name: studentData.studentName,
            homework_date: targetDateStr,
            book_type: hw.bookType,
            book_id: hw.bookId ? String(hw.bookId) : (hw.studentWorkbookId ? String(hw.studentWorkbookId) : undefined),
            student_book_id: hw.studentBookId ? String(hw.studentBookId) : undefined,
            student_homework_id: hw.studentHomeworkId ? String(hw.studentHomeworkId) : undefined,
            title: hw.title || '숙제',
            page: hw.page,
            completed: hw.completed,
            score: hw.score,
          };

          const { id: homeworkId } = await upsertHomework(dbHomework);
          classResult.homeworkCount++;

          // 문제 결과 저장
          if (homeworkData.problems.length > 0) {
            const problemCount = await upsertProblemResults(
              homeworkId,
              homeworkData.problems,
              hw.bookType
            );
            classResult.problemCount += problemCount;
          }
        }
      }

      if (apiResult.errors.length > 0) {
        result.errors.push(...apiResult.errors);
      }

      console.log(
        `[2차수집] ${classInfo.name} 완료 (${targetDateStr}): 학생 ${classResult.studentCount}명, 숙제 ${classResult.homeworkCount}개, 문제 ${classResult.problemCount}개`
      );
    } catch (error) {
      classResult.error = String(error);
      result.errors.push(`${classInfo.name}: ${error}`);
      console.error(`[2차수집] ${classInfo.name} 실패:`, error);
    }

    result.processedClasses.push(classResult);
    result.totalHomeworkCount += classResult.homeworkCount;
    result.totalProblemCount += classResult.problemCount;
  }
}

/**
 * 3차 수집: 이전 수업일 숙제 업데이트 (문제 상세 포함)
 * 예: 월/금 반, 오늘 금요일 → 월요일 숙제 상세 업데이트
 */
async function collectThirdPass(
  targetClasses: TargetClassInfo[],
  targetDate: Date,
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
      // 이전 수업일 계산
      const previousDate = await getPreviousClassDate(classInfo.id, targetDate);

      if (!previousDate) {
        console.log(`[3차수집] ${classInfo.name}: 이전 수업일을 찾을 수 없음 (스킵)`);
        classResult.error = '이전 수업일을 찾을 수 없음';
        result.processedClasses.push(classResult);
        continue;
      }

      classResult.previousClassDate = previousDate;
      console.log(`[3차수집] ${classInfo.name} (${classInfo.mathflatClassId}) 시작 - 이전 수업일: ${previousDate}`);

      // 이전 수업일 숙제 조회 및 문제 상세 수집
      const apiResult = await apiClient.collectClassHomework(
        classInfo.mathflatClassId,
        previousDate,
        true // 문제 상세 포함
      );

      classResult.studentCount = apiResult.students.length;

      // DB 업데이트 (숙제 + 문제 상세)
      for (const studentData of apiResult.students) {
        for (const homeworkData of studentData.homeworks) {
          const hw = homeworkData.homework;

          const dbHomework: DBMathflatHomework = {
            class_id: classInfo.id,
            mathflat_class_id: classInfo.mathflatClassId,
            mathflat_student_id: studentData.studentId ? String(studentData.studentId) : studentData.studentName,
            student_name: studentData.studentName,
            homework_date: previousDate,
            book_type: hw.bookType,
            book_id: hw.bookId ? String(hw.bookId) : (hw.studentWorkbookId ? String(hw.studentWorkbookId) : undefined),
            student_book_id: hw.studentBookId ? String(hw.studentBookId) : undefined,
            student_homework_id: hw.studentHomeworkId ? String(hw.studentHomeworkId) : undefined,
            title: hw.title || '숙제',
            page: hw.page,
            completed: hw.completed,
            score: hw.score,
          };

          const { id: homeworkId } = await upsertHomework(dbHomework);
          classResult.homeworkCount++;

          // 문제 결과 저장
          if (homeworkData.problems.length > 0) {
            const problemCount = await upsertProblemResults(
              homeworkId,
              homeworkData.problems,
              hw.bookType
            );
            classResult.problemCount += problemCount;
          }
        }
      }

      if (apiResult.errors.length > 0) {
        result.errors.push(...apiResult.errors);
      }

      console.log(
        `[3차수집] ${classInfo.name} 완료 (${previousDate}): 학생 ${classResult.studentCount}명, 숙제 ${classResult.homeworkCount}개, 문제 ${classResult.problemCount}개`
      );
    } catch (error) {
      classResult.error = String(error);
      result.errors.push(`${classInfo.name}: ${error}`);
      console.error(`[3차수집] ${classInfo.name} 실패:`, error);
    }

    result.processedClasses.push(classResult);
    result.totalHomeworkCount += classResult.homeworkCount;
    result.totalProblemCount += classResult.problemCount;
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

    // 2. MathFlat API 클라이언트 초기화
    const apiClient = getMathFlatApiClient();
    await apiClient.login();

    // 3. 수집 타입에 따라 분기
    if (options.collectionType === 'first') {
      // 1차 수집: 오늘 숙제 목록 수집
      await collectFirstPass(targetClasses, targetDateStr, apiClient, result);
    } else if (options.collectionType === 'second') {
      // 2차 수집: 오늘 숙제 업데이트 (문제 상세 포함)
      await collectSecondPass(targetClasses, targetDateStr, apiClient, result);
    } else {
      // 3차 수집: 이전 수업일 숙제 업데이트 (문제 상세 포함)
      await collectThirdPass(targetClasses, options.targetDate, apiClient, result);
    }
  } catch (error) {
    result.success = false;
    result.errors.push(`전체 수집 실패: ${error}`);
    console.error('[HomeworkCollector] 전체 실패:', error);
  }

  result.completedAt = new Date().toISOString();
  result.durationMs = Date.now() - startedAt.getTime();

  console.log(
    `[HomeworkCollector] 수집 완료: ${result.totalHomeworkCount}개 숙제, ${result.totalProblemCount}개 문제 (${result.durationMs}ms)`
  );

  return result;
}
