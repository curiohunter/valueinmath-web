"use client"

import { useState, useEffect, useRef } from "react"
import { X, Send, Bot, User, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/types/database"

interface Message {
  id: string
  content: string
  message_type: string
  created_at: string
  user_id: string | null
  user_name?: string
}

interface GlobalChatPanelProps {
  user?: any
  isOpen: boolean
  onClose: () => void
}

export default function GlobalChatPanel({ user, isOpen, onClose }: GlobalChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClientComponentClient<Database>()

  // 메시지 로드
  useEffect(() => {
    if (isOpen) {
      loadMessages()
    }
  }, [isOpen])

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadMessages = async () => {
    try {
      // RPC 함수를 사용해서 JOIN된 데이터 가져오기
      const { data: messagesData, error } = await supabase
        .rpc('get_global_messages_with_names')

      if (error) {
        console.error("RPC error:", error)
        throw error
      }

      // RPC 결과를 Message 타입으로 변환
      const messages: Message[] = (messagesData || []).map(msg => ({
        id: msg.id,
        content: msg.content,
        message_type: msg.message_type,
        created_at: msg.created_at,
        user_id: msg.user_id,
        user_name: msg.user_name || undefined
      }))

      setMessages(messages)
    } catch (error) {
      console.error("메시지 로드 실패:", error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !user?.id) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from("global_messages")
        .insert({
          content: newMessage.trim(),
          message_type: "user",
          user_id: user.id
        })

      if (error) throw error

      setNewMessage("")
      await loadMessages()
      
      // 메시지 전송 후 입력창에 포커스 유지
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    } catch (error) {
      console.error("메시지 전송 실패:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white border-l shadow-lg z-50 flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <h3 className="text-lg font-semibold">전체 채팅</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* 메시지 영역 */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.map((message, index) => {
            const isMyMessage = message.user_id === user?.id
            const prevMessage = messages[index - 1]
            const showAvatar = !prevMessage || prevMessage.user_id !== message.user_id
            const showName = showAvatar && !isMyMessage
            
            return (
              <div key={message.id} className={`flex gap-2 ${isMyMessage ? "flex-row-reverse" : "flex-row"}`}>
                {/* 아바타 */}
                {!isMyMessage && (
                  <div className={`w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 ${showAvatar ? "visible" : "invisible"}`}>
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
                
                <div className={`flex flex-col max-w-[70%] ${isMyMessage ? "items-end" : "items-start"}`}>
                  {/* 이름 표시 (다른 사람 메시지는 항상, 내 메시지는 "나"로 표시) */}
                  <p className="text-xs text-gray-500 mb-1 px-2">
                    {isMyMessage ? "나" : (message.user_name || "알 수 없음")}
                  </p>
                  
                  {/* 메시지 말풍선 */}
                  <div
                    className={`px-3 py-2 rounded-2xl ${
                      isMyMessage
                        ? "bg-blue-500 text-white rounded-br-md"
                        : "bg-gray-100 text-gray-900 rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                  
                  {/* 시간 (모든 메시지에 표시) */}
                  <p className={`text-xs text-gray-400 mt-1 px-2 ${isMyMessage ? "text-right" : "text-left"}`}>
                    {new Date(message.created_at).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* 입력 영역 */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요..."
            disabled={isLoading}
            autoFocus
          />
          <Button 
            onClick={sendMessage} 
            disabled={isLoading || !newMessage.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}