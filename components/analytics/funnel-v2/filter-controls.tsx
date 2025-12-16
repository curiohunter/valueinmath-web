"use client"

import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { URGENCY_COLORS, ActionPriority } from "./types"

interface FilterControlsProps {
  // 단계 필터
  selectedStage: string
  onStageChange: (stage: string) => void
  stageCounts: Record<string, number>

  // 우선순위 필터
  selectedPriority: ActionPriority | 'all'
  onPriorityChange: (priority: ActionPriority | 'all') => void
  priorityCounts: {
    urgent: number
    high: number
    medium: number
    low: number
  }

  // 검색
  searchQuery: string
  onSearchChange: (query: string) => void
}

const FUNNEL_STAGES = [
  { value: 'all', label: '전체' },
  { value: '신규상담', label: '신규상담' },
  { value: '테스트예정', label: '테스트예정' },
  { value: '테스트완료', label: '테스트완료' },
  { value: '등록유도', label: '등록유도' },
]

const PRIORITY_OPTIONS: Array<{ value: ActionPriority | 'all'; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'urgent', label: '긴급' },
  { value: 'high', label: '높음' },
  { value: 'medium', label: '보통' },
  { value: 'low', label: '낮음' },
]

export function FilterControls({
  selectedStage,
  onStageChange,
  stageCounts,
  selectedPriority,
  onPriorityChange,
  priorityCounts,
  searchQuery,
  onSearchChange,
}: FilterControlsProps) {
  const totalCount = Object.values(stageCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-3 pb-3 border-b">
      {/* 상단: 단계 탭 */}
      <div className="flex flex-wrap gap-1.5">
        {FUNNEL_STAGES.map((stage) => {
          const count = stage.value === 'all'
            ? totalCount
            : stageCounts[stage.value] || 0
          const isActive = selectedStage === stage.value

          return (
            <button
              key={stage.value}
              onClick={() => onStageChange(stage.value)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {stage.label}
              <span className="ml-1 opacity-70">({count})</span>
            </button>
          )
        })}
      </div>

      {/* 하단: 우선순위 + 검색 */}
      <div className="flex gap-2">
        <Select value={selectedPriority} onValueChange={(v) => onPriorityChange(v as ActionPriority | 'all')}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="위험도" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((option) => {
              const count = option.value === 'all'
                ? Object.values(priorityCounts).reduce((a, b) => a + b, 0)
                : priorityCounts[option.value]
              const colors = option.value !== 'all' ? URGENCY_COLORS[option.value] : null

              return (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-1.5">
                    {colors && (
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: colors.dot }}
                      />
                    )}
                    <span>{option.label}</span>
                    <span className="text-muted-foreground">({count})</span>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>

        <Input
          placeholder="이름, 학교 검색..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 h-8 text-xs"
        />
      </div>

      {/* 우선순위 요약 배지 */}
      <div className="flex gap-1.5 flex-wrap">
        {(['urgent', 'high', 'medium', 'low'] as ActionPriority[]).map((priority) => {
          const count = priorityCounts[priority]
          const colors = URGENCY_COLORS[priority]
          if (count === 0) return null

          return (
            <Badge
              key={priority}
              variant="outline"
              className={cn(
                "text-xs cursor-pointer transition-opacity",
                colors.bg,
                colors.text,
                colors.border,
                selectedPriority === priority ? "ring-1 ring-offset-1" : "opacity-70 hover:opacity-100"
              )}
              onClick={() => onPriorityChange(selectedPriority === priority ? 'all' : priority)}
            >
              {colors.label}: {count}명
            </Badge>
          )
        })}
      </div>
    </div>
  )
}
