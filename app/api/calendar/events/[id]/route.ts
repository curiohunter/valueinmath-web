import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { updateGoogleEvent, deleteGoogleEvent, refreshAccessToken } from '@/lib/google/calendar'
import type { Database } from '@/types/database'
import { cookies } from 'next/headers'

// Google 토큰 자동 갱신 함수 (메인 route.ts와 동일)
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
      return currentToken
    }
  }
  
  // 토큰 갱신 시도
  try {
    console.log('Google 토큰 갱신 중...')
    const newTokenData = await refreshAccessToken(refreshToken)
    console.log('Google 토큰 갱신 성공')
    
    process.env.GOOGLE_ACCESS_TOKEN = newTokenData.access_token
    process.env.GOOGLE_TOKEN_EXPIRES_AT = new Date(newTokenData.expires_at).toISOString()
    
    return newTokenData.access_token
  } catch (error) {
    console.error('Google 토큰 갱신 실패:', error)
    return null
  }
}

// PUT - 이벤트 수정
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const eventData = await request.json()
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore as any // Next.js 15 호환성을 위한 타입 캐스팅
    })
    
    // 메인 DB 작업 - 이벤트 수정
    const { data, error } = await supabase
      .from('calendar_events')
      .update({
        ...eventData,
        updated_at: new Date().toISOString()
      } as any) // 데이터베이스 타입 복잡성으로 인한 타입 캐스팅
      // @ts-ignore - Supabase 타입 복잡성 해결을 위한 임시 처리
      .eq('id', params.id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating event:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 즉시 응답 반환
    const response = NextResponse.json({ data })
    
    // Google Calendar 동기화를 완전히 분리된 프로세스로 처리
    // @ts-ignore - data 타입 복잡성 해결
    if (data?.google_calendar_id) {
      setImmediate(async () => {
        try {
          const validToken = await getValidAccessToken()
          if (validToken) {
            // @ts-ignore - data 타입 복잡성 해결
            await updateGoogleEvent(data.google_calendar_id!, data, validToken)
            console.log('Google Calendar 이벤트 수정 동기화 성공')
          } else {
            console.log('⚠️ Google Calendar 토큰이 없어 동기화를 건너뜁니다.')
          }
        } catch (error) {
          console.error('Google Calendar 이벤트 수정 동기화 실패:', error)
        }
      })
    }
    
    return response
  } catch (error) {
    console.error('Failed to update event:', error)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}

// DELETE - 이벤트 삭제
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params
    const cookieStore = await cookies()
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore as any // Next.js 15 호환성을 위한 타입 캐스팅
    })
    
    // 삭제하기 전에 Google Calendar ID 가져오기
    const { data: eventToDelete } = await supabase
      .from('calendar_events')
      .select('google_calendar_id')
      // @ts-ignore - Supabase 타입 복잡성 해결을 위한 임시 처리
      .eq('id', params.id)
      .single()
    
    // 메인 DB 작업 - 이벤트 삭제
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      // @ts-ignore - Supabase 타입 복잡성 해결을 위한 임시 처리
      .eq('id', params.id)
    
    if (error) {
      console.error('Error deleting event:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 즉시 응답 반환
    const response = NextResponse.json({ success: true })
    
    // Google Calendar 동기화를 완전히 분리된 프로세스로 처리
    // @ts-ignore - eventToDelete 타입 복잡성 해결
    if (eventToDelete?.google_calendar_id) {
      setImmediate(async () => {
        try {
          const validToken = await getValidAccessToken()
          if (validToken) {
            // @ts-ignore - eventToDelete 타입 복잡성 해결
            await deleteGoogleEvent(eventToDelete.google_calendar_id!, validToken)
            console.log('Google Calendar 이벤트 삭제 동기화 성공')
          } else {
            console.log('⚠️ Google Calendar 토큰이 없어 동기화를 건너뜁니다.')
          }
        } catch (error) {
          console.error('Google Calendar 이벤트 삭제 동기화 실패:', error)
        }
      })
    }
    
    return response
  } catch (error) {
    console.error('Failed to delete event:', error)
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
}