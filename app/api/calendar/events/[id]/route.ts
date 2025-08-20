import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'
import { updateGoogleEvent, deleteGoogleEvent, refreshAccessToken } from '@/lib/google/calendar'
import type { Database } from '@/types/database'

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
    const supabase = await createServerClient()
    
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

    // 연결된 보강 데이터 동기화
    if (data && (data.event_type === 'absence' || data.event_type === 'makeup')) {
      try {
        // 이벤트 ID로 연결된 보강 찾기
        const { data: makeupClasses } = await supabase
          .from('makeup_classes')
          .select('*')
          .or(`absence_calendar_event_id.eq.${params.id},makeup_calendar_event_id.eq.${params.id}`);

        if (makeupClasses && makeupClasses.length > 0) {
          for (const makeup of makeupClasses) {
            const updateData: any = {};
            
            // 결석 이벤트인 경우
            if (data.event_type === 'absence' && makeup.absence_calendar_event_id === params.id) {
              // 날짜를 YYYY-MM-DD 형식으로 추출
              const absenceDate = data.start_time.split('T')[0];
              updateData.absence_date = absenceDate;
              
              // 결석 사유 업데이트 (description에서 추출)
              if (data.description && data.description.includes('결석 사유:')) {
                const reason = data.description.split('결석 사유:')[1]?.trim();
                if (reason) {
                  // 한글을 영어 enum 값으로 변환
                  const reasonMap: { [key: string]: string } = {
                    '아픔': 'sick',
                    '여행': 'travel',
                    '행사': 'event',
                    '무단': 'unauthorized',
                    '기타': 'other'
                  };
                  updateData.absence_reason = reasonMap[reason] || 'other';
                }
              }
            }
            
            // 보강 이벤트인 경우
            if (data.event_type === 'makeup' && makeup.makeup_calendar_event_id === params.id) {
              // 날짜와 시간 추출
              const makeupDate = data.start_time.split('T')[0];
              const startTime = data.start_time.split('T')[1];
              const endTime = data.end_time.split('T')[1];
              
              updateData.makeup_date = makeupDate;
              updateData.start_time = startTime;
              updateData.end_time = endTime;
              
              // 내용 업데이트
              if (data.description) {
                updateData.content = data.description;
              }
            }
            
            // 보강 데이터 업데이트
            if (Object.keys(updateData).length > 0) {
              updateData.updated_at = new Date().toISOString();
              
              await supabase
                .from('makeup_classes')
                .update(updateData)
                .eq('id', makeup.id);
              
              console.log(`보강 데이터 동기화 완료: ${makeup.id}`);
            }
          }
        }
      } catch (syncError) {
        console.error('보강 데이터 동기화 실패:', syncError);
        // 동기화 실패해도 캘린더 이벤트 수정은 성공으로 처리
      }
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
    const supabase = await createServerClient()
    
    // 삭제하기 전에 이벤트 정보 가져오기
    const { data: eventToDelete } = await supabase
      .from('calendar_events')
      .select('*')
      // @ts-ignore - Supabase 타입 복잡성 해결을 위한 임시 처리
      .eq('id', params.id)
      .single()
    
    // 연결된 보강 데이터에서 캘린더 이벤트 ID 제거
    if (eventToDelete && (eventToDelete.event_type === 'absence' || eventToDelete.event_type === 'makeup')) {
      try {
        // 결석 이벤트 삭제인 경우
        if (eventToDelete.event_type === 'absence') {
          await supabase
            .from('makeup_classes')
            .update({ 
              absence_calendar_event_id: null,
              updated_at: new Date().toISOString()
            })
            .eq('absence_calendar_event_id', params.id);
        }
        
        // 보강 이벤트 삭제인 경우
        if (eventToDelete.event_type === 'makeup') {
          await supabase
            .from('makeup_classes')
            .update({ 
              makeup_calendar_event_id: null,
              updated_at: new Date().toISOString()
            })
            .eq('makeup_calendar_event_id', params.id);
        }
        
        console.log(`보강 데이터에서 캘린더 이벤트 연결 해제: ${params.id}`);
      } catch (syncError) {
        console.error('보강 데이터 동기화 실패:', syncError);
      }
    }
    
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