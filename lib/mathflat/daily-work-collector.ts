/**
 * MathFlat 일일 풀이 수집 로직 (n8n 대체)
 *
 * 매일 밤 실행:
 *   - 모든 ACTIVE 학생의 당일 풀이 수집
 *   - mathflat_daily_work 테이블에 저장
 *   - mathflat_homework와 매칭하여 숙제 여부 표시
 */

import { createClient } from '@supabase/supabase-js';
import { getMathFlatApiClient } from './api-client';
import type {
  DailyWorkCollectionOptions,
  DailyWorkCollectionResult,
  DBMathflatDailyWork,
  DBMathflatProblemResult,
  MathFlatWorkItem,
  MathFlatWorkbookProblem,
  MathFlatWorksheetProblem,
} from './types';

// Rate limiting delays (ms)
const DELAY_BETWEEN_PROBLEMS = 300;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * KST 날짜를 YYYY-MM-DD 형식으로 변환
 */
function formatDateKST(date: Date): string {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(date.getTime() + kstOffset);
  return kstDate.toISOString().split('T')[0];
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
 * MathFlat type을 category로 변환
 */
function getCategory(type: string): 'CHALLENGE' | 'CHALLENGE_WRONG' | 'CUSTOM' {
  if (type === 'CHALLENGE') return 'CHALLENGE';
  if (type === 'SUPPLEMENTARY_WRONG_CHALLENGE') return 'CHALLENGE_WRONG';
  return 'CUSTOM';
}

/**
 * 정답률 계산
 */
function calcCorrectRate(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * MathFlatWorkItem을 DB 레코드로 변환
 */
function convertToDBRecord(
  studentId: string,
  studentName: string,
  workDate: string,
  item: MathFlatWorkItem,
  component: MathFlatWorkItem['components'][0]
): DBMathflatDailyWork {
  return {
    mathflat_student_id: studentId,
    student_name: studentName,
    work_date: workDate,
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
    correct_rate: calcCorrectRate(component.correctCount || 0, component.assignedCount || 0),
    update_datetime: component.updateDatetime,
  };
}

/**
 * 일일 풀이 수집 메인 함수
 */
export async function collectDailyWork(
  options: DailyWorkCollectionOptions
): Promise<DailyWorkCollectionResult> {
  const startedAt = new Date().toISOString();
  const targetDate = formatDateKST(options.targetDate);
  const errors: string[] = [];

  console.log(`[DailyWorkCollector] 시작: ${targetDate}`);

  const result: DailyWorkCollectionResult = {
    success: false,
    targetDate,
    totalStudents: 0,
    totalWorkCount: 0,
    matchedHomeworkCount: 0,
    errors: [],
    startedAt,
    completedAt: '',
    durationMs: 0,
  };

  try {
    const apiClient = getMathFlatApiClient();
    const supabase = getSupabaseAdmin();

    // 1. MathFlat API로 전체 학생 풀이 수집
    const { works, errors: apiErrors } = await apiClient.collectAllDailyWork(
      targetDate,
      options.studentIds
    );
    errors.push(...apiErrors);

    // 2. DB 레코드로 변환
    const records: DBMathflatDailyWork[] = [];

    for (const work of works) {
      for (const item of work.items) {
        // 메인 아이템 처리
        for (const component of item.components || []) {
          // 푼 문제가 있는 경우만 저장
          if (component.assignedCount > 0) {
            records.push(convertToDBRecord(
              work.studentId,
              work.studentName,
              workDate(component.updateDatetime) || targetDate,
              item,
              component
            ));
          }
        }

        // selfLearnings (오답 챌린지 재풀이) 처리
        for (const selfLearning of item.selfLearnings || []) {
          for (const component of selfLearning.components || []) {
            if (component.assignedCount > 0) {
              records.push(convertToDBRecord(
                work.studentId,
                work.studentName,
                workDate(component.updateDatetime) || targetDate,
                selfLearning,
                component
              ));
            }
          }
        }
      }
    }

    console.log(`[DailyWorkCollector] ${records.length}개 레코드 변환 완료`);

    // 3. DB 저장 (upsert)
    if (records.length > 0) {
      const { error: upsertError } = await supabase
        .from('mathflat_daily_work')
        .upsert(records, {
          onConflict: 'mathflat_student_id,work_date,student_book_id',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        errors.push(`DB 저장 실패: ${upsertError.message}`);
      } else {
        console.log(`[DailyWorkCollector] ${records.length}개 레코드 저장 완료`);
      }
    }

    // 4. 숙제 매칭 (student_book_id로 매칭)
    const matchedCount = await matchHomework(supabase, targetDate);
    result.matchedHomeworkCount = matchedCount;

    // 5. 문제별 상세 수집 (optional - 시간이 오래 걸릴 수 있음)
    // 별도 크론잡으로 분리하거나, 특정 조건에서만 실행하도록 설정 가능
    if (options.collectProblemDetails !== false) {
      console.log(`[DailyWorkCollector] 문제별 상세 수집 시작...`);
      const problemCount = await collectProblemDetails(supabase, apiClient, targetDate, errors);
      console.log(`[DailyWorkCollector] 문제별 상세 수집 완료: ${problemCount}개`);
    }

    result.success = errors.length === 0;
    result.totalStudents = works.length;
    result.totalWorkCount = records.length;

  } catch (error) {
    errors.push(`수집 중 오류: ${error}`);
  }

  result.errors = errors;
  result.completedAt = new Date().toISOString();
  result.durationMs = new Date(result.completedAt).getTime() - new Date(startedAt).getTime();

  console.log(`[DailyWorkCollector] 완료: ${result.totalWorkCount}건, ${result.durationMs}ms`);
  return result;
}

/**
 * updateDatetime에서 날짜 추출
 */
function workDate(datetime?: string): string | null {
  if (!datetime) return null;
  return datetime.split('T')[0];
}

/**
 * 숙제 매칭
 * mathflat_homework의 student_book_id와 매칭하여 is_homework, homework_id 업데이트
 */
async function matchHomework(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  targetDate: string
): Promise<number> {
  // 해당 날짜의 숙제 목록 조회
  const { data: homeworks, error: hwError } = await supabase
    .from('mathflat_homework')
    .select('id, student_book_id')
    .eq('homework_date', targetDate)
    .not('student_book_id', 'is', null);

  if (hwError || !homeworks || homeworks.length === 0) {
    console.log(`[DailyWorkCollector] ${targetDate} 숙제 없음 또는 조회 실패`);
    return 0;
  }

  // student_book_id → homework_id 매핑
  const homeworkMap = new Map<string, string>();
  for (const hw of homeworks) {
    if (hw.student_book_id) {
      homeworkMap.set(hw.student_book_id, hw.id);
    }
  }

  // 매칭되는 daily_work 업데이트
  let matchedCount = 0;
  for (const [studentBookId, homeworkId] of homeworkMap) {
    const { data, error } = await supabase
      .from('mathflat_daily_work')
      .update({ is_homework: true, homework_id: homeworkId })
      .eq('student_book_id', studentBookId)
      .eq('work_date', targetDate)
      .select('id');

    if (!error && data) {
      matchedCount += data.length;
    }
  }

  console.log(`[DailyWorkCollector] 숙제 매칭: ${matchedCount}건`);
  return matchedCount;
}

/**
 * 문제별 상세 수집
 * daily_work 레코드에 대해 문제별 상세를 수집하여 mathflat_problem_results에 저장
 */
async function collectProblemDetails(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  apiClient: ReturnType<typeof getMathFlatApiClient>,
  targetDate: string,
  errors: string[]
): Promise<number> {
  // 해당 날짜의 daily_work 레코드 조회 (문제 상세가 아직 없는 것만)
  const { data: dailyWorks, error: dwError } = await supabase
    .from('mathflat_daily_work')
    .select('id, mathflat_student_id, work_type, student_book_id, student_workbook_id, progress_id_list, homework_id')
    .eq('work_date', targetDate)
    .gt('assigned_count', 0);  // 푼 문제가 있는 것만

  if (dwError || !dailyWorks || dailyWorks.length === 0) {
    console.log(`[DailyWorkCollector] ${targetDate} 문제 상세 수집 대상 없음`);
    return 0;
  }

  // 이미 수집된 daily_work_id 조회 (중복 방지)
  const dailyWorkIds = dailyWorks.map(dw => dw.id);
  const { data: existingResults } = await supabase
    .from('mathflat_problem_results')
    .select('daily_work_id')
    .in('daily_work_id', dailyWorkIds);

  const existingDailyWorkIds = new Set(existingResults?.map(r => r.daily_work_id) || []);
  const newDailyWorks = dailyWorks.filter(dw => !existingDailyWorkIds.has(dw.id));

  if (newDailyWorks.length === 0) {
    console.log(`[DailyWorkCollector] 모든 문제 상세가 이미 수집됨`);
    return 0;
  }

  console.log(`[DailyWorkCollector] 문제 상세 수집 대상: ${newDailyWorks.length}건`);

  let totalProblemCount = 0;
  const allProblemResults: DBMathflatProblemResult[] = [];

  for (const dw of newDailyWorks) {
    try {
      let problems: (MathFlatWorkbookProblem | MathFlatWorksheetProblem)[] = [];

      if (dw.work_type === 'WORKBOOK' && dw.progress_id_list && dw.student_workbook_id && dw.student_book_id) {
        // WORKBOOK: 각 progressId마다 문제 조회
        for (const progressId of dw.progress_id_list) {
          await delay(DELAY_BETWEEN_PROBLEMS);
          try {
            const workbookProblems = await apiClient.getWorkbookProblems(
              dw.mathflat_student_id,
              dw.student_workbook_id,
              parseInt(dw.student_book_id, 10),
              progressId
            );
            problems.push(...workbookProblems);
          } catch (e) {
            errors.push(`Workbook 문제 조회 실패 (${dw.id}): ${e}`);
          }
        }
      } else if (dw.work_type === 'WORKSHEET' && dw.student_book_id) {
        // WORKSHEET: studentBookId로 문제 조회
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

      // DB 레코드로 변환
      for (const problem of problems) {
        const isWorkbook = 'workbookProblemId' in problem;
        allProblemResults.push({
          daily_work_id: dw.id,
          homework_id: dw.homework_id || undefined,
          problem_id: String(problem.problemId),
          workbook_problem_id: isWorkbook ? String((problem as MathFlatWorkbookProblem).workbookProblemId) : undefined,
          worksheet_problem_id: !isWorkbook ? String((problem as MathFlatWorksheetProblem).worksheetProblemId) : undefined,
          problem_title: problem.problemTitle,
          problem_number: problem.problemNumber,
          concept_id: problem.conceptId ? String(problem.conceptId) : undefined,
          concept_name: problem.conceptName,
          topic_id: problem.topicId ? String(problem.topicId) : undefined,
          sub_topic_id: problem.subTopicId ? String(problem.subTopicId) : undefined,
          level: problem.level,
          type: problem.type,
          tag_top: problem.tagTop,
          correct_answer: problem.correctAnswer,
          user_answer: problem.userAnswer,
          result: problem.result,
          total_used: problem.totalUsed,
          correct_times: problem.correctTimes,
          wrong_times: problem.wrongTimes,
          answer_rate: problem.answerRate,
          problem_image_url: problem.problemImageUrl,
          solution_image_url: problem.solutionImageUrl,
        });
      }

      totalProblemCount += problems.length;
    } catch (error) {
      errors.push(`문제 상세 수집 실패 (${dw.id}): ${error}`);
    }
  }

  // 배치 저장 (100개씩)
  if (allProblemResults.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < allProblemResults.length; i += batchSize) {
      const batch = allProblemResults.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('mathflat_problem_results')
        .insert(batch);

      if (insertError) {
        errors.push(`문제 결과 저장 실패 (batch ${i / batchSize + 1}): ${insertError.message}`);
      }
    }
    console.log(`[DailyWorkCollector] 문제 상세 ${allProblemResults.length}개 저장 완료`);
  }

  return totalProblemCount;
}
