'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { Calendar, CheckCircle, XCircle, ExternalLink } from 'lucide-react'

export default function GoogleCalendarSettings() {
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(false)

  // 연동 상태 확인
  useEffect(() => {
    checkConnectionStatus()
  }, [])

  const checkConnectionStatus = async () => {
    try {
      // 환경변수에 토큰이 있는지 확인하는 API 호출
      const response = await fetch('/api/calendar/connection-status')
      if (response.ok) {
        const data = await response.json()
        setIsConnected(data.connected)
      }
    } catch (error) {
      console.error('Failed to check connection status:', error)
    }
  }

  const handleConnect = async () => {
    try {
      setLoading(true)
      
      // Google OAuth URL 생성
      const response = await fetch('/api/auth/google-url')
      if (!response.ok) {
        throw new Error('Failed to generate auth URL')
      }
      
      const data = await response.json()
      
      // 새 탭에서 Google 인증 페이지 열기
      window.open(data.authUrl, '_blank', 'width=500,height=600')
      
      toast.info('Google 인증 페이지가 열렸습니다. 인증을 완료한 후 콘솔에서 토큰을 확인하세요.')
    } catch (error) {
      console.error('Failed to start OAuth flow:', error)
      toast.error('Google 연동 시작에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      setLoading(true)
      
      // 연동 해제는 환경변수를 수동으로 제거해야 함
      toast.info('연동 해제는 .env.local에서 GOOGLE_ACCESS_TOKEN을 삭제하고 서버를 재시작하세요.')
      
    } catch (error) {
      console.error('Failed to disconnect:', error)
      toast.error('연동 해제에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* 연동 상태 표시 */}
      <div className="p-3 min-w-[200px]">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4" />
          <span className="font-medium">Google Calendar</span>
        </div>
        
        <div className="flex items-center gap-2 mb-3">
          {isConnected ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                연동됨
              </Badge>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-gray-400" />
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                미연동
              </Badge>
            </>
          )}
        </div>
        
        {/* 연동/해제 버튼 */}
        {isConnected ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            disabled={loading}
            className="w-full"
          >
            연동 해제
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleConnect}
            disabled={loading}
            className="w-full"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Google 연동
          </Button>
        )}
        
        {!isConnected && (
          <p className="text-xs text-muted-foreground mt-2">
            연동 후 이벤트가 Google Calendar에 자동 동기화됩니다.
          </p>
        )}
      </div>
    </>
  )
}