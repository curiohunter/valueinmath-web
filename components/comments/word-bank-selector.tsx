"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import type { CommentProtocol, SelectedPhrases, GradeBand, ProtocolCategory } from "@/types/comment-assistant"

// 카테고리별 한국어 라벨 및 표시 순서
// progress_status 삭제됨 - 선생님이 직접 상세 작성
const CATEGORY_CONFIG: Record<string, { label: string; order: number }> = {
  greeting: { label: "인사말", order: 1 },
  progress_level: { label: "진도 - 과정", order: 2 },
  progress_semester: { label: "진도 - 학기", order: 3 },
  progress_stage: { label: "진도 - 단계", order: 4 },
  attitude_positive: { label: "학습 태도 (긍정)", order: 5 },
  attitude_needs_improvement: { label: "학습 태도 (개선)", order: 6 },
  attendance_issue: { label: "출결 이슈", order: 7 },
  homework_issue: { label: "과제 이슈", order: 8 },
  methodology: { label: "학습 방법", order: 9 },
  achievement: { label: "발전 사항", order: 10 },
  future_plan_period: { label: "향후 계획 - 시기", order: 11 },
  future_plan_activity: { label: "향후 계획 - 활동", order: 12 },
  closing: { label: "마무리", order: 13 },
}

// API 카테고리 → SelectedPhrases 키 매핑
// progress_status 삭제됨 - 선생님이 직접 상세 작성
const CATEGORY_TO_PHRASES_KEY: Record<string, keyof SelectedPhrases> = {
  greeting: "greeting",
  progress_level: "progress",
  progress_semester: "progress",
  progress_stage: "progress",
  attitude_positive: "attitude_positive",
  attitude_needs_improvement: "attitude_needs_improvement",
  attendance_issue: "attendance_issue",
  homework_issue: "homework_issue",
  methodology: "methodology",
  achievement: "achievement",
  future_plan_period: "future_plan",
  future_plan_activity: "future_plan",
  closing: "closing",
}

interface WordBankSelectorProps {
  selectedPhrases: SelectedPhrases
  onPhrasesChange: (phrases: SelectedPhrases) => void
  gradeBand?: GradeBand
}

export function WordBankSelector({
  selectedPhrases,
  onPhrasesChange,
  gradeBand = "all",
}: WordBankSelectorProps) {
  const [protocols, setProtocols] = useState<CommentProtocol[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(["greeting"]))

  // 프로토콜 로드
  useEffect(() => {
    const fetchProtocols = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        if (gradeBand && gradeBand !== "all") {
          params.set("grade_band", gradeBand)
        }

        const response = await fetch(`/api/comment-protocols?${params}`)
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || "프로토콜 로드 실패")
        }

        setProtocols(result.data.protocols)
      } catch (err) {
        setError(err instanceof Error ? err.message : "프로토콜 로드 실패")
      } finally {
        setIsLoading(false)
      }
    }

    fetchProtocols()
  }, [gradeBand])

  // 카테고리별 그룹핑 및 정렬
  const groupedProtocols = useMemo(() => {
    const groups: Record<string, CommentProtocol[]> = {}

    protocols.forEach((protocol) => {
      const cat = protocol.category
      if (!groups[cat]) {
        groups[cat] = []
      }
      groups[cat].push(protocol)
    })

    // 카테고리 순서대로 정렬
    const sortedCategories = Object.keys(groups).sort((a, b) => {
      const orderA = CATEGORY_CONFIG[a]?.order ?? 99
      const orderB = CATEGORY_CONFIG[b]?.order ?? 99
      return orderA - orderB
    })

    return sortedCategories.map((cat) => ({
      category: cat,
      label: CATEGORY_CONFIG[cat]?.label ?? cat,
      protocols: groups[cat],
    }))
  }, [protocols])

  // 문구 선택/해제 토글
  const togglePhrase = (category: string, phrase: string) => {
    const phrasesKey = CATEGORY_TO_PHRASES_KEY[category]
    if (!phrasesKey) return

    const currentPhrases = [...selectedPhrases[phrasesKey]]
    const index = currentPhrases.indexOf(phrase)

    if (index > -1) {
      currentPhrases.splice(index, 1)
    } else {
      currentPhrases.push(phrase)
    }

    onPhrasesChange({
      ...selectedPhrases,
      [phrasesKey]: currentPhrases,
    })
  }

  // 문구가 선택되어 있는지 확인
  const isPhraseSelected = (category: string, phrase: string): boolean => {
    const phrasesKey = CATEGORY_TO_PHRASES_KEY[category]
    if (!phrasesKey) return false
    return selectedPhrases[phrasesKey].includes(phrase)
  }

  // 카테고리 토글
  const toggleCategory = (category: string) => {
    const newOpen = new Set(openCategories)
    if (newOpen.has(category)) {
      newOpen.delete(category)
    } else {
      newOpen.add(category)
    }
    setOpenCategories(newOpen)
  }

  // 선택된 총 개수
  const totalSelected = Object.values(selectedPhrases).reduce(
    (sum, arr) => sum + arr.length,
    0
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">키워드 로딩 중...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        <p className="text-sm">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => window.location.reload()}
        >
          다시 시도
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* 선택 카운터 */}
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
        <span>키워드 선택 (클릭하여 선택/해제)</span>
        <Badge variant="secondary">
          {totalSelected}개 선택됨
        </Badge>
      </div>

      {/* 카테고리별 Collapsible */}
      {groupedProtocols.map(({ category, label, protocols: catProtocols }) => (
        <Collapsible
          key={category}
          open={openCategories.has(category)}
          onOpenChange={() => toggleCategory(category)}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between px-3 py-2 h-auto"
            >
              <span className="font-medium text-sm">{label}</span>
              <div className="flex items-center gap-2">
                {selectedPhrases[CATEGORY_TO_PHRASES_KEY[category] || "greeting"]?.some(
                  (p) => catProtocols.some((cp) => cp.phrase === p)
                ) && (
                  <Badge variant="default" className="text-[10px] h-5">
                    선택됨
                  </Badge>
                )}
                {openCategories.has(category) ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="px-3 pb-2">
            <div className="flex flex-wrap gap-2 pt-2">
              {catProtocols.map((protocol) => {
                const isSelected = isPhraseSelected(category, protocol.phrase)
                return (
                  <Badge
                    key={protocol.id}
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer transition-all text-xs py-1 px-2 ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    } ${
                      protocol.severity === "negative"
                        ? "border-orange-300"
                        : protocol.severity === "positive"
                        ? "border-green-300"
                        : ""
                    }`}
                    onClick={() => togglePhrase(category, protocol.phrase)}
                  >
                    {protocol.phrase}
                  </Badge>
                )
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  )
}
