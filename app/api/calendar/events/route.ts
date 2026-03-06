import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'
import { createGoogleEvent, updateGoogleEvent, deleteGoogleEvent, refreshAccessToken } from '@/lib/google/calendar'
import type { Database } from '@/types/database'

// Google 토큰 자동 갱신 함수
async function getValidAccessToken(): Promise<string | null> {
  const currentToken = process.env.GOOGLE_ACCESS_TOKEN
  const expiresAt = process.env.GOOGLE_TOKEN_EXPIRES_AT
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
  
  if (!currentToken || !refreshToken) {
    console.log('Google 토큰이 설정되지 않았습니다.')
    return null
  }
  
  // 토큰이 만료되었는지 확인 (5분 여유 두기)
  if (expiresAt) {
    const expiryTime = new Date(expiresAt).getTime()
    const currentTime = Date.now()
    const fiveMinutes = 5 * 60 * 1000
    
    if (currentTime < (expiryTime - fiveMinutes)) {
      // 토큰이 아직 유효함
      return currentToken
    }
  }
  
  // 토큰 갱신 시도
  try {
    console.log('Google 토큰 갱신 중...')
    const newTokenData = await refreshAccessToken(refreshToken)
    console.log('Google 토큰 갱신 성공')
    
    // 새 토큰을 환경변수로 업데이트 (실제 운영환경에서는 DB나 안전한 저장소 사용)
    process.env.GOOGLE_ACCESS_TOKEN = newTokenData.access_token
    process.env.GOOGLE_TOKEN_EXPIRES_AT = new Date(newTokenData.expires_at).toISOString()
    
    return newTokenData.access_token
  } catch (error) {
    console.error('Google 토큰 갱신 실패:', error)
    return null
  }
}

// GET - 이벤트 조회 (전체 또는 특정 기간)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    let query = supabase
      .from('calendar_events')
      .select('*')

    // 날짜 범위 필터링 (기본: 과거 3개월 ~ 미래 3개월)
    const now = new Date()
    const defaultStart = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString()
    const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 4, 0).toISOString()

    query = query
      .gte('start_time', startDate || defaultStart)
      .lte('start_time', endDate || defaultEnd)

    const { data, error } = await query
      .order('start_time', { ascending: true })
      .limit(3000)
    
    if (error) {
      console.error('Error fetching events:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Failed to fetch events:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

// POST - 새 이벤트 생성
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  try {
    console.log('📝 이벤트 생성 시작')
    
    const eventData = await request.json()
    console.log('⏱️ JSON 파싱 완료:', Date.now() - startTime, 'ms')
    
    const supabase = await createServerClient()
    console.log('⏱️ Supabase 클라이언트 생성:', Date.now() - startTime, 'ms')
    
    // 현재 사용자 정보 가져오기 (optional - 에러 무시)
    let userId = null
    try {
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id || null
    } catch (error) {
      // 인증 실패해도 계속 진행
      console.log('사용자 인증 실패 (무시하고 계속 진행)')
    }
    console.log('⏱️ 사용자 확인 완료:', Date.now() - startTime, 'ms')

    // 메인 DB 작업 - 이벤트 생성 (사용자 정보 있으면 저장, 없으면 null)
    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        ...eventData,
        created_by: userId
      })
      .select()
      .single()
    
    console.log('⏱️ DB 저장 완료:', Date.now() - startTime, 'ms')
    
    if (error) {
      console.error('Error creating event:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Google Calendar 동기화를 즉시 처리하고 응답에 포함
    let googleCalendarId = null
    try {
      console.log('🔄 Google Calendar 동기화 시작')
      const validToken = await getValidAccessToken()
      
      if (validToken && data) {
        // @ts-ignore - data 타입 복잡성 해결
        googleCalendarId = await createGoogleEvent(data, validToken)
        // Google Calendar ID를 DB에 업데이트
        await supabase
          .from('calendar_events')
          .update({ google_calendar_id: googleCalendarId } as any) // 데이터베이스 타입 복잡성으로 인한 타입 캐스팅
          // @ts-ignore - Supabase 타입 복잡성 해결을 위한 임시 처리
          .eq('id', data.id!)
        
        // 데이터에 Google Calendar ID 추가
        // @ts-ignore - data 타입 복잡성 해결
        data.google_calendar_id = googleCalendarId
        console.log('✅ Google Calendar 이벤트 생성 동기화 성공:', googleCalendarId)
      } else {
        console.log('⚠️ Google Calendar 토큰이 없어 동기화를 건너뜁니다.')
      }
    } catch (error) {
      console.error('❌ Google Calendar 이벤트 생성 동기화 실패:', error)
      // Google Calendar 실패해도 응답은 성공으로 처리
    }
    
    console.log('✅ 응답 전송:', Date.now() - startTime, 'ms')
    return NextResponse.json({ data, googleCalendarId })
  } catch (error) {
    console.error('Failed to create event:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}