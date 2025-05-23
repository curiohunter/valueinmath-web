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
      <ChatHeader onNewApp={() => setOpenNewApp(true)} />
      <Card className="overflow-hidden">
        <CardHeader className="bg-background">
          <CardTitle>대화</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <MultiChat openNewApp={openNewApp} setOpenNewApp={setOpenNewApp} user={user} />
        </CardContent>
      </Card>
    </div>
  )
} 