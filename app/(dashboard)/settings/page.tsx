"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Tag,
} from "lucide-react"
import { toast } from "sonner"
import SettingsTabs from "@/components/settings/SettingsTabs"

// 카테고리 설정
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

const SEVERITY_OPTIONS = [
  { value: "positive", label: "긍정", color: "text-green-600 bg-green-50 border-green-200" },
  { value: "neutral", label: "중립", color: "text-gray-600 bg-gray-50 border-gray-200" },
  { value: "negative", label: "부정", color: "text-orange-600 bg-orange-50 border-orange-200" },
]

const GRADE_BAND_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "elementary", label: "초등" },
  { value: "middle", label: "중등" },
  { value: "high", label: "고등" },
]

interface Protocol {
  id: string
  category: string
  phrase: string
  severity: string
  grade_band: string
  display_order: number
  is_active: boolean
}

export default function SettingsPage() {
  const [protocols, setProtocols] = useState<Protocol[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(["greeting"]))

  // 다이얼로그 상태
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null)

  // 폼 상태
  const [formCategory, setFormCategory] = useState("")
  const [formPhrase, setFormPhrase] = useState("")
  const [formSeverity, setFormSeverity] = useState("neutral")
  const [formGradeBand, setFormGradeBand] = useState("all")
  const [isSaving, setIsSaving] = useState(false)

  // 데이터 로드
  useEffect(() => {
    fetchProtocols()
  }, [])

  const fetchProtocols = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/comment-protocols")
      const result = await response.json()
      if (result.success) {
        setProtocols(result.data.protocols)
      } else {
        toast.error(result.error || "키워드 로드 실패")
      }
    } catch {
      toast.error("키워드 로드 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  // 카테고리별 그룹핑
  const groupedProtocols = protocols.reduce((acc, protocol) => {
    const cat = protocol.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(protocol)
    return acc
  }, {} as Record<string, Protocol[]>)

  const sortedCategories = Object.keys(groupedProtocols).sort((a, b) => {
    return (CATEGORY_CONFIG[a]?.order ?? 99) - (CATEGORY_CONFIG[b]?.order ?? 99)
  })

  // 카테고리 토글
  const toggleCategory = (cat: string) => {
    const newOpen = new Set(openCategories)
    if (newOpen.has(cat)) {
      newOpen.delete(cat)
    } else {
      newOpen.add(cat)
    }
    setOpenCategories(newOpen)
  }

  // 추가 다이얼로그 열기
  const openAddDialog = (category?: string) => {
    setFormCategory(category || "")
    setFormPhrase("")
    setFormSeverity("neutral")
    setFormGradeBand("all")
    setIsAddDialogOpen(true)
  }

  // 수정 다이얼로그 열기
  const openEditDialog = (protocol: Protocol) => {
    setSelectedProtocol(protocol)
    setFormPhrase(protocol.phrase)
    setFormSeverity(protocol.severity)
    setFormGradeBand(protocol.grade_band)
    setIsEditDialogOpen(true)
  }

  // 삭제 다이얼로그 열기
  const openDeleteDialog = (protocol: Protocol) => {
    setSelectedProtocol(protocol)
    setIsDeleteDialogOpen(true)
  }

  // 키워드 추가
  const handleAdd = async () => {
    if (!formCategory || !formPhrase.trim()) {
      toast.error("카테고리와 키워드를 입력해주세요.")
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch("/api/comment-protocols", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: formCategory,
          phrase: formPhrase.trim(),
          severity: formSeverity,
          grade_band: formGradeBand,
        }),
      })
      const result = await response.json()

      if (result.success) {
        toast.success("키워드가 추가되었습니다.")
        setIsAddDialogOpen(false)
        fetchProtocols()
      } else {
        toast.error(result.error || "추가 실패")
      }
    } catch {
      toast.error("키워드 추가 중 오류가 발생했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  // 키워드 수정
  const handleEdit = async () => {
    if (!selectedProtocol || !formPhrase.trim()) {
      toast.error("키워드를 입력해주세요.")
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch("/api/comment-protocols", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedProtocol.id,
          phrase: formPhrase.trim(),
          severity: formSeverity,
          grade_band: formGradeBand,
        }),
      })
      const result = await response.json()

      if (result.success) {
        toast.success("키워드가 수정되었습니다.")
        setIsEditDialogOpen(false)
        fetchProtocols()
      } else {
        toast.error(result.error || "수정 실패")
      }
    } catch {
      toast.error("키워드 수정 중 오류가 발생했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  // 키워드 삭제
  const handleDelete = async () => {
    if (!selectedProtocol) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/comment-protocols?id=${selectedProtocol.id}`, {
        method: "DELETE",
      })
      const result = await response.json()

      if (result.success) {
        toast.success("키워드가 삭제되었습니다.")
        setIsDeleteDialogOpen(false)
        fetchProtocols()
      } else {
        toast.error(result.error || "삭제 실패")
      }
    } catch {
      toast.error("키워드 삭제 중 오류가 발생했습니다.")
    } finally {
      setIsSaving(false)
    }
  }

  // severity 색상
  const getSeverityStyle = (severity: string) => {
    return SEVERITY_OPTIONS.find(s => s.value === severity)?.color || ""
  }

  return (
    <div className="container mx-auto p-6">
      <SettingsTabs />

      {/* AI 코멘트 키워드 관리 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              <div>
                <CardTitle>AI 코멘트 키워드 관리</CardTitle>
                <CardDescription>
                  AI 코멘트 생성 시 사용되는 키워드를 관리합니다
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => openAddDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              키워드 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>로딩 중...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedCategories.map((category) => {
                const catProtocols = groupedProtocols[category] || []
                const isOpen = openCategories.has(category)

                return (
                  <Collapsible
                    key={category}
                    open={isOpen}
                    onOpenChange={() => toggleCategory(category)}
                  >
                    <div className="border rounded-lg">
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between px-4 py-3 h-auto hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {CATEGORY_CONFIG[category]?.label || category}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {catProtocols.length}개
                            </Badge>
                          </div>
                          {isOpen ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="px-4 pb-4 pt-2 border-t bg-muted/20">
                          <div className="flex flex-wrap gap-2 mb-3">
                            {catProtocols.map((protocol) => (
                              <div
                                key={protocol.id}
                                className={`group flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-sm ${getSeverityStyle(protocol.severity)}`}
                              >
                                <span>{protocol.phrase}</span>
                                {protocol.grade_band !== "all" && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">
                                    {GRADE_BAND_OPTIONS.find(g => g.value === protocol.grade_band)?.label}
                                  </Badge>
                                )}
                                <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openEditDialog(protocol)
                                    }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 text-red-500 hover:text-red-600"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openDeleteDialog(protocol)
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAddDialog(category)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            이 카테고리에 추가
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                )
              })}

              {sortedCategories.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  등록된 키워드가 없습니다.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 추가 다이얼로그 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>키워드 추가</DialogTitle>
            <DialogDescription>
              AI 코멘트 생성에 사용할 새 키워드를 추가합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>카테고리</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_CONFIG)
                    .sort((a, b) => a[1].order - b[1].order)
                    .map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>키워드</Label>
              <Input
                value={formPhrase}
                onChange={(e) => setFormPhrase(e.target.value)}
                placeholder="예: 집중력이 뛰어남"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>감정</Label>
                <Select value={formSeverity} onValueChange={setFormSeverity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>학년대</Label>
                <Select value={formGradeBand} onValueChange={setFormGradeBand}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_BAND_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAdd} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 수정 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>키워드 수정</DialogTitle>
            <DialogDescription>
              키워드 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>카테고리</Label>
              <Input
                value={CATEGORY_CONFIG[selectedProtocol?.category || ""]?.label || selectedProtocol?.category || ""}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>키워드</Label>
              <Input
                value={formPhrase}
                onChange={(e) => setFormPhrase(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>감정</Label>
                <Select value={formSeverity} onValueChange={setFormSeverity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>학년대</Label>
                <Select value={formGradeBand} onValueChange={setFormGradeBand}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_BAND_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleEdit} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>키워드 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{selectedProtocol?.phrase}&quot; 키워드를 삭제하시겠습니까?
              <br />
              삭제된 키워드는 AI 코멘트 생성에서 더 이상 사용되지 않습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
