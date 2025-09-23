import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/auth/server';
import type { MathflatType } from '@/lib/mathflat/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 오늘 날짜와 일주일 전 날짜
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    // 1. 교재/학습지 정답률 차이 10% 이상 학생 (최근 7일)
    const { data: weeklyRecords } = await supabase
      .from('mathflat_records')
      .select('student_id, student_name, mathflat_type, correct_rate')
      .gte('event_date', weekAgoStr);

    // 학생별 교재/학습지 평균 정답률 계산
    const studentRatesByType = new Map<string, {
      student_name: string;
      교재: { sum: number; count: number };
      학습지: { sum: number; count: number };
    }>();

    if (weeklyRecords) {
      weeklyRecords.forEach(record => {
        const key = record.student_id;
        if (!studentRatesByType.has(key)) {
          studentRatesByType.set(key, {
            student_name: record.student_name,
            교재: { sum: 0, count: 0 },
            학습지: { sum: 0, count: 0 }
          });
        }
        const stats = studentRatesByType.get(key)!;
        if (record.mathflat_type === '교재') {
          stats.교재.sum += record.correct_rate;
          stats.교재.count++;
        } else if (record.mathflat_type === '학습지') {
          stats.학습지.sum += record.correct_rate;
          stats.학습지.count++;
        }
      });
    }

    // 10% 이상 차이나는 학생 찾기
    const rateDifferenceStudents: Array<{
      student_name: string;
      교재_rate: number;
      학습지_rate: number;
      difference: number;
    }> = [];

    studentRatesByType.forEach((stats) => {
      if (stats.교재.count > 0 && stats.학습지.count > 0) {
        const 교재_rate = Math.round(stats.교재.sum / stats.교재.count);
        const 학습지_rate = Math.round(stats.학습지.sum / stats.학습지.count);
        const difference = Math.abs(교재_rate - 학습지_rate);

        if (difference >= 10) {
          rateDifferenceStudents.push({
            student_name: stats.student_name,
            교재_rate,
            학습지_rate,
            difference
          });
        }
      }
    });

    // 차이가 큰 순서대로 정렬
    rateDifferenceStudents.sort((a, b) => b.difference - a.difference);

    // 2. 교재 정답률 60% 이하 학생 (최근 7일)
    const lowTextbookStudents: Array<{
      student_name: string;
      average_rate: number;
      problem_count: number;
    }> = [];

    studentRatesByType.forEach((stats) => {
      if (stats.교재.count > 0) {
        const average_rate = Math.round(stats.교재.sum / stats.교재.count);
        if (average_rate <= 60) {
          lowTextbookStudents.push({
            student_name: stats.student_name,
            average_rate,
            problem_count: stats.교재.count
          });
        }
      }
    });

    // 정답률이 낮은 순서대로 정렬
    lowTextbookStudents.sort((a, b) => a.average_rate - b.average_rate);

    // 3. 챌린지/챌린지오답 가장 많이 한 학생 상위 3명 (최근 7일)
    const { data: challengeData } = await supabase
      .from('mathflat_records')
      .select('student_id, student_name, mathflat_type, problem_solved')
      .in('mathflat_type', ['챌린지', '챌린지오답'])
      .gte('event_date', weekAgoStr);

    const challengeStats = new Map<string, {
      student_name: string;
      total_problems: number;
    }>();

    if (challengeData) {
      challengeData.forEach(record => {
        const key = record.student_id;
        if (!challengeStats.has(key)) {
          challengeStats.set(key, {
            student_name: record.student_name,
            total_problems: 0
          });
        }
        const stats = challengeStats.get(key)!;
        stats.total_problems += record.problem_solved;
      });
    }

    const topChallengeStudents = Array.from(challengeStats.values())
      .sort((a, b) => b.total_problems - a.total_problems)
      .slice(0, 5)
      .map(s => ({
        student_name: s.student_name,
        total_problems: s.total_problems
      }));

    // 4. 주간 랭킹 (최근 7일 전체 문제 수 기준 상위 3명)
    const { data: allWeeklyData } = await supabase
      .from('mathflat_records')
      .select('student_id, student_name, problem_solved')
      .gte('event_date', weekAgoStr);

    const weeklyRankingStats = new Map<string, {
      student_name: string;
      total_problems: number;
    }>();

    if (allWeeklyData) {
      allWeeklyData.forEach(record => {
        const key = record.student_id;
        if (!weeklyRankingStats.has(key)) {
          weeklyRankingStats.set(key, {
            student_name: record.student_name,
            total_problems: 0
          });
        }
        const stats = weeklyRankingStats.get(key)!;
        stats.total_problems += record.problem_solved;
      });
    }

    const weeklyTopPerformers = Array.from(weeklyRankingStats.values())
      .sort((a, b) => b.total_problems - a.total_problems)
      .slice(0, 5)
      .map(s => ({
        student_id: '', // API에서 필요 없지만 타입 유지
        student_name: s.student_name,
        total_problems: s.total_problems,
        average_rate: 0 // 사용하지 않음
      }));

    const statsData = {
      rateDifferenceStudents: rateDifferenceStudents.slice(0, 5), // 최대 5명
      lowTextbookStudents: lowTextbookStudents.slice(0, 5), // 최대 5명
      topChallengeStudents,
      weeklyTopPerformers
    };

    return NextResponse.json({
      success: true,
      data: statsData
    });

  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      {
        error: '통계 조회 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}