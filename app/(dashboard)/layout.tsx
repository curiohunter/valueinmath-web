"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { DashboardContent } from "@/components/layout/dashboard-content"
import dynamic from "next/dynamic"
import { useAuth } from "@/providers/auth-provider"
import { useRouter } from "next/navigation"

// Dynamic import to avoid SSR issues
const GlobalWorkspacePanel = dynamic(
  () => import("@/components/workspace/GlobalWorkspacePanel"),
  { ssr: false }
)

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const { user, loading } = useAuth()
  const router = useRouter()

  // Prevent hydration mismatch by only rendering after mount
  const [mounted, setMounted] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect students/parents to portal
  useEffect(() => {
    if (!loading && mounted && user?.profile?.role && (user.profile.role === 'student' || user.profile.role === 'parent')) {
      setRedirecting(true)
      router.replace('/portal')
    }
  }, [loading, mounted, user, router])

  if (!mounted || loading || redirecting) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex overflow-hidden">
      <Sidebar />
      <div className={`flex flex-col flex-1 overflow-hidden transition-all duration-300 ${workspaceOpen ? 'mr-80' : ''}`}>
        <Header
          setWorkspaceOpen={setWorkspaceOpen}
          workspaceOpen={workspaceOpen}
        />
        <DashboardContent>{children}</DashboardContent>
      </div>

      {/* 고정 사이드 업무공간 패널 */}
      {user && workspaceOpen && (
        <GlobalWorkspacePanel
          user={user}
          isOpen={workspaceOpen}
          onClose={() => setWorkspaceOpen(false)}
        />
      )}
    </div>
  )
}