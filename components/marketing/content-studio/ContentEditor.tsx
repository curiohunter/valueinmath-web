"use client"

import { useState, useCallback, memo, useMemo } from "react"
import Image from "next/image"
import {
  Image as ImageIcon,
  X,
  Star,
  Hash,
  Eye,
  Heart,
  MessageCircle,
  Link as LinkIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ImagePicker } from "./ImagePicker"
import { useGalleryImages } from "./hooks/use-gallery-images"
import {
  CONTENT_TYPE_OPTIONS,
  CONTENT_STATUS_OPTIONS,
  SUGGESTED_HASHTAGS,
} from "./constants"
import type {
  ContentPost,
  ContentPostFormData,
  ContentType,
  ContentStatus,
} from "@/types/content-post"

interface ContentEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingPost: ContentPost | null
  onSave: (data: ContentPostFormData) => Promise<void>
  isSubmitting: boolean
}

const DEFAULT_FORM_DATA: ContentPostFormData = {
  content_type: "blog",
  status: "draft",
  title: "",
  body: "",
  summary: "",
  caption: "",
  hashtags: [],
  image_ids: [],
  cover_image_id: undefined,
}

/**
 * 콘텐츠 에디터 모달
 * - 탭 기반 UI (기본 정보 / 콘텐츠 / 미디어 / 발행)
 * - 유형에 따른 동적 필드
 */
function ContentEditorComponent({
  open,
  onOpenChange,
  editingPost,
  onSave,
  isSubmitting,
}: ContentEditorProps) {
  // 폼 상태
  const [formData, setFormData] = useState<ContentPostFormData>(DEFAULT_FORM_DATA)
  const [hashtagInput, setHashtagInput] = useState("")
  const [isImagePickerOpen, setIsImagePickerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("content")

  // 갤러리 이미지 (선택된 이미지 표시용)
  const { getImagesByIds } = useGalleryImages({ enabled: open })

  // 모달 열릴 때 폼 초기화
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        if (editingPost) {
          setFormData({
            content_type: editingPost.content_type,
            status: editingPost.status,
            title: editingPost.title || "",
            body: editingPost.body || "",
            summary: editingPost.summary || "",
            caption: editingPost.caption || "",
            hashtags: editingPost.hashtags || [],
            image_ids: editingPost.image_ids || [],
            cover_image_id: editingPost.cover_image_id || undefined,
            publish_url: editingPost.publish_url || "",
            view_count: editingPost.view_count,
            like_count: editingPost.like_count,
            comment_count: editingPost.comment_count,
          })
          setHashtagInput(editingPost.hashtags?.join(", ") || "")
        } else {
          setFormData(DEFAULT_FORM_DATA)
          setHashtagInput("")
        }
        setActiveTab("content")
      }
      onOpenChange(isOpen)
    },
    [editingPost, onOpenChange]
  )

  // 필드 업데이트
  const updateField = useCallback(
    <K extends keyof ContentPostFormData>(field: K, value: ContentPostFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  // 해시태그 추가
  const addHashtag = useCallback((tag: string) => {
    const cleanTag = tag.trim().replace(/^#/, "")
    if (!cleanTag) return
    setFormData((prev) => {
      if (prev.hashtags?.includes(cleanTag)) return prev
      return { ...prev, hashtags: [...(prev.hashtags || []), cleanTag] }
    })
  }, [])

  // 해시태그 제거
  const removeHashtag = useCallback((tag: string) => {
    setFormData((prev) => ({
      ...prev,
      hashtags: prev.hashtags?.filter((t) => t !== tag) || [],
    }))
  }, [])

  // 이미지 선택 완료
  const handleImageSelect = useCallback((ids: string[], coverId?: string) => {
    setFormData((prev) => ({
      ...prev,
      image_ids: ids,
      cover_image_id: coverId,
    }))
  }, [])

  // 저장
  const handleSave = useCallback(async () => {
    // 해시태그 입력 필드의 내용도 추가
    const hashtagsFromInput = hashtagInput
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean)

    const allHashtags = [...new Set([...(formData.hashtags || []), ...hashtagsFromInput])]

    await onSave({
      ...formData,
      hashtags: allHashtags,
    })
  }, [formData, hashtagInput, onSave])

  // 선택된 이미지들
  const selectedImages = useMemo(() => {
    return getImagesByIds(formData.image_ids || [])
  }, [formData.image_ids, getImagesByIds])

  // 콘텐츠 유형 확인
  const isInstagram = formData.content_type?.startsWith("instagram")
  const isBlogType =
    formData.content_type === "blog" ||
    formData.content_type === "notice" ||
    formData.content_type === "newsletter"

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>
              {editingPost ? "콘텐츠 수정" : "새 콘텐츠 작성"}
            </DialogTitle>
            <DialogDescription>
              마케팅 콘텐츠를 작성합니다. 채널에 맞게 내용을 입력하세요.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="mx-6 grid w-[400px] grid-cols-4">
              <TabsTrigger value="content">콘텐츠</TabsTrigger>
              <TabsTrigger value="media">미디어</TabsTrigger>
              <TabsTrigger value="tags">태그</TabsTrigger>
              <TabsTrigger value="publish">발행</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 px-6">
              {/* 콘텐츠 탭 */}
              <TabsContent value="content" className="mt-4 space-y-4">
                {/* 유형 & 상태 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>콘텐츠 유형 *</Label>
                    <Select
                      value={formData.content_type}
                      onValueChange={(v) => updateField("content_type", v as ContentType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTENT_TYPE_OPTIONS.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <span className="flex items-center gap-2">
                              <span>{type.icon}</span>
                              <span>{type.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {CONTENT_TYPE_OPTIONS.find((t) => t.value === formData.content_type)?.description}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>상태</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) => updateField("status", v as ContentStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTENT_STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 제목 */}
                <div className="space-y-2">
                  <Label>제목</Label>
                  <Input
                    value={formData.title || ""}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="콘텐츠 제목을 입력하세요"
                  />
                </div>

                {/* 블로그 본문 */}
                {isBlogType && (
                  <>
                    <div className="space-y-2">
                      <Label>본문 (마크다운 지원)</Label>
                      <Textarea
                        value={formData.body || ""}
                        onChange={(e) => updateField("body", e.target.value)}
                        placeholder="마크다운 형식으로 본문을 작성하세요..."
                        rows={12}
                        className="font-mono text-sm resize-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>요약 / 메타 설명</Label>
                      <Textarea
                        value={formData.summary || ""}
                        onChange={(e) => updateField("summary", e.target.value)}
                        placeholder="검색엔진에 노출될 요약 설명"
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                  </>
                )}

                {/* 인스타 캡션 */}
                {isInstagram && (
                  <div className="space-y-2">
                    <Label>캡션</Label>
                    <Textarea
                      value={formData.caption || ""}
                      onChange={(e) => updateField("caption", e.target.value)}
                      placeholder="인스타그램 캡션을 입력하세요..."
                      rows={8}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      {(formData.caption?.length || 0)} / 2,200자
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* 미디어 탭 */}
              <TabsContent value="media" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>첨부 이미지</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsImagePickerOpen(true)}
                    >
                      <ImageIcon className="mr-2 h-4 w-4" />
                      갤러리에서 선택
                    </Button>
                  </div>

                  {selectedImages.length > 0 ? (
                    <div className="grid grid-cols-4 gap-3 p-4 border rounded-lg bg-muted/30">
                      {selectedImages.map((image) => {
                        const isCover = formData.cover_image_id === image.id
                        return (
                          <div
                            key={image.id}
                            className="relative aspect-square rounded-lg overflow-hidden border bg-background group"
                          >
                            {image.public_url ? (
                              <Image
                                src={image.public_url}
                                alt={image.title || ""}
                                fill
                                className="object-cover"
                                sizes="150px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                            {isCover && (
                              <Badge className="absolute top-1 left-1 bg-yellow-500 hover:bg-yellow-500 text-xs">
                                <Star className="h-3 w-3 fill-current mr-1" />
                                커버
                              </Badge>
                            )}
                            <button
                              type="button"
                              className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                const newIds = (formData.image_ids || []).filter((id) => id !== image.id)
                                updateField("image_ids", newIds)
                                if (formData.cover_image_id === image.id) {
                                  updateField("cover_image_id", undefined)
                                }
                              }}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-8 border-2 border-dashed rounded-lg text-center text-muted-foreground">
                      <ImageIcon className="mx-auto h-10 w-10 mb-3 opacity-50" />
                      <p className="font-medium">이미지를 선택하세요</p>
                      <p className="text-sm mt-1">갤러리 버튼을 클릭하여 이미지 추가</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* 태그 탭 */}
              <TabsContent value="tags" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    해시태그
                  </Label>
                  <Input
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    placeholder="쉼표로 구분하여 입력 (예: 밸류인수학, 수학학원)"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        hashtagInput.split(",").forEach(addHashtag)
                        setHashtagInput("")
                      }
                    }}
                  />
                </div>

                {/* 현재 태그 */}
                {formData.hashtags && formData.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.hashtags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                        #{tag}
                        <button
                          type="button"
                          onClick={() => removeHashtag(tag)}
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* 추천 태그 */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">추천 태그</Label>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_HASHTAGS.filter(
                      (tag) => !formData.hashtags?.includes(tag)
                    ).map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10"
                        onClick={() => addHashtag(tag)}
                      >
                        + #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* 발행 탭 */}
              <TabsContent value="publish" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    발행 URL
                  </Label>
                  <Input
                    value={formData.publish_url || ""}
                    onChange={(e) => updateField("publish_url", e.target.value)}
                    placeholder="https://blog.naver.com/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    발행 후 URL을 입력하면 나중에 쉽게 찾을 수 있습니다.
                  </p>
                </div>

                {/* 통계 (발행된 경우) */}
                {editingPost && formData.status === "published" && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                    <Label className="text-sm">발행 통계</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          조회수
                        </Label>
                        <Input
                          type="number"
                          value={formData.view_count || 0}
                          onChange={(e) => updateField("view_count", parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          좋아요
                        </Label>
                        <Input
                          type="number"
                          value={formData.like_count || 0}
                          onChange={(e) => updateField("like_count", parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          댓글
                        </Label>
                        <Input
                          type="number"
                          value={formData.comment_count || 0}
                          onChange={(e) => updateField("comment_count", parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? "저장 중..." : editingPost ? "수정" : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 이미지 선택기 */}
      <ImagePicker
        open={isImagePickerOpen}
        onOpenChange={setIsImagePickerOpen}
        selectedIds={formData.image_ids || []}
        coverId={formData.cover_image_id}
        onSelect={handleImageSelect}
      />
    </>
  )
}

export const ContentEditor = memo(ContentEditorComponent)
