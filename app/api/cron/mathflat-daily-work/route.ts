/**
 * 일일 학습 데이터 수집 크론잡 API 엔드포인트
 *
 * POST /api/cron/mathflat-daily-work
 *
 * 인증: Authorization: Bearer {CRON_SECRET}
 *
 * Body:
 * - targetDate?: string (YYYY-MM-DD, 기본값: 오늘)
 * - studentIds?: string[] (특정 학생만 수집, 테스트용)
 * - collectProblemDetails?: boolean (오답 상세 수집 여부, 기본: true)
 *
 * 동작:
 * - 풀이 요약 수집 후, 오답 상세를 4분 동안 최대한 수집
 * - 남은 게 있으면 다음 호출에서 이어서 처리
 * - 남은 게 없으면 빠르게 완료
 *
 * 스케줄:
 * - 23:55 KST - 메인 수집 (요약 + 오답 최대한)
 * - 12:00 KST - 오전 활동 + 남은 오답 처리
 */

import { NextRequest, NextResponse } from 'next/server';
import { collectDailyWork } from '@/lib/mathflat/daily-work-collector';
import type { DailyWorkCollectionOptions } from '@/lib/mathflat/types';

export const maxDuration = 300; // 5분 타임아웃
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // 1. Secret Key 인증
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('[CronJob] CRON_SECRET 환경변수가 설정되지 않았습니다');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[CronJob] 인증 실패: 잘못된 Authorization 헤더');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // 2. 요청 파싱
  let body: {
    targetDate?: string;
    studentIds?: string[];
    collectProblemDetails?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { targetDate, studentIds, collectProblemDetails } = body;

  // targetDate 파싱 (기본값: 오늘 KST)
  let parsedDate: Date;
  if (targetDate) {
    parsedDate = new Date(targetDate + 'T00:00:00+09:00');
  } else {
    // KST 기준 오늘
    parsedDate = new Date();
  }

  console.log(`[CronJob] 일일 풀이 수집 시작 (오답 상세: ${collectProblemDetails !== false ? '예' : '아니오'}, 최대 4분)`);
  if (studentIds && studentIds.length > 0) {
    console.log(`[CronJob] 대상 학생 제한: ${studentIds.join(', ')}`);
  }

  // 3. 수집 실행
  try {
    const options: DailyWorkCollectionOptions = {
      targetDate: parsedDate,
      studentIds,
      collectProblemDetails,
    };

    const result = await collectDailyWork(options);

    const duration = Date.now() - startTime;
    console.log(`[CronJob] 일일 풀이 수집 완료 - 소요시간: ${duration}ms`);

    // 4. 결과 반환
    const hasRemaining = (result.remainingDailyWorks || 0) > 0;
    return NextResponse.json({
      success: result.success,
      message: result.success
        ? hasRemaining
          ? `수집 완료 (오답 ${result.remainingDailyWorks}건 남음, 다음 호출에서 계속)`
          : `수집 완료 (모든 오답 처리됨)`
        : `수집 실패`,
      data: {
        targetDate: result.targetDate,
        totalStudents: result.totalStudents,
        totalWorkCount: result.totalWorkCount,
        batchesProcessed: result.batchesProcessed || 0,
        wrongProblemsCollected: result.totalProblemCount || 0,
        remainingDailyWorks: result.remainingDailyWorks || 0,
        errorCount: result.errors.length,
        durationMs: result.durationMs,
        // 숙제 매칭은 DB 트리거가 자동 처리
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    console.error('[CronJob] 수집 중 예외 발생:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: String(error),
      },
      { status: 500 }
    );
  }
}

// GET 요청 처리 (상태 확인용)
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/cron/mathflat-daily-work',
    description: '일일 학습 데이터 수집 크론잡',
    methods: ['POST'],
    authentication: 'Bearer token required (CRON_SECRET)',
    body: {
      targetDate: "string (YYYY-MM-DD, optional, default: today)",
      studentIds: "string[] (optional, for testing)",
      collectProblemDetails: "boolean (optional, default: true) - 오답 상세 수집 여부",
    },
    schedule: {
      main: '23:55 KST - 풀이 요약 + 오답 상세 (4분간 최대한)',
      supplement: '12:00 KST - 오전 활동 + 남은 오답 처리',
    },
    features: [
      '모든 ACTIVE 학생 풀이 수집',
      '오답만 상세 수집 (정답은 요약만)',
      '시간 기반 동적 배치 (4분간 최대한 처리)',
      '남은 건수 자동 추적 (다음 호출에서 계속)',
    ],
  });
}
