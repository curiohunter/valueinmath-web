"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  MessageSquareText,
  CheckCircle2,
  RotateCcw,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import {
  addMeetingItem,
  updateMeetingItem,
  deleteMeetingItem,
  bulkAddMeetingItems,
} from "@/services/meeting-service"
import { categorizeMeetingRecap } from "@/services/meeting-ai-service"
import type {
  MeetingWithDetails,
  MeetingItem,
  MeetingItemCategory,
} from "@/types/meeting"

interface MeetingItemsSectionProps {
  meeting: MeetingWithDetails
  onUpdate: () => void
}

interface CategoryConfig {
  key: MeetingItemCategory
  label: string
  icon: React.ReactNode
  color: string
}

const categories: CategoryConfig[] = [
  {
    key: "discussion",
    label: "논의내용",
    icon: <MessageSquareText className="h-4 w-4 text-blue-600" />,
    color: "text-blue-600",
  },
  {
    key: "decision",
    label: "결정사항",
    icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
    color: "text-green-600",
  },
  {
    key: "follow_up",
    label: "재논의",
    icon: <RotateCcw className="h-4 w-4 text-amber-600" />,
    color: "text-amber-600",
  },
]

function CategorySection({
  config,
  items,
  meetingId,
  onUpdate,
}: {
  config: CategoryConfig
  items: MeetingItem[]
  meetingId: string
  onUpdate: () => void
}) {
  const [isOpen, setIsOpen] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newContent, setNewContent] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")

  const handleAdd = async () => {
    if (!newContent.trim()) return
    try {
      await addMeetingItem(meetingId, {
        category: config.key,
        content: newContent.trim(),
        sort_order: items.length,
      })
      setNewContent("")
      setAdding(false)
      toast.success("항목이 추가되었습니다.")
      onUpdate()
    } catch (error: any) {
      toast.error(`추가 실패: ${error.message}`)
    }
  }

  const handleUpdate = async (id: string) => {
    if (!editContent.trim()) return
    try {
      await updateMeetingItem(id, { content: editContent.trim() })
      setEditingId(null)
      onUpdate()
    } catch (error: any) {
      toast.error(`수정 실패: ${error.message}`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("이 항목을 삭제하시겠습니까?")) return
    try {
      await deleteMeetingItem(id)
      toast.success("삭제되었습니다.")
      onUpdate()
    } catch (error: any) {
      toast.error(`삭제 실패: ${error.message}`)
    }
  }

  return (
    <div className="border-b last:border-b-0 pb-3 last:pb-0">
      {/* Category header */}
      <button
        className="flex items-center gap-2 w-full text-left py-2 hover:bg-muted/50 rounded -mx-1 px-1"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {isOpen ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        {config.icon}
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </button>

      {isOpen && (
        <div className="pl-7 space-y-1.5 mt-1">
          {items.map((item) => (
            <div key={item.id} className="group">
              {editingId === item.id ? (
                <div className="space-y-1.5">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={2}
                    className="text-sm"
                    autoFocus
                  />
                  <div className="flex gap-1.5">
                    <Button size="sm" className="h-7 text-xs" onClick={() => handleUpdate(item.id)}>
                      <Check className="h-3 w-3 mr-1" /> 저장
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>
                      취소
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-1.5 py-1">
                  <span className="text-muted-foreground mt-0.5 text-xs">-</span>
                  <p className="text-sm leading-relaxed flex-1">{item.content}</p>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => {
                        setEditingId(item.id)
                        setEditContent(item.content)
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-destructive"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {adding ? (
            <div className="space-y-1.5">
              <Textarea
                placeholder={`${config.label} 입력...`}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={2}
                className="text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleAdd()
                  }
                }}
              />
              <div className="flex gap-1.5">
                <Button size="sm" className="h-7 text-xs" onClick={handleAdd}>
                  <Check className="h-3 w-3 mr-1" /> 추가
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => { setAdding(false); setNewContent("") }}
                >
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground w-full justify-start"
              onClick={() => setAdding(true)}
            >
              <Plus className="h-3 w-3 mr-1" /> 추가
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export function MeetingItemsSection({
  meeting,
  onUpdate,
}: MeetingItemsSectionProps) {
  const [categorizing, setCategorizing] = useState(false)

  const totalItems = meeting.items.filter(
    (i) => i.category !== "note"
  ).length

  const handleCategorize = async () => {
    if (!meeting.recap) {
      toast.error("AI 요약이 없어 분류할 수 없습니다.")
      return
    }

    setCategorizing(true)
    try {
      const result = await categorizeMeetingRecap(meeting.id, meeting.recap)

      const newItems = [
        ...result.discussion.map(
          (content, i) =>
            ({
              category: "discussion" as const,
              content,
              sort_order: meeting.items.filter((x) => x.category === "discussion").length + i,
            })
        ),
        ...result.decision.map(
          (content, i) =>
            ({
              category: "decision" as const,
              content,
              sort_order: meeting.items.filter((x) => x.category === "decision").length + i,
            })
        ),
        ...result.follow_up.map(
          (content, i) =>
            ({
              category: "follow_up" as const,
              content,
              sort_order: meeting.items.filter((x) => x.category === "follow_up").length + i,
            })
        ),
      ]

      if (newItems.length === 0) {
        toast.info("분류할 항목이 없습니다.")
        return
      }

      await bulkAddMeetingItems(meeting.id, newItems)
      toast.success(`AI가 ${newItems.length}개 항목을 분류했습니다.`)
      onUpdate()
    } catch (error: any) {
      toast.error(error.message || "AI 분류에 실패했습니다.")
    } finally {
      setCategorizing(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquareText className="h-4 w-4" />
          <span className="flex-1">
            회의 안건{totalItems > 0 && ` (${totalItems})`}
          </span>
          {meeting.recap && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={handleCategorize}
              disabled={categorizing}
            >
              {categorizing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              AI 분류
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {categories.map((cat) => (
          <CategorySection
            key={cat.key}
            config={cat}
            items={meeting.items.filter((i) => i.category === cat.key)}
            meetingId={meeting.id}
            onUpdate={onUpdate}
          />
        ))}
      </CardContent>
    </Card>
  )
}
