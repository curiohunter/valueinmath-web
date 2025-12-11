"use client"

import React, { useState, useEffect, useCallback } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  User,
  GraduationCap,
  Building2,
  Calendar,
} from "lucide-react"
import { toast } from "sonner"
import { WordBankSelector } from "./word-bank-selector"
import { StudentMetricsCard } from "./student-metrics-card"
import type {
  SelectedPhrases,
  StudentLearningData,
  CommentTone,
  GradeBand,
  StudentInfo,
} from "@/types/comment-assistant"

interface AICommentAssistantProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentInfo: StudentInfo
  year: number
  month: number
  onApply: (content: string) => void
}

// 빈 선택 상태
const emptySelectedPhrases: SelectedPhrases = {
  greeting: [],
  progress: [],
  attitude_positive: [],
  attitude_needs_improvement: [],
  attendance_issue: [],
  homework_issue: [],
  methodology: [],
  achievement: [],
  future_plan: [],
  closing: [],
}

// 학년을 GradeBand로 변환
function gradeToGradeBand(grade: any): GradeBand {
  if (!grade) return "all"
  const gradeStr = String(grade)
  if (gradeStr.includes("초")) return "elementary"
  if (gradeStr.includes("중")) return "middle"
  if (gradeStr.includes("고")) return "high"
  return "all"
}

export function AICommentAssistant({
  open,
  onOpenChange,
  studentInfo,
  year,
  month,
  onApply,
}: AICommentAssistantProps) {
  // 상태
  const [selectedPhrases, setSelectedPhrases] = useState<SelectedPhrases>(emptySelectedPhrases)
  const [tone, setTone] = useState<CommentTone>("balanced")
  const [learningData, setLearningData] = useState<StudentLearningData | null>(null)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [regenerationCount, setRegenerationCount] = useState(0)
  const [copied, setCopied] = useState(false)
  const [step, setStep] = useState<"select" | "preview">("select")

  // 학년 기반 GradeBand
  const gradeBand = gradeToGradeBand(studentInfo.grade)

  // Sheet 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setSelectedPhrases(emptySelectedPhrases)
      setTone("balanced")
      setGeneratedContent("")
      setRegenerationCount(0)
      setStep("select")
      loadLearningData()
    }
  }, [open, studentInfo.id, year, month])

  // 학습 데이터 로드
  const loadLearningData = useCallback(async () => {
    if (!studentInfo.id) return

    setIsLoadingData(true)
    try {
      const response = await fetch(
        `/api/student-metrics?student_id=${studentInfo.id}&year=${year}&month=${month}`
      )
      const result = await response.json()

      if (result.success && result.learningData) {
        setLearningData(result.learningData)
      } else {
        setLearningData(null)
      }
    } catch (error) {
      console.error("Failed to load learning data:", error)
      setLearningData(null)
    } finally {
      setIsLoadingData(false)
    }
  }, [studentInfo.id, year, month])

  // 선택된 키워드 개수
  const totalSelected = Object.values(selectedPhrases).reduce(
    (sum, arr) => sum + arr.length,
    0
  )

  // AI 코멘트 생성
  const handleGenerate = async () => {
    if (totalSelected === 0) {
      toast.error("최소 1개 이상의 키워드를 선택해주세요.")
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch("/api/ai/generate-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentInfo.id,
          year,
          month,
          selected_phrases: selectedPhrases,
          learning_data: learningData,
          tone,
          regeneration_type: "full",
          regeneration_count: 0,
        }),
      })

      const result = await response.json()
      console.log('[AI Assistant] API Response:', result)

      if (!response.ok || !result.success) {
        throw new Error(result.error || "코멘트 생성 실패")
      }

      console.log('[AI Assistant] Generated content:', result.data?.generated_content)
      setGeneratedContent(result.data.generated_content || "")
      setRegenerationCount(0)
      setStep("preview")
      toast.success("코멘트가 생성되었습니다!")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "코멘트 생성 실패")
    } finally {
      setIsGenerating(false)
    }
  }

  // 다른 버전 생성 (톤 변경)
  const handleRegenerate = async (newTone: CommentTone) => {
    if (regenerationCount >= 2) {
      toast.error("재생성 횟수 초과 (최대 2회). 직접 수정을 권장합니다.")
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch("/api/ai/generate-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentInfo.id,
          year,
          month,
          selected_phrases: selectedPhrases,
          learning_data: learningData,
          tone: newTone,
          regeneration_type: "tone_adjust",
          regeneration_count: regenerationCount,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "재생성 실패")
      }

      setGeneratedContent(result.data.generated_content)
      setTone(newTone)
      setRegenerationCount((prev) => prev + 1)
      toast.success("새로운 버전이 생성되었습니다!")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "재생성 실패")
    } finally {
      setIsGenerating(false)
    }
  }

  // 복사
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent)
      setCopied(true)
      toast.success("클립보드에 복사되었습니다")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("복사에 실패했습니다")
    }
  }

  // 적용
  const handleApply = () => {
    onApply(generatedContent)
    onOpenChange(false)
    toast.success("코멘트가 적용되었습니다")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            AI 코멘트 작성 도우미
          </SheetTitle>
          <SheetDescription>
            키워드를 선택하고 AI가 자연스러운 학습 보고서를 생성합니다
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* 학생 정보 */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4" />
              {studentInfo.name}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <GraduationCap className="h-3 w-3" />
                {studentInfo.grade}
              </div>
              {studentInfo.school && (
                <div className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {studentInfo.school}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {year}년 {month}월
              </div>
            </div>
          </div>

          {step === "select" ? (
            <>
              {/* 학습 데이터 */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  {month}월 학습 데이터
                </Label>
                <StudentMetricsCard learningData={learningData} isLoading={isLoadingData} />
              </div>

              {/* 키워드 선택 */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  키워드 선택
                </Label>
                <WordBankSelector
                  selectedPhrases={selectedPhrases}
                  onPhrasesChange={setSelectedPhrases}
                  gradeBand={gradeBand}
                />
              </div>

              {/* 톤 선택 */}
              <div>
                <Label className="text-sm font-medium mb-3 block">톤 설정</Label>
                <RadioGroup
                  value={tone}
                  onValueChange={(v) => setTone(v as CommentTone)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="balanced" id="balanced" />
                    <Label htmlFor="balanced" className="text-sm cursor-pointer">
                      균형
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="praise" id="praise" />
                    <Label htmlFor="praise" className="text-sm cursor-pointer">
                      칭찬
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="feedback" id="feedback" />
                    <Label htmlFor="feedback" className="text-sm cursor-pointer">
                      피드백
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* 생성 버튼 */}
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || totalSelected === 0}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI로 코멘트 생성하기
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {/* 미리보기 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">생성된 코멘트 (초안)</Label>
                  <Badge variant="outline" className="text-xs">
                    {generatedContent.length}/2000
                  </Badge>
                </div>
                <Textarea
                  value={generatedContent}
                  onChange={(e) => setGeneratedContent(e.target.value)}
                  className="min-h-[300px] resize-none"
                  placeholder="생성된 코멘트가 여기에 표시됩니다..."
                />
                <p className="text-xs text-muted-foreground mt-2">
                  초안을 직접 수정하시거나, 다른 버전을 요청하세요
                </p>
              </div>

              {/* 다른 버전 버튼 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">다른 버전 보기</Label>
                  {isGenerating && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      생성 중...
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegenerate("praise")}
                    disabled={isGenerating || regenerationCount >= 2 || tone === "praise"}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    칭찬 버전
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegenerate("feedback")}
                    disabled={isGenerating || regenerationCount >= 2 || tone === "feedback"}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    피드백 버전
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegenerate("balanced")}
                    disabled={isGenerating || regenerationCount >= 2 || tone === "balanced"}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    균형 버전
                  </Button>
                </div>
                {regenerationCount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    재생성 {regenerationCount}/2회 사용
                  </p>
                )}
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("select")}
                  className="flex-1"
                >
                  키워드 다시 선택
                </Button>
                <Button variant="outline" onClick={handleCopy} className="px-4">
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button onClick={handleApply} className="flex-1">
                  <Check className="h-4 w-4 mr-2" />
                  사용하기
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
