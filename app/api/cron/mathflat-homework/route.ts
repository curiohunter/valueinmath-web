/**
 * MathFlat 숙제 수집 크론잡 API 엔드포인트
 *
 * POST /api/cron/mathflat-homework
 *
 * 인증: Authorization: Bearer {CRON_SECRET}
 *
 * Body:
 * - collectionType: 'first' (하위 호환성용, 필수)
 * - classIds?: string[] (특정 반만 수집, 수동 수집용)
 * - targetDate?: string (YYYY-MM-DD, MathFlat API 조회 날짜, 기본값: 오늘)
 * - homeworkDate?: string (YYYY-MM-DD, DB 저장 날짜/수업일 기준, 기본값: targetDate)
 *
 * 스케줄:
 * - 매일 23:30 KST - 오늘 수업 있는 반의 숙제 수집
 *
 * 수동 수집 예시 (수요일 수업 숙제를 목요일에 수집):
 * - classIds: ['196274']
 * - targetDate: '2026-02-06' (목요일, 숙제 낸 날)
 * - homeworkDate: '2026-02-05' (수요일, 수업일)
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
  let body: { collectionType?: string; classIds?: string[]; targetDate?: string; homeworkDate?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { collectionType, classIds, targetDate, homeworkDate } = body;

  // 3. collectionType 검증 (하위 호환성: 'first'만 지원, 다른 값도 first로 처리)
  if (!collectionType) {
    return NextResponse.json(
      { error: 'collectionType이 필요합니다' },
      { status: 400 }
    );
  }

  // targetDate 파싱 (기본값: 오늘 KST) - MathFlat API 조회 날짜
  let parsedDate: Date;
  if (targetDate) {
    parsedDate = new Date(targetDate + 'T00:00:00+09:00');
  } else {
    parsedDate = new Date();
  }

  // homeworkDate 파싱 - DB에 저장할 숙제 날짜 (수업일 기준)
  let parsedHomeworkDate: Date | undefined;
  if (homeworkDate) {
    parsedHomeworkDate = new Date(homeworkDate + 'T00:00:00+09:00');
  }

  console.log(`[CronJob] MathFlat 숙제 수집 시작, 수집 날짜: ${targetDate || '오늘'}`);
  if (homeworkDate) {
    console.log(`[CronJob] 숙제 날짜 오버라이드: ${homeworkDate} (수업일 기준)`);
  }
  if (classIds && classIds.length > 0) {
    console.log(`[CronJob] 대상 반 제한: ${classIds.join(', ')}`);
  }

  // 4. 수집 실행
  try {
    const options: HomeworkCollectionOptions = {
      collectionType: 'first',
      targetDate: parsedDate,
      classIds,
      homeworkDate: parsedHomeworkDate,
    };

    const result = await collectHomework(options);

    const duration = Date.now() - startTime;
    console.log(`[CronJob] 수집 완료 - 소요시간: ${duration}ms`);

    // 5. 결과 반환
    return NextResponse.json({
      success: result.success,
      message: result.success ? '숙제 수집 완료' : '숙제 수집 실패',
      data: {
        targetDate: result.targetDate,
        processedClasses: result.processedClasses.map((c) => ({
          className: c.className,
          studentCount: c.studentCount,
          homeworkCount: c.homeworkCount,
          error: c.error,
        })),
        totalHomeworkCount: result.totalHomeworkCount,
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
      collectionType: "'first' (required)",
      classIds: "string[] (optional, mathflat_class_id 배열)",
      targetDate: "YYYY-MM-DD (optional, MathFlat API 조회 날짜, 기본값: 오늘)",
      homeworkDate: "YYYY-MM-DD (optional, DB 저장 날짜/수업일 기준, 기본값: targetDate)",
    },
    schedule: '매일 23:30 KST - 오늘 수업 있는 반의 숙제 수집',
    example: {
      description: '수요일 수업 숙제를 목요일에 수집하는 경우',
      body: {
        collectionType: 'first',
        classIds: ['196274'],
        targetDate: '2026-02-06',
        homeworkDate: '2026-02-05',
      },
    },
  });
}
