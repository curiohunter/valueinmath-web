// MathFlat 수동 동기화 API
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/auth/server';
import { crawlMathflat } from '@/lib/mathflat/crawler';
import type { CrawlOptions } from '@/lib/mathflat/types';

export async function POST(request: NextRequest) {
  console.log('Sync API - Request received');
  
  try {
    // 인증 및 권한 확인 임시 스킵 (테스트용)
    const supabase = await createServerClient();
    
    // 요청 본문 파싱 (옵션)
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('JSON parse error:', e);
      return NextResponse.json(
        { error: '잘못된 요청 형식입니다.' },
        { status: 400 }
      );
    }
    
    const options: CrawlOptions = {
      studentIds: body.studentIds, // 특정 학생만 (선택사항)
      grades: body.grades, // 특정 학년만 (선택사항)
    };
    
    console.log('Sync API - Request options:', options);
    
    // 환경변수 확인
    if (!process.env.MATHFLAT_LOGIN_ID || !process.env.MATHFLAT_LOGIN_PW) {
      console.error('Missing environment variables');
      return NextResponse.json(
        { error: 'MathFlat 로그인 정보가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }
    
    // 크롤링 실행 (최신 데이터만)
    console.log('Starting MathFlat crawling for latest data...');
    
    let result;
    try {
      result = await crawlMathflat(options);
      console.log('Crawling result:', result);
    } catch (crawlError) {
      console.error('Crawling error:', crawlError);
      return NextResponse.json(
        { 
          error: '크롤링 중 오류가 발생했습니다.',
          details: crawlError instanceof Error ? crawlError.message : String(crawlError),
        },
        { status: 500 }
      );
    }
    
    // 결과 반환
    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `${result.studentsProcessed}명의 학생 최신 데이터를 동기화했습니다. (${result.recordsCreated}개 레코드 추가)`
        : '동기화 중 일부 오류가 발생했습니다.',
      data: result,
    });
    
  } catch (error) {
    console.error('Sync API unexpected error:', error);
    
    // 예상치 못한 오류가 발생해도 항상 응답 반환
    return NextResponse.json(
      { 
        error: '동기화 중 예상치 못한 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// 동기화 상태 확인
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }
    
    // 최근 동기화 로그 조회
    const { data: logs, error: logError } = await supabase
      .from('mathflat_sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(10);
    
    if (logError) {
      throw logError;
    }
    
    // 현재 실행 중인 동기화 확인
    const runningSync = logs?.find(log => log.status === 'running');
    
    return NextResponse.json({
      isRunning: !!runningSync,
      currentSync: runningSync,
      recentLogs: logs,
    });
    
  } catch (error) {
    console.error('Get sync status error:', error);
    
    return NextResponse.json(
      { 
        error: '상태 조회 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}