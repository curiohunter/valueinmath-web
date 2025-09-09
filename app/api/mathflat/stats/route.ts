// MathFlat 통계 API
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // 1. 총 재원 학생 수
    const { data: enrolledStudents, error: studentsError } = await supabase
      .from('students')
      .select('id, name')
      .eq('status', '재원');
    
    if (studentsError) {
      console.error('Error fetching students:', studentsError);
    }
    
    const totalEnrolled = enrolledStudents?.length || 0;
    
    // 2. 모든 학생의 가장 최근 동기화 상태 확인 (날짜 무관)
    const { data: allSyncedRecords, error: recordsError } = await supabase
      .from('mathflat_records')
      .select('student_id, date')
      .order('date', { ascending: false });
    
    if (recordsError) {
      console.error('Error fetching records:', recordsError);
    }
    
    // 각 학생의 가장 최근 기록만 유지
    const latestRecordsByStudent = new Map<string, string>();
    allSyncedRecords?.forEach(record => {
      if (!latestRecordsByStudent.has(record.student_id)) {
        latestRecordsByStudent.set(record.student_id, record.date);
      }
    });
    
    const syncedStudentIds = new Set(latestRecordsByStudent.keys());
    const syncedCount = syncedStudentIds.size;
    const notSyncedStudents = enrolledStudents?.filter(s => !syncedStudentIds.has(s.id)) || [];
    
    // 가장 최근 날짜 (통계 표시용)
    const latestDate = allSyncedRecords?.[0]?.date || new Date().toISOString().split('T')[0];
    console.log('Latest sync date:', latestDate, 'Total synced students:', syncedCount);
    
    // 3. 저성과 학생 (20문제 이상, 60% 미만) - 각 학생의 최신 데이터 기준
    const lowPerformersList: any[] = [];
    for (const [studentId, date] of latestRecordsByStudent.entries()) {
      const { data: records } = await supabase
        .from('mathflat_records')
        .select('student_id, problems_solved, accuracy_rate, category, students!inner(name)')
        .eq('student_id', studentId)
        .eq('date', date);
      
      // 모든 카테고리 합산
      if (records && records.length > 0) {
        const totalProblems = records.reduce((sum, r) => sum + r.problems_solved, 0);
        const avgAccuracy = records.reduce((sum, r) => sum + r.accuracy_rate, 0) / records.length;
        
        if (totalProblems >= 20 && avgAccuracy < 60) {
          lowPerformersList.push({
            name: (records[0] as any).students.name,
            problemsSolved: totalProblems,
            accuracyRate: Math.round(avgAccuracy)
          });
        }
      }
    }
    
    // 4. 챌린지 랭킹 - 각 학생의 최신 챌린지 데이터
    const challengeList: any[] = [];
    for (const [studentId, date] of latestRecordsByStudent.entries()) {
      const { data: challengeRecord } = await supabase
        .from('mathflat_records')
        .select('student_id, problems_solved, students!inner(name)')
        .eq('student_id', studentId)
        .eq('date', date)
        .eq('category', '챌린지')
        .single();
      
      if (challengeRecord && challengeRecord.problems_solved > 0) {
        challengeList.push({
          name: (challengeRecord as any).students.name,
          problemsSolved: challengeRecord.problems_solved
        });
      }
    }
    
    // 챌린지 TOP 3 정렬
    challengeList.sort((a, b) => b.problemsSolved - a.problemsSolved);
    const challengeTop3 = challengeList.slice(0, 3).map((item, index) => ({
      rank: index + 1,
      ...item
    }));
    
    return NextResponse.json({
      currentDate: latestDate, // 현재 표시중인 날짜
      totalEnrolled,
      syncedCount,
      notSyncedCount: totalEnrolled - syncedCount,
      notSyncedStudents: notSyncedStudents.map(s => s.name), // 모든 미동기화 학생 이름
      lowPerformers: lowPerformersList, // 모든 저성과자 이름
      challengeTop3
    });
    
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { error: '통계 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}