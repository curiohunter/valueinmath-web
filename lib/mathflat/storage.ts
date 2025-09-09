// Supabase 데이터 저장 모듈

import { createServerClient } from '@/lib/auth/server';
import type { 
  MathflatRecord, 
  WeeklySummary, 
  DBMathflatRecord, 
  DBWeeklySummary,
  DBSyncLog,
  CategoryType 
} from './types';

/**
 * 학습 기록을 데이터베이스에 저장 (UPSERT)
 */
export async function saveMathflatRecords(records: MathflatRecord[]): Promise<{ success: boolean; error?: string; recordsCreated?: number }> {
  try {
    if (records.length === 0) {
      return { success: true, recordsCreated: 0 };
    }

    const supabase = await createServerClient();
    let recordsCreated = 0;
    
    // 각 레코드별로 처리
    for (const record of records) {
      // 이미 존재하는지 확인
      const { data: existing } = await supabase
        .from('mathflat_records')
        .select('id, problems_solved, accuracy_rate')
        .eq('student_id', record.studentId)
        .eq('date', record.date)
        .eq('category', record.category)
        .single();

      const dbRecord: DBMathflatRecord = {
        student_id: record.studentId,
        date: record.date,
        category: record.category,
        problems_solved: record.problemsSolved,
        accuracy_rate: record.accuracyRate,
      };

      if (existing) {
        // 데이터가 변경된 경우만 업데이트
        if (existing.problems_solved !== record.problemsSolved || 
            existing.accuracy_rate !== record.accuracyRate) {
          const { error } = await supabase
            .from('mathflat_records')
            .update(dbRecord)
            .eq('id', existing.id);
          
          if (error) {
            console.error('Error updating record:', error);
          } else {
            console.log(`Updated record for ${record.studentId} - ${record.category}: ${record.problemsSolved}문제, ${record.accuracyRate}%`);
          }
        }
      } else {
        // 새로운 레코드 삽입
        const { error } = await supabase
          .from('mathflat_records')
          .insert(dbRecord);
        
        if (!error) {
          recordsCreated++;
          console.log(`New record for ${record.studentId} - ${record.category}: ${record.problemsSolved}문제, ${record.accuracyRate}%`);
        } else {
          console.error('Error inserting record:', error);
        }
      }
    }

    return { success: true, recordsCreated };
  } catch (error) {
    console.error('Unexpected error saving records:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 주간 요약 데이터 생성 및 저장
 */
export async function saveWeeklySummary(studentId: string, weekStart: string, weekEnd: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    
    // 해당 주의 모든 기록 조회
    const { data: records, error: fetchError } = await supabase
      .from('mathflat_records')
      .select('*')
      .eq('student_id', studentId)
      .gte('date', weekStart)
      .lte('date', weekEnd);

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    if (!records || records.length === 0) {
      // 데이터가 없으면 요약도 생성하지 않음
      return { success: true };
    }

    // 통계 계산
    const totalProblems = records.reduce((sum, r) => sum + r.problems_solved, 0);
    const avgAccuracy = Math.round(
      records.reduce((sum, r) => sum + r.accuracy_rate * r.problems_solved, 0) / totalProblems
    );

    // 카테고리별 문제 수
    const categoryBreakdown: Record<string, number> = {};
    records.forEach(record => {
      categoryBreakdown[record.category] = (categoryBreakdown[record.category] || 0) + record.problems_solved;
    });

    // 특이사항 자동 생성
    const notes: string[] = [];
    
    // 정답률이 낮은 카테고리 체크
    const lowAccuracyCategories = records
      .filter(r => r.accuracy_rate < 60)
      .map(r => r.category);
    if (lowAccuracyCategories.length > 0) {
      notes.push(`정답률 60% 미만 카테고리: ${[...new Set(lowAccuracyCategories)].join(', ')}`);
    }

    // 학습량이 많은 날 체크
    const dailyTotals = records.reduce((acc, r) => {
      acc[r.date] = (acc[r.date] || 0) + r.problems_solved;
      return acc;
    }, {} as Record<string, number>);
    
    const highVolumeDays = Object.entries(dailyTotals)
      .filter(([_, count]) => count > 100)
      .map(([date, count]) => `${date} (${count}문제)`);
    if (highVolumeDays.length > 0) {
      notes.push(`100문제 이상 학습한 날: ${highVolumeDays.join(', ')}`);
    }

    // 주간 요약 저장
    const summary: DBWeeklySummary = {
      student_id: studentId,
      week_start: weekStart,
      week_end: weekEnd,
      total_problems: totalProblems,
      avg_accuracy: avgAccuracy,
      category_breakdown: categoryBreakdown,
      notes: notes.length > 0 ? notes : undefined,
    };

    const { error: saveError } = await supabase
      .from('mathflat_weekly_summary')
      .upsert(summary, {
        onConflict: 'student_id,week_start',
        ignoreDuplicates: false,
      });

    if (saveError) {
      return { success: false, error: saveError.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error saving weekly summary:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 크롤링 로그 생성
 */
export async function createSyncLog(log: Omit<DBSyncLog, 'id'>): Promise<{ success: boolean; logId?: string; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('mathflat_sync_logs')
      .insert(log)
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, logId: data.id };
  } catch (error) {
    console.error('Error creating sync log:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 크롤링 로그 업데이트
 */
export async function updateSyncLog(
  logId: string,
  updates: Partial<DBSyncLog>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from('mathflat_sync_logs')
      .update(updates)
      .eq('id', logId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating sync log:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 학생 목록 조회
 */
export async function getStudentList(): Promise<{ id: string; name: string }[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('students')
      .select('id, name')
      .eq('status', '재원')
      .order('name');

    if (error) {
      console.error('Error fetching students:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching students:', error);
    return [];
  }
}

/**
 * 특정 날짜의 기록이 이미 있는지 확인
 */
export async function checkExistingRecords(
  studentId: string,
  date: string,
  category?: CategoryType
): Promise<boolean> {
  try {
    const supabase = await createServerClient();
    let query = supabase
      .from('mathflat_records')
      .select('id')
      .eq('student_id', studentId)
      .eq('date', date);
    
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query.limit(1);

    if (error) {
      console.error('Error checking existing records:', error);
      return false;
    }

    return (data && data.length > 0) || false;
  } catch (error) {
    console.error('Unexpected error checking records:', error);
    return false;
  }
}