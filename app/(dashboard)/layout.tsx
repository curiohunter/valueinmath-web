"use client"
import type React from "react"
import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { DashboardContent } from "@/components/layout/dashboard-content"
import GlobalChatInterface from "@/components/chat/GlobalChatInterface"
import { useUser } from "@supabase/auth-helpers-react"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false)
  const user = useUser()
  const [localUser, setLocalUser] = useState<any>(null)
  
  // Header와 동일한 방식으로 user 로드
  useEffect(() => {
    (async () => {
      const { getCurrentUser } = await import('@/actions/auth-actions')
      const { user } = await getCurrentUser()
      console.log('DashboardLayout: getCurrentUser 결과:', user)
      setLocalUser(user)
    })()
  }, [])
  
  // 사용할 user 결정 (localUser 우선, 없으면 useUser 결과)
  const currentUser = localUser || user
  
  console.log('DashboardLayout: chatOpen state:', chatOpen)
  console.log('DashboardLayout: useUser():', user)
  console.log('DashboardLayout: localUser:', localUser)
  console.log('DashboardLayout: currentUser:', currentUser)
  
  // chatOpen 상태 변화 추적
  useEffect(() => {
    console.log('DashboardLayout: chatOpen 상태 변경됨:', chatOpen)
  }, [chatOpen])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onAgentClick={() => setChatOpen(true)} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header setChatOpen={(open) => {
          console.log('DashboardLayout: setChatOpen 호출됨:', open)
          setChatOpen(open)
        }} />
        <DashboardContent>{children}</DashboardContent>
      </div>
      {/* Drawer 대신 일반 div 사용 - 다른 페이지와 동시 작업 가능 */}
      {chatOpen && (
        <div className="fixed right-0 top-0 h-full w-96 rounded-l-lg border-l shadow-lg bg-white z-40">
          <div className="h-full flex flex-col">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-lg">전체 채팅</h3>
              <button 
                onClick={() => setChatOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {currentUser ? (
                <GlobalChatInterface user={currentUser} />
              ) : (
                <div className="p-4 text-center text-gray-500">
                  <p>사용자 정보를 불러오는 중...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}