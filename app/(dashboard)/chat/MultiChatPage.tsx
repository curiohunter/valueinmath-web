"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import MultiChat from "@/components/MultiChat"
import { ChatHeader } from "@/components/chat/ChatHeader"
import { User } from "@supabase/supabase-js"

export default function MultiChatPage({ user }: { user: User | null }) {
  const [openNewApp, setOpenNewApp] = useState(false)
  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold tracking-tight">에이전트</h1>
        <p className="text-muted-foreground">AI 챗봇/워크플로우와 대화할 수 있습니다.</p>
      </div>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <MultiChat openNewApp={openNewApp} setOpenNewApp={setOpenNewApp} user={user} />
        </CardContent>
      </Card>
    </div>
  )
} 