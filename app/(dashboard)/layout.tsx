"use client"
import type React from "react"
import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { DashboardContent } from "@/components/layout/dashboard-content"
import MultiChat from "@/components/MultiChat"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useUser } from "@supabase/auth-helpers-react"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false)
  const user = useUser()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onAgentClick={() => setChatOpen(true)} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <DashboardContent>{children}</DashboardContent>
      </div>
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col">
          <MultiChat user={user} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
