"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { RefreshCw, AlertTriangle, Sparkles, Copy, Check } from "lucide-react"
import { toast } from "sonner"
import {
  StudentFollowup,
  AISuggestion,
  AISuggestionCache,
  CHANNEL_ICONS,
  getCacheKey,
  getStudentContextHash,
  isCacheValid,
  isCacheStale,
} from "./types"

interface AISuggestionCardProps {
  student: StudentFollowup | null
}

type SuggestionState = 'idle' | 'loading' | 'success' | 'stale' | 'error'

export function AISuggestionCard({ student }: AISuggestionCardProps) {
  const [state, setState] = useState<SuggestionState>('idle')
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isScriptModalOpen, setIsScriptModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const prevStudentIdRef = useRef<string | null>(null)

  // 캐시에서 불러오기
  const loadFromCache = useCallback((studentId: string): AISuggestionCache | null => {
    try {
      const cached = localStorage.getItem(getCacheKey(studentId))
      if (cached) {
        return JSON.parse(cached) as AISuggestionCache
      }
    } catch {
      // 캐시 파싱 실패 무시
    }
    return null
  }, [])

  // 캐시에 저장
  const saveToCache = useCallback((studentId: string, data: AISuggestion, contextHash: string) => {
    try {
      const cache: AISuggestionCache = {
        suggestion: data,
        cachedAt: Date.now(),
        studentContext: contextHash,
      }
      localStorage.setItem(getCacheKey(studentId), JSON.stringify(cache))
    } catch {
      // 캐시 저장 실패 무시
    }
  }, [])

  // 캐시 무효화
  const invalidateCache = useCallback((studentId: string) => {
    try {
      localStorage.removeItem(getCacheKey(studentId))
    } catch {
      // 무시
    }
  }, [])

  // AI 제안 가져오기
  const fetchSuggestion = useCallback(async (forceRefresh = false) => {
    if (!student) return

    const contextHash = getStudentContextHash(student)

    // 캐시 확인 (강제 새로고침이 아닌 경우)
    if (!forceRefresh) {
      const cached = loadFromCache(student.id)
      if (cached) {
        // 컨텍스트가 변경되었으면 캐시 무효화
        if (cached.studentContext !== contextHash) {
          invalidateCache(student.id)
        } else if (isCacheValid(cached)) {
          // 유효한 캐시
          setSuggestion(cached.suggestion)
          setState('success')
          return
        } else if (isCacheStale(cached)) {
          // 만료된 캐시 (표시는 하되 stale 상태)
          setSuggestion(cached.suggestion)
          setState('stale')
          return
        }
      }
    }

    setState('loading')
    setError(null)

    try {
      const response = await fetch('/api/funnel/ai-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          context: {
            name: student.name,
            funnelStage: student.funnel_stage,
            daysSinceLastContact: student.days_since_last_contact,
            aiHurdle: student.ai_hurdle,
            aiReadiness: student.ai_readiness,
            aiDecisionMaker: student.ai_decision_maker,
            aiSentiment: student.ai_sentiment,
            lastConsultationType: '', // TODO: 타임라인에서 가져오기
            totalConsultations: student.total_consultations,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('AI 제안 생성에 실패했습니다')
      }

      const data = await response.json()
      if (data.success && data.suggestion) {
        setSuggestion(data.suggestion)
        saveToCache(student.id, data.suggestion, contextHash)
        setState('success')
      } else {
        throw new Error(data.error || 'AI 제안 생성에 실패했습니다')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
      setState('error')
    }
  }, [student, loadFromCache, saveToCache, invalidateCache])

  // 학생 변경 시 캐시만 확인 (자동 API 호출 안함)
  useEffect(() => {
    if (!student) {
      setSuggestion(null)
      setState('idle')
      prevStudentIdRef.current = null
      return
    }

    // 학생이 변경되면 상태 초기화하고 캐시만 확인
    if (prevStudentIdRef.current !== student.id) {
      prevStudentIdRef.current = student.id

      const contextHash = getStudentContextHash(student)
      const cached = loadFromCache(student.id)

      if (cached) {
        // 컨텍스트가 변경되었으면 캐시 무효화
        if (cached.studentContext !== contextHash) {
          invalidateCache(student.id)
          setSuggestion(null)
          setState('idle')
        } else if (isCacheValid(cached)) {
          // 유효한 캐시
          setSuggestion(cached.suggestion)
          setState('success')
        } else if (isCacheStale(cached)) {
          // 만료된 캐시 (표시는 하되 stale 상태)
          setSuggestion(cached.suggestion)
          setState('stale')
        } else {
          setSuggestion(null)
          setState('idle')
        }
      } else {
        // 캐시 없음 - idle 상태로 버튼 표시
        setSuggestion(null)
        setState('idle')
      }
    }
  }, [student, loadFromCache, invalidateCache])

  // 스크립트 복사
  const handleCopyScript = async () => {
    if (!suggestion?.script) return
    try {
      await navigator.clipboard.writeText(suggestion.script)
      setCopied(true)
      toast.success('스크립트가 복사되었습니다')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('복사에 실패했습니다')
    }
  }

  // 학생이 선택되지 않은 경우
  if (!student) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
          <p className="text-sm">학생을 선택하면 AI 제안이 표시됩니다</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            AI 제안
          </CardTitle>
          {(state === 'stale' || state === 'success') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchSuggestion(true)}
              disabled={state === 'loading'}
              className="h-7 px-2"
              title="AI 제안 새로고침"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {/* idle 상태 - AI 제안 생성 버튼 */}
          {state === 'idle' && (
            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                AI가 이 학생에게 최적의 팔로업 전략을 제안합니다
              </p>
              <Button
                onClick={() => fetchSuggestion(false)}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                AI 제안 생성
              </Button>
            </div>
          )}

          {/* 로딩 상태 */}
          {state === 'loading' && (
            <div className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {/* Stale 경고 */}
          {state === 'stale' && (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-2 py-1.5 rounded">
              <AlertTriangle className="h-3.5 w-3.5" />
              1시간 전 제안입니다. 새로고침을 권장합니다.
            </div>
          )}

          {/* 에러 상태 */}
          {state === 'error' && (
            <div className="flex flex-col items-center justify-center py-4 space-y-2">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchSuggestion(true)}
                className="gap-2"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                다시 시도
              </Button>
            </div>
          )}

          {/* 제안 내용 */}
          {(state === 'success' || state === 'stale') && suggestion && (
            <>
              {/* 추천 채널 & 타이밍 */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">
                    {CHANNEL_ICONS[suggestion.recommendedChannel]}
                  </span>
                  <span className="font-medium text-sm">
                    {suggestion.recommendedChannel === 'phone' && '전화'}
                    {suggestion.recommendedChannel === 'text' && '문자'}
                    {suggestion.recommendedChannel === 'kakao' && '카카오톡'}
                    {suggestion.recommendedChannel === 'visit' && '대면'}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {suggestion.recommendedTiming}
                </Badge>
              </div>

              {/* 핵심 메시지 */}
              <div className="text-sm bg-muted/50 rounded-md p-3">
                <p className="font-medium text-muted-foreground text-xs mb-1">
                  핵심 메시지
                </p>
                <p>{suggestion.keyMessage}</p>
              </div>

              {/* 신뢰도 & 스크립트 버튼 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">신뢰도</span>
                  <Badge
                    variant="outline"
                    className={
                      suggestion.confidence >= 80
                        ? 'bg-green-50 text-green-600 border-green-200'
                        : suggestion.confidence >= 60
                          ? 'bg-amber-50 text-amber-600 border-amber-200'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                    }
                  >
                    {suggestion.confidence}%
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsScriptModalOpen(true)}
                  className="h-7 text-xs"
                >
                  스크립트 보기
                </Button>
              </div>

              {/* 추론 근거 (접힌 상태) */}
              {suggestion.reasoning && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    AI 판단 근거
                  </summary>
                  <p className="mt-1.5 text-muted-foreground pl-4">
                    {suggestion.reasoning}
                  </p>
                </details>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 스크립트 모달 */}
      <Dialog open={isScriptModalOpen} onOpenChange={setIsScriptModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {suggestion && CHANNEL_ICONS[suggestion.recommendedChannel]}
              대화 스크립트
            </DialogTitle>
            <DialogDescription>
              {student.name} 학생/학부모에게 보낼 내용
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <div className="bg-muted rounded-md p-4 text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
              {suggestion?.script}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyScript}
              className="absolute top-2 right-2 h-7"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
