/**
 * MathFlat 일일 풀이 수집 크론잡 API 엔드포인트
 *
 * POST /api/cron/mathflat-daily-work
 *
 * 인증: Authorization: Bearer {CRON_SECRET}
 *
 * Body:
 * - targetDate?: string (YYYY-MM-DD, 기본값: 오늘)
 * - studentIds?: string[] (특정 학생만 수집, 테스트용)
 *
 * 스케줄:
 * - 매일 23:55 KST (UTC 14:55) - 오늘 전체 학생 풀이 수집
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
  let body: { targetDate?: string; studentIds?: string[] };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { targetDate, studentIds } = body;

  // targetDate 파싱 (기본값: 오늘 KST)
  let parsedDate: Date;
  if (targetDate) {
    parsedDate = new Date(targetDate + 'T00:00:00+09:00');
  } else {
    // KST 기준 오늘
    parsedDate = new Date();
  }

  console.log(`[CronJob] MathFlat 일일 풀이 수집 시작`);
  if (studentIds && studentIds.length > 0) {
    console.log(`[CronJob] 대상 학생 제한: ${studentIds.join(', ')}`);
  }

  // 3. 수집 실행
  try {
    const options: DailyWorkCollectionOptions = {
      targetDate: parsedDate,
      studentIds,
    };

    const result = await collectDailyWork(options);

    const duration = Date.now() - startTime;
    console.log(`[CronJob] 일일 풀이 수집 완료 - 소요시간: ${duration}ms`);

    // 4. 결과 반환
    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `일일 풀이 수집 완료`
        : `일일 풀이 수집 실패`,
      data: {
        targetDate: result.targetDate,
        totalStudents: result.totalStudents,
        totalWorkCount: result.totalWorkCount,
        matchedHomeworkCount: result.matchedHomeworkCount,
        errorCount: result.errors.length,
        durationMs: result.durationMs,
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
    description: 'MathFlat 일일 풀이 수집 크론잡 (n8n 대체)',
    methods: ['POST'],
    authentication: 'Bearer token required (CRON_SECRET)',
    body: {
      targetDate: "string (YYYY-MM-DD, optional, default: today)",
      studentIds: "string[] (optional, for testing specific students)",
    },
    schedule: '매일 23:55 KST - 전체 학생 당일 풀이 수집',
    features: [
      '모든 ACTIVE 학생 풀이 수집',
      'WORKBOOK/WORKSHEET/CHALLENGE 구분',
      '숙제 자동 매칭 (mathflat_homework)',
      'Google Sheets 대체 (mathflat_daily_work 테이블)',
    ],
  });
}
