"use client"

import { useState, useEffect } from "react"
import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/database"

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
  user,
  asHeaderIcon = false,
  chatOpen,
  setChatOpen,
  chatMinimized,
  setChatMinimized,
  onClick 
}: GlobalChatButtonProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClientComponentClient<Database>()

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
        console.error("Error fetching unread count:", error)
      }
    }

    fetchUnreadCount()

    // 실시간 구독
    const channel = supabase
      .channel('global-messages-button')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'global_messages' 
        }, 
        (payload) => {
          // 새 메시지가 내 것이 아니면 카운트 증가
          if (payload.new.user_id !== user.id) {
            fetchUnreadCount()
          }
        }
      )
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_read_status'
        },
        () => {
          // 읽음 상태가 변경되면 카운트 다시 가져오기
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

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