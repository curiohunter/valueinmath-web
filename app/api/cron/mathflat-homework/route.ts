/**
 * MathFlat 숙제 수집 크론잡 API 엔드포인트
 *
 * POST /api/cron/mathflat-homework
 *
 * 인증: Authorization: Bearer {CRON_SECRET}
 *
 * Body:
 * - collectionType: 'first' | 'second' (1차/2차 수집)
 * - classIds?: string[] (특정 반만 수집, 테스트용)
 *
 * 스케줄:
 * - 1차 수집: 매일 23:50 KST (UTC 14:50)
 * - 2차 수집: 매일 10:00 KST (UTC 01:00)
 */

import { NextRequest, NextResponse } from 'next/server';
import { collectHomework } from '@/lib/mathflat/homework-collector';
import type { HomeworkCollectionOptions } from '@/lib/mathflat/types';

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
  let body: { collectionType?: string; classIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { collectionType, classIds } = body;

  // 3. collectionType 검증
  if (!collectionType || !['first', 'second'].includes(collectionType)) {
    return NextResponse.json(
      { error: 'collectionType은 "first" 또는 "second"여야 합니다' },
      { status: 400 }
    );
  }

  console.log(`[CronJob] MathFlat 숙제 수집 시작 - ${collectionType}차 수집`);
  if (classIds && classIds.length > 0) {
    console.log(`[CronJob] 대상 반 제한: ${classIds.join(', ')}`);
  }

  // 4. 수집 실행
  try {
    const options: HomeworkCollectionOptions = {
      collectionType: collectionType as 'first' | 'second',
      targetDate: new Date(),
      classIds,
    };

    const result = await collectHomework(options);

    const duration = Date.now() - startTime;
    console.log(`[CronJob] 수집 완료 - 소요시간: ${duration}ms`);

    // 5. 결과 반환
    return NextResponse.json({
      success: result.success,
      message: result.success
        ? `${collectionType}차 수집 완료`
        : `${collectionType}차 수집 실패`,
      data: {
        collectionType: result.collectionType,
        targetDate: result.targetDate,
        processedClasses: result.processedClasses.map((c) => ({
          className: c.className,
          studentCount: c.studentCount,
          homeworkCount: c.homeworkCount,
          problemCount: c.problemCount,
          error: c.error,
        })),
        totalHomeworkCount: result.totalHomeworkCount,
        totalProblemCount: result.totalProblemCount,
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
    endpoint: '/api/cron/mathflat-homework',
    description: 'MathFlat 숙제 수집 크론잡',
    methods: ['POST'],
    authentication: 'Bearer token required (CRON_SECRET)',
    body: {
      collectionType: "'first' | 'second' (required)",
      classIds: "string[] (optional, for testing specific classes)",
    },
  });
}
