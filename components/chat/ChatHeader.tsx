"use client"
import { Button } from "@/components/ui/button"

export function ChatHeader({ onNewApp }: { onNewApp: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">에이전트</h1>
        <p className="text-muted-foreground">AI 챗봇/워크플로우와 대화할 수 있습니다.</p>
      </div>
      <Button onClick={onNewApp}>새로운 앱 연결</Button>
    </div>
  )
} 