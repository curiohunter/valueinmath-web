import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // 환경변수에 Google Access Token이 있는지 확인
    const accessToken = process.env.GOOGLE_ACCESS_TOKEN
    const connected = !!accessToken
    
    return NextResponse.json({ 
      connected,
      message: connected ? 'Google Calendar 연동됨' : 'Google Calendar 미연동'
    })
  } catch (error) {
    console.error('Error checking connection status:', error)
    return NextResponse.json({ 
      connected: false,
      error: 'Failed to check connection status' 
    }, { status: 500 })
  }
}