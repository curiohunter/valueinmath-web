"use client"

import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

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
        {/* 읽지 않은 메시지가 있다면 뱃지 표시 */}
        {/* <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
        >
          3
        </Badge> */}
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
    </Button>
  )
}