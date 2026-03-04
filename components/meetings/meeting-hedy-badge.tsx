"use client"

import { Badge } from "@/components/ui/badge"
import { Bot } from "lucide-react"

interface MeetingHedyBadgeProps {
  className?: string
}

export function MeetingHedyBadge({ className }: MeetingHedyBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`gap-1 border-purple-300 bg-purple-50 text-purple-700 text-[10px] font-medium ${className || ""}`}
    >
      <Bot className="h-3 w-3" />
      Hedy AI
    </Badge>
  )
}
