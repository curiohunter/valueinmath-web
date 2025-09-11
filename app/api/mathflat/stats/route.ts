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
    
    // 3. 최근 1주일 데이터 가져오기 (저성과 학생 및 챌린지 계산용)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    
    const { data: weekRecords } = await supabase
      .from('mathflat_records')
      .select('student_id, problems_solved, accuracy_rate, category, date, students!inner(name)')
      .gte('date', weekAgoStr)
      .order('date', { ascending: false });
    
    // 학생별 최근 1주일 데이터 그룹화
    const weekStudentDataMap = new Map<string, any[]>();
    weekRecords?.forEach(record => {
      if (!weekStudentDataMap.has(record.student_id)) {
        weekStudentDataMap.set(record.student_id, []);
      }
      weekStudentDataMap.get(record.student_id)?.push(record);
    });
    
    console.log('Week records count:', weekRecords?.length || 0);
    console.log('Week student data map size:', weekStudentDataMap.size);
    
    // 3. 저성과 학생 계산 (최근 1주일, 학습지/교재만)
    const lowPerformersList: any[] = [];
    weekStudentDataMap.forEach((records, studentId) => {
      // 학습지와 교재 카테고리만 필터링
      const studyRecords = records.filter(r => r.category === '학습지' || r.category === '교재');
      
      if (studyRecords.length > 0) {
        const totalProblems = studyRecords.reduce((sum, r) => sum + r.problems_solved, 0);
        const avgAccuracy = studyRecords.reduce((sum, r) => sum + r.accuracy_rate, 0) / studyRecords.length;
        
        // 문제를 20개 이상 풀었고 정답률이 60% 미만인 경우
        if (totalProblems >= 20 && avgAccuracy < 60) {
          lowPerformersList.push({
            name: (records[0] as any).students.name,
            problemsSolved: totalProblems,
            accuracyRate: Math.round(avgAccuracy),
            categories: '학습지/교재'
          });
        }
      }
    });
    
    // 정답률 낮은 순으로 정렬
    lowPerformersList.sort((a, b) => a.accuracyRate - b.accuracyRate);
    
    // 4. 챌린지 랭킹 계산 (최근 1주일 챌린지 문제 합계)
    const challengeMap = new Map<string, { name: string, totalProblems: number }>();
    weekStudentDataMap.forEach((records, studentId) => {
      // 챌린지 카테고리만 필터링
      const challengeRecords = records.filter(r => r.category === '챌린지');
      
      if (challengeRecords.length > 0) {
        const totalChallengeProblems = challengeRecords.reduce((sum, r) => sum + r.problems_solved, 0);
        const studentName = (records[0] as any).students.name;
        
        challengeMap.set(studentId, {
          name: studentName,
          totalProblems: totalChallengeProblems
        });
      }
    });
    
    // 챌린지 TOP 3 정렬 (전체 문제 수 기준)
    const challengeList = Array.from(challengeMap.values())
      .filter(item => item.totalProblems > 0)
      .sort((a, b) => b.totalProblems - a.totalProblems);
      
    const challengeTop3 = challengeList.slice(0, 3).map((item, index) => ({
      rank: index + 1,
      name: item.name,
      problemsSolved: item.totalProblems
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