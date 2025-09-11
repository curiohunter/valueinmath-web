"use client"

import { Card } from "@/components/ui/card"
import { Brain, BookOpen, TestTube, Users, AlertCircle } from "lucide-react"

const dataTypeConfig = {
  mathflat: { color: 'bg-blue-500', icon: Brain, label: '매쓰플랫' },
  study_log: { color: 'bg-green-500', icon: BookOpen, label: '학습일지' },
  test_log: { color: 'bg-purple-500', icon: TestTube, label: '시험기록' },
  makeup: { color: 'bg-orange-500', icon: Users, label: '보강수업' },
  consultation: { color: 'bg-red-500', icon: AlertCircle, label: '상담기록' }
}

export function TimelineLegend() {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-6">
        <span className="text-sm font-medium text-muted-foreground">데이터 유형:</span>
        {Object.entries(dataTypeConfig).map(([key, config]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${config.color}`} />
            <span className="text-sm">{config.label}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}