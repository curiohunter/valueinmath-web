"use client"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Bot, AlertCircle, User, Smile, TrendingUp } from "lucide-react"
import { AI_TAG_LABELS, AI_TAG_COLORS, AI_TAG_DESCRIPTIONS } from "@/services/consultation-ai-service"

interface ConsultationAITagsProps {
  hurdle?: string | null
  readiness?: string | null
  decisionMaker?: string | null
  sentiment?: string | null
  analyzedAt?: string | null
  compact?: boolean // 컴팩트 모드 (아이콘만 표시)
}

export function ConsultationAITags({
  hurdle,
  readiness,
  decisionMaker,
  sentiment,
  analyzedAt,
  compact = false,
}: ConsultationAITagsProps) {
  // AI 분석이 아직 안됐으면 아무것도 표시하지 않음
  if (!analyzedAt) {
    return null
  }

  const tags = [
    {
      key: 'hurdle',
      value: hurdle,
      icon: AlertCircle,
      label: '장애요인',
      labels: AI_TAG_LABELS.hurdle,
      colors: AI_TAG_COLORS.hurdle,
      descriptions: AI_TAG_DESCRIPTIONS.hurdle,
    },
    {
      key: 'readiness',
      value: readiness,
      icon: TrendingUp,
      label: '등록 준비도',
      labels: AI_TAG_LABELS.readiness,
      colors: AI_TAG_COLORS.readiness,
      descriptions: AI_TAG_DESCRIPTIONS.readiness,
    },
    {
      key: 'decision_maker',
      value: decisionMaker,
      icon: User,
      label: '의사결정자',
      labels: AI_TAG_LABELS.decision_maker,
      colors: AI_TAG_COLORS.decision_maker,
      descriptions: AI_TAG_DESCRIPTIONS.decision_maker,
    },
    {
      key: 'sentiment',
      value: sentiment,
      icon: Smile,
      label: '상담 분위기',
      labels: AI_TAG_LABELS.sentiment,
      colors: AI_TAG_COLORS.sentiment,
      descriptions: AI_TAG_DESCRIPTIONS.sentiment,
    },
  ]

  // 유효한 태그만 필터링
  const validTags = tags.filter(tag => tag.value && tag.value !== 'none')

  if (validTags.length === 0) {
    return null
  }

  if (compact) {
    // 컴팩트 모드: 툴팁으로 상세 표시
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-0.5">
              {validTags.map(tag => {
                const Icon = tag.icon
                const colorClass = tag.colors[tag.value as keyof typeof tag.colors] || 'bg-gray-100 text-gray-700'
                return (
                  <span
                    key={tag.key}
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs ${colorClass}`}
                  >
                    <Icon className="w-3 h-3" />
                  </span>
                )
              })}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-sm p-3">
            <div className="space-y-2 text-xs">
              <div className="font-semibold flex items-center gap-1 text-primary border-b pb-1">
                <Bot className="w-3.5 h-3.5" /> AI 상담 분석
              </div>
              {validTags.map(tag => (
                <div key={tag.key} className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <tag.icon className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{tag.label}:</span>
                    <span className="font-medium">
                      {tag.labels[tag.value as keyof typeof tag.labels]}
                    </span>
                  </div>
                  <div className="text-muted-foreground pl-5 text-[10px]">
                    {tag.descriptions[tag.value as keyof typeof tag.descriptions]}
                  </div>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // 일반 모드: 뱃지로 표시
  return (
    <div className="flex flex-wrap gap-1">
      {validTags.map(tag => {
        const colorClass = tag.colors[tag.value as keyof typeof tag.colors] || 'bg-gray-100 text-gray-700'
        const label = tag.labels[tag.value as keyof typeof tag.labels]
        const description = tag.descriptions[tag.value as keyof typeof tag.descriptions]
        return (
          <TooltipProvider key={tag.key}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={`text-xs px-1.5 py-0 ${colorClass} border-0 cursor-help`}>
                  {label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="text-xs space-y-1">
                  <div className="font-medium flex items-center gap-1">
                    <tag.icon className="w-3 h-3" />
                    {tag.label}
                  </div>
                  <div className="text-muted-foreground">{description}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      })}
    </div>
  )
}
