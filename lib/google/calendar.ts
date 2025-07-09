import { google } from 'googleapis'
import { oauth2Client } from './client'
import type { CalendarEvent } from '@/types/calendar'

// 카테고리별 Google Calendar 색상 ID 매핑
const EVENT_COLOR_MAP: Record<string, string> = {
  'notice': '11', // Red
  'work': '9', // Blue  
  'makeup': '10', // Green
  'absence': '5', // Yellow
  'entrance_test': '3', // Purple
  'new_consultation': '6', // Orange
  'new_enrollment': '8', // Gray
  'regular_consultation': '1', // Lavender
  'school_exam': '2', // Sage
  'last_minute_makeup': '7', // Turquoise
  'holiday': '8', // Gray
}

/**
 * KST 시간을 RFC3339 형식으로 변환 (시간대 유지)
 */
function convertToRFC3339(kstDateString: string): string {
  console.log('Original time from DB:', kstDateString)
  
  // DB에 저장된 시간을 KST로 가정하고 직접 파싱
  // 예: "2025-06-25T09:00:00" → "2025-06-25T09:00:00+09:00"
  if (kstDateString.includes('T')) {
    // 이미 ISO 형식인 경우
    const timeWithoutZ = kstDateString.replace('Z', '').replace(/\+\d{2}:\d{2}$/, '')
    const result = `${timeWithoutZ}+09:00`
    console.log('Converted to KST:', result)
    return result
  } else {
    // 다른 형식인 경우 Date 객체로 변환 후 KST 적용
    const date = new Date(kstDateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    
    const result = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`
    console.log('Converted to KST:', result)
    return result
  }
}

/**
 * CalendarEvent를 Google Calendar 이벤트 형식으로 변환
 */
function transformToGoogleEvent(event: Omit<CalendarEvent, 'id' | 'google_calendar_id' | 'created_by' | 'created_at' | 'updated_at'>) {
  return {
    summary: event.title,
    description: event.description || '',
    location: event.location || '',
    start: {
      dateTime: convertToRFC3339(event.start_time),
      timeZone: 'Asia/Seoul',
    },
    end: {
      dateTime: convertToRFC3339(event.end_time),
      timeZone: 'Asia/Seoul',
    },
    colorId: EVENT_COLOR_MAP[event.event_type || 'notice'] || '9',
  }
}

/**
 * 액세스 토큰 갱신
 */
export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_at: number }> {
  try {
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    })

    const { credentials } = await oauth2Client.refreshAccessToken()
    
    if (!credentials.access_token || !credentials.expiry_date) {
      throw new Error('Failed to refresh access token')
    }

    return {
      access_token: credentials.access_token,
      expires_at: credentials.expiry_date,
    }
  } catch (error) {
    console.error('Error refreshing access token:', error)
    throw new Error('토큰 갱신에 실패했습니다.')
  }
}

/**
 * Google Calendar에 이벤트 생성
 */
export async function createGoogleEvent(
  event: Omit<CalendarEvent, 'id' | 'google_calendar_id' | 'created_by' | 'created_at' | 'updated_at'>,
  accessToken: string
): Promise<string> {
  try {
    // OAuth 클라이언트에 액세스 토큰 설정
    oauth2Client.setCredentials({
      access_token: accessToken,
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const googleEvent = transformToGoogleEvent(event)

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      requestBody: googleEvent,
    })

    if (!response.data.id) {
      throw new Error('Google Calendar 이벤트 ID를 받지 못했습니다.')
    }

    return response.data.id
  } catch (error) {
    console.error('Error creating Google Calendar event:', error)
    
    // 토큰 만료 에러 처리
    if ((error as any)?.code === 401) {
      throw new Error('Google Calendar 인증이 만료되었습니다. 다시 로그인해주세요.')
    }
    
    throw new Error('Google Calendar 이벤트 생성에 실패했습니다.')
  }
}

/**
 * Google Calendar 이벤트 수정
 */
export async function updateGoogleEvent(
  googleEventId: string,
  event: Omit<CalendarEvent, 'id' | 'google_calendar_id' | 'created_by' | 'created_at' | 'updated_at'>,
  accessToken: string
): Promise<void> {
  try {
    oauth2Client.setCredentials({
      access_token: accessToken,
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const googleEvent = transformToGoogleEvent(event)

    await calendar.events.update({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId: googleEventId,
      requestBody: googleEvent,
    })
  } catch (error) {
    console.error('Error updating Google Calendar event:', error)
    
    if ((error as any)?.code === 401) {
      throw new Error('Google Calendar 인증이 만료되었습니다. 다시 로그인해주세요.')
    }
    
    if ((error as any)?.code === 404) {
      throw new Error('Google Calendar에서 해당 이벤트를 찾을 수 없습니다.')
    }
    
    throw new Error('Google Calendar 이벤트 수정에 실패했습니다.')
  }
}

/**
 * Google Calendar 이벤트 삭제
 */
export async function deleteGoogleEvent(
  googleEventId: string,
  accessToken: string
): Promise<void> {
  try {
    oauth2Client.setCredentials({
      access_token: accessToken,
    })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    await calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId: googleEventId,
    })
  } catch (error) {
    console.error('Error deleting Google Calendar event:', error)
    
    if ((error as any)?.code === 401) {
      throw new Error('Google Calendar 인증이 만료되었습니다. 다시 로그인해주세요.')
    }
    
    if ((error as any)?.code === 404 || (error as any)?.code === 410) {
      console.warn('Google Calendar에서 이벤트를 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.')
      return // 404, 410은 에러로 처리하지 않음 (이미 삭제된 경우)
    }
    
    throw new Error('Google Calendar 이벤트 삭제에 실패했습니다.')
  }
}