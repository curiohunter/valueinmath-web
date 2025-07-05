"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { DashboardContent } from "@/components/layout/dashboard-content"
import GlobalChatButton from "@/components/chat/GlobalChatButton"
import GlobalChatPanel from "@/components/chat/GlobalChatPanel"
import { useAuth } from "@/providers/auth-provider"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMinimized, setChatMinimized] = useState(false)
  const { user, loading } = useAuth()

  // Prevent hydration mismatch by only rendering after mount
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ${chatOpen && !chatMinimized ? 'mr-80' : ''}`}>
        <Header 
          setChatOpen={setChatOpen} 
          chatOpen={chatOpen}
          chatMinimized={chatMinimized}
          setChatMinimized={setChatMinimized}
        />
        <DashboardContent>{children}</DashboardContent>
      </div>
      
      {/* 고정 사이드 채팅 패널 */}
      {user && chatOpen && (
        <GlobalChatPanel 
          user={user} 
          isOpen={chatOpen} 
          onClose={() => setChatOpen(false)} 
        />
      )}
    </div>
  )
}