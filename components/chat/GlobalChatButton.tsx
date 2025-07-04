"use client"

import { useState, useEffect } from "react"
import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/database"
import { useAuth } from "@/contexts/AuthContext"

interface GlobalChatButtonProps {
  user?: any
  asHeaderIcon?: boolean
  chatOpen?: boolean
  setChatOpen?: (open: boolean) => void
  chatMinimized?: boolean
  setChatMinimized?: (minimized: boolean) => void
  onClick?: () => void
}

export default function GlobalChatButton({ 
  user: propUser,
  asHeaderIcon = false,
  chatOpen,
  setChatOpen,
  chatMinimized,
  setChatMinimized,
  onClick 
}: GlobalChatButtonProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClientComponentClient<Database>()
  const { user: contextUser } = useAuth()
  const user = propUser || contextUser

  // 읽지 않은 메시지 수 가져오기
  useEffect(() => {
    if (!user) return

    async function fetchUnreadCount() {
      try {
        const { data, error } = await supabase
          .rpc('get_unread_message_count')
        
        if (error) throw error
        setUnreadCount(data || 0)
      } catch (error) {
        console.error('[GlobalChatButton] Error fetching unread count:', error)
      }
    }

    fetchUnreadCount()

    // 실시간 구독 설정
    let retryCount = 0
    let retryTimeout: NodeJS.Timeout | null = null
    let channel: any = null
    let isCleanedUp = false

    const setupChannel = () => {
      if (isCleanedUp) return // 컴포넌트가 언마운트된 경우 중단
      
      // 기존 채널이 있으면 제거
      if (channel) {
        supabase.removeChannel(channel)
        channel = null
      }
      
      channel = supabase
        .channel(`global-messages-button-${user.id}`) // 사용자별 고정 채널명
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'global_messages' 
          }, 
          (payload) => {
            // 새 메시지가 내 것이 아니고 채팅창이 닫혀있으면 카운트 증가
            if (payload.new.user_id !== user.id && !chatOpen) {
              setUnreadCount(prev => prev + 1)
            }
          }
        )
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'message_read_status'
          },
          (payload) => {
            // 읽음 상태가 변경되면 카운트 다시 가져오기
            fetchUnreadCount()
          }
        )
        .subscribe((status, error) => {
          if (status === 'SUBSCRIBED') {
            retryCount = 0 // 성공 시 재시도 카운트 초기화
            // 기존 타임아웃 취소
            if (retryTimeout) {
              clearTimeout(retryTimeout)
              retryTimeout = null
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`[GlobalChatButton] ${status}:`, error)
            // 재시도 로직 (최대 3번)
            if (retryCount < 3 && !isCleanedUp) {
              retryCount++
              // 지수 백오프: 10초, 20초, 40초 (기존보다 5배 증가)
              const delay = Math.min(10000 * Math.pow(2, retryCount - 1), 40000)
              console.log(`[GlobalChatButton] Retrying in ${delay}ms (attempt ${retryCount}/3)...`)
              
              retryTimeout = setTimeout(() => {
                if (!isCleanedUp) {
                  setupChannel()
                }
              }, delay)
            } else if (retryCount >= 3) {
              console.error('[GlobalChatButton] Max retries reached. Stopping reconnection attempts.')
            }
          }
        })
    }

    setupChannel()

    return () => {
      isCleanedUp = true
      if (retryTimeout) {
        clearTimeout(retryTimeout)
      }
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [user, chatOpen])

  // 채팅 열 때 카운트 초기화
  useEffect(() => {
    if (chatOpen) {
      setUnreadCount(0)
    }
  }, [chatOpen])
  const handleClick = () => {
    if (onClick) {
      onClick()
    } else if (setChatOpen) {
      setChatOpen(!chatOpen)
    }
  }

  if (asHeaderIcon) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-full hover:bg-gray-100 transition-colors relative"
        onClick={handleClick}
      >
        <MessageCircle className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 min-w-[18px] h-4 flex items-center justify-center text-xs p-0 px-1"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>
    )
  }

  return (
    <Button
      onClick={handleClick}
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow z-40"
      size="icon"
    >
      <MessageCircle className="h-6 w-6" />
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center text-xs p-0 px-1"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  )
}