"use client";
import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User } from "@supabase/supabase-js";

interface GlobalChatButtonProps {
  user?: User | null;
  asHeaderIcon?: boolean;
  onClick?: () => void;
  chatOpen?: boolean;
  setChatOpen?: (open: boolean) => void;
  chatMinimized?: boolean;
  setChatMinimized?: (minimized: boolean) => void;
}

export default function GlobalChatButton({ user, asHeaderIcon, onClick, chatOpen, setChatOpen, chatMinimized, setChatMinimized }: GlobalChatButtonProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  if (asHeaderIcon) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-full hover:bg-gray-100 transition-colors relative"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!user) {
            alert('로그인이 필요합니다.');
            return;
          }
          // asHeaderIcon 모드에서는 onClick prop을 우선적으로 사용
          if (onClick) {
            onClick()
          } else if (setChatOpen) {
            setChatOpen(true)
          }
        }}
        aria-label="채팅 열기"
      >
        <MessageCircle className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </Button>
    );
  }

  // 플로팅 버튼 (현재는 사용하지 않음)
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={() => setChatOpen ? setChatOpen(true) : null}
        size="lg"
        className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-blue-600 hover:bg-blue-700 relative"
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>
    </div>
  );
}