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

    // 4. 숙제 매칭은 DB 트리거가 자동 처리 (match_homework_trigger)

    // 5. 오답 상세 수집 (시간 기반 동적 배치, 최대 4분)
    if (options.collectProblemDetails !== false) {
      const maxDurationMs = options.maxDurationMs || 4 * 60 * 1000;  // 기본 4분
      console.log(`[DailyWorkCollector] 오답 상세 수집 시작 (최대 ${maxDurationMs / 1000}초)...`);
      const { totalWrongCollected, remainingDailyWorks, batchesProcessed } = await collectProblemDetails(
        supabase,
        apiClient,
        targetDate,
        errors,
        maxDurationMs
      );
      result.totalProblemCount = totalWrongCollected;
      result.remainingDailyWorks = remainingDailyWorks;
      result.batchesProcessed = batchesProcessed;
      console.log(`[DailyWorkCollector] 오답 수집 완료: ${batchesProcessed}배치, ${totalWrongCollected}개, 남은 작업: ${remainingDailyWorks}건`);
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

// 숙제 매칭은 DB 트리거(match_homework_trigger)가 자동 처리

/**
 * 오답 문제 상세 수집 (시간 기반 동적 배치 처리)
 * 타임아웃(4분) 전까지 계속 배치 처리, 시간 초과 시 중단
 *
 * @param maxDurationMs 최대 실행 시간 (기본: 4분 = 240000ms)
 */
async function collectProblemDetails(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  apiClient: ReturnType<typeof getMathFlatApiClient>,
  targetDate: string,
  errors: string[],
  maxDurationMs: number = 4 * 60 * 1000  // 4분
): Promise<{ totalWrongCollected: number; remainingDailyWorks: number; batchesProcessed: number }> {
  const startTime = Date.now();
  let totalWrongCollected = 0;
  let remainingDailyWorks = 0;
  let batchesProcessed = 0;
  const processedDailyWorkIds = new Set<string>();

  console.log(`[DailyWorkCollector] 오답 수집 시작 (최대 ${maxDurationMs / 1000}초)`);

  // 시간이 남아있는 동안 계속 배치 처리
  while (true) {
    const elapsed = Date.now() - startTime;

    // 타임아웃 체크 (4분 초과 시 중단)
    if (elapsed > maxDurationMs) {
      console.log(`[DailyWorkCollector] 시간 초과 (${Math.round(elapsed / 1000)}초), 중단`);
      break;
    }

    // 해당 날짜의 미처리 daily_work 조회
    const { data: dailyWorks, error: dwError } = await supabase
      .from('mathflat_daily_work')
      .select('id, mathflat_student_id, student_name, work_type, student_book_id, student_workbook_id, progress_id_list, homework_id, wrong_count')
      .eq('work_date', targetDate)
      .gt('wrong_count', 0)
      .order('wrong_count', { ascending: true });

    if (dwError || !dailyWorks || dailyWorks.length === 0) {
      console.log(`[DailyWorkCollector] 오답 수집 대상 없음`);
      break;
    }

    // 이미 수집된 daily_work_id 조회
    const dailyWorkIds = dailyWorks.map(dw => dw.id);
    const { data: existingResults } = await supabase
      .from('mathflat_problem_results')
      .select('daily_work_id')
      .in('daily_work_id', dailyWorkIds);

    const existingDailyWorkIds = new Set(existingResults?.map(r => r.daily_work_id) || []);

    // 이번 세션에서 처리한 것도 제외
    const newDailyWorks = dailyWorks.filter(
      dw => !existingDailyWorkIds.has(dw.id) && !processedDailyWorkIds.has(dw.id)
    );

    if (newDailyWorks.length === 0) {
      console.log(`[DailyWorkCollector] 모든 오답 수집 완료!`);
      remainingDailyWorks = 0;
      break;
    }

    // 이번 배치: 예상 오답 100개 이내로
    let estimatedWrongCount = 0;
    const batchDailyWorks: typeof newDailyWorks = [];

    for (const dw of newDailyWorks) {
      if (estimatedWrongCount + (dw.wrong_count || 0) > 100 && batchDailyWorks.length > 0) {
        break;
      }
      batchDailyWorks.push(dw);
      estimatedWrongCount += dw.wrong_count || 0;
    }

    remainingDailyWorks = newDailyWorks.length - batchDailyWorks.length;
    batchesProcessed++;

    console.log(`[DailyWorkCollector] 배치 ${batchesProcessed}: ${batchDailyWorks.length}건 처리 중 (예상 오답 ${estimatedWrongCount}개, 남은 건: ${remainingDailyWorks})`);

    // 배치 처리
    const batchResults: DBMathflatProblemResult[] = [];

    for (const dw of batchDailyWorks) {
      // 타임아웃 체크
      if (Date.now() - startTime > maxDurationMs) {
        console.log(`[DailyWorkCollector] 배치 처리 중 시간 초과, 중단`);
        remainingDailyWorks = newDailyWorks.length - batchDailyWorks.indexOf(dw);
        break;
      }

      try {
        let problems: (MathFlatWorkbookProblem | MathFlatWorksheetProblem)[] = [];

        if (dw.work_type === 'WORKBOOK' && dw.progress_id_list && dw.student_workbook_id && dw.student_book_id) {
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

        // 오답만 필터링
        // WRONG과 UNKNOWN 모두 오답으로 처리 (UNKNOWN = 미채점/오답 처리됨)
        const wrongProblems = problems.filter(p => p.result === 'WRONG' || p.result === 'UNKNOWN');

        for (const problem of wrongProblems) {
          const isWorkbook = 'workbookProblemId' in problem;
          const workbookProblem = problem as MathFlatWorkbookProblem;
          batchResults.push({
            daily_work_id: dw.id,
            homework_id: dw.homework_id || undefined,
            progress_id: isWorkbook ? workbookProblem.studentWorkbookProgressId : undefined,  // homework 매칭용
            problem_id: String(problem.problemId),
            workbook_problem_id: isWorkbook ? String(workbookProblem.workbookProblemId) : undefined,
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

        totalWrongCollected += wrongProblems.length;
        processedDailyWorkIds.add(dw.id);
        console.log(`[DailyWorkCollector] ${dw.student_name}: ${wrongProblems.length}개 오답`);
      } catch (error) {
        errors.push(`오답 수집 실패 (${dw.id}): ${error}`);
        processedDailyWorkIds.add(dw.id);  // 실패해도 재시도 방지
      }
    }

    // 배치 저장
    if (batchResults.length > 0) {
      const saveBatchSize = 100;
      for (let i = 0; i < batchResults.length; i += saveBatchSize) {
        const batch = batchResults.slice(i, i + saveBatchSize);
        const { error: insertError } = await supabase
          .from('mathflat_problem_results')
          .insert(batch);

        if (insertError) {
          errors.push(`오답 저장 실패: ${insertError.message}`);
        }
      }
      console.log(`[DailyWorkCollector] 배치 ${batchesProcessed} 저장 완료: ${batchResults.length}개`);
    }
  }

  const totalElapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`[DailyWorkCollector] 오답 수집 종료: ${batchesProcessed}배치, ${totalWrongCollected}개 수집, ${totalElapsed}초 소요, 남은 건: ${remainingDailyWorks}`);

  return { totalWrongCollected, remainingDailyWorks, batchesProcessed };
}
