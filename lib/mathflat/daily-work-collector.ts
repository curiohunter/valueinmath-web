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
  MathFlatWorkItem,
} from './types';

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
