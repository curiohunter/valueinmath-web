"use client"

import React, { useState } from "react"
import useSWR, { mutate } from "swr"
import { toast } from "sonner"
import {
  Plus,
  MessageSquare,
  Filter,
  Search,
  Star,
  StarOff,
  Edit,
  Trash2,
  ExternalLink,
  MoreHorizontal,
  Award,
  CheckCircle,
  Megaphone,
  User,
  Calendar,
  Link as LinkIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import type { Review, ReviewSource, ReviewerType, ReviewFormData } from "@/types/review"
import { REVIEW_SOURCES, REVIEWER_TYPES } from "@/types/review"
import MarketingTabs from "@/components/marketing/MarketingTabs"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// 별점 컴포넌트
function StarRating({
  rating,
  onChange,
  readonly = false,
}: {
  rating: number | null
  onChange?: (value: number) => void
  readonly?: boolean
}) {
  const stars = [1, 2, 3, 4, 5]

  return (
    <div className="flex items-center gap-1">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
        >
          <Star
            className={`w-5 h-5 ${
              rating && star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  )
}

// 초기 폼 데이터
const initialFormData: ReviewFormData = {
  source: "direct",
  reviewer_name: "",
  reviewer_type: "parent",
  rating: 5,
  title: "",
  content: "",
  source_url: "",
  original_date: "",
  is_featured: false,
  is_verified: false,
  can_use_marketing: false,
}

export default function ReviewsPage() {
  const [source, setSource] = useState<ReviewSource | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showOnlyMarketing, setShowOnlyMarketing] = useState(false)
  const [showOnlyFeatured, setShowOnlyFeatured] = useState(false)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [formData, setFormData] = useState<ReviewFormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // API URL 생성
  let apiUrl = "/api/reviews"
  const params = new URLSearchParams()
  if (source !== "all") params.set("source", source)
  if (showOnlyMarketing) params.set("can_use_marketing", "true")
  if (showOnlyFeatured) params.set("is_featured", "true")
  if (params.toString()) apiUrl += `?${params.toString()}`

  const { data, isLoading } = useSWR<{ success: boolean; data: Review[] }>(
    apiUrl,
    fetcher
  )

  const reviews = data?.data || []

  // 검색 필터링
  const filteredReviews = reviews.filter((review) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      review.content.toLowerCase().includes(query) ||
      review.title?.toLowerCase().includes(query) ||
      review.reviewer_name?.toLowerCase().includes(query)
    )
  })

  // 폼 열기
  const openCreateForm = () => {
    setFormData(initialFormData)
    setEditingReview(null)
    setIsFormOpen(true)
  }

  // 수정 폼 열기
  const openEditForm = (review: Review) => {
    setFormData({
      source: review.source,
      reviewer_name: review.reviewer_name || "",
      reviewer_type: review.reviewer_type || "anonymous",
      rating: review.rating || 5,
      title: review.title || "",
      content: review.content,
      source_url: review.source_url || "",
      original_date: review.original_date || "",
      is_featured: review.is_featured,
      is_verified: review.is_verified,
      can_use_marketing: review.can_use_marketing,
    })
    setEditingReview(review)
    setIsFormOpen(true)
  }

  // 폼 제출
  const handleSubmit = async () => {
    if (!formData.content.trim()) {
      toast.error("후기 내용을 입력해주세요.")
      return
    }

    setIsSubmitting(true)

    try {
      const url = editingReview
        ? `/api/reviews/${editingReview.id}`
        : "/api/reviews"
      const method = editingReview ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("저장 실패")

      toast.success(editingReview ? "후기가 수정되었습니다." : "후기가 추가되었습니다.")
      setIsFormOpen(false)
      setEditingReview(null)
      mutate(apiUrl)
    } catch (error) {
      console.error("저장 오류:", error)
      toast.error("저장에 실패했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // 후기 삭제
  const handleDelete = async (review: Review) => {
    if (!confirm("이 후기를 삭제하시겠습니까?")) return

    try {
      const response = await fetch(`/api/reviews/${review.id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("삭제 실패")

      toast.success("후기가 삭제되었습니다.")
      mutate(apiUrl)
    } catch (error) {
      console.error("삭제 오류:", error)
      toast.error("삭제에 실패했습니다.")
    }
  }

  // 대표 후기 토글
  const toggleFeatured = async (review: Review) => {
    try {
      const response = await fetch(`/api/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_featured: !review.is_featured }),
      })

      if (!response.ok) throw new Error("수정 실패")

      toast.success(
        review.is_featured ? "대표 후기에서 해제되었습니다." : "대표 후기로 지정되었습니다."
      )
      mutate(apiUrl)
    } catch (error) {
      console.error("토글 오류:", error)
      toast.error("수정에 실패했습니다.")
    }
  }

  return (
    <div className="space-y-6">
      <MarketingTabs />

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">후기 관리</h1>
          <p className="text-muted-foreground">
            네이버 플레이스, 직접 수집 후기를 관리합니다
          </p>
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="w-4 h-4 mr-2" />
          후기 추가
        </Button>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select
            value={source}
            onValueChange={(v) => setSource(v as ReviewSource | "all")}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="출처" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 출처</SelectItem>
              {REVIEW_SOURCES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="후기 내용, 작성자로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={showOnlyMarketing}
              onCheckedChange={(checked) => setShowOnlyMarketing(!!checked)}
            />
            마케팅 활용 가능
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={showOnlyFeatured}
              onCheckedChange={(checked) => setShowOnlyFeatured(!!checked)}
            />
            대표 후기만
          </label>
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredReviews.length}개 후기
        </div>
      </div>

      {/* 후기 목록 */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">로딩 중...</div>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mb-4" />
          <p>등록된 후기가 없습니다</p>
          <p className="text-sm">후기를 추가해보세요</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredReviews.map((review) => (
            <Card
              key={review.id}
              className={`relative ${review.is_featured ? "ring-2 ring-primary" : ""}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {REVIEW_SOURCES.find((s) => s.value === review.source)?.label}
                    </Badge>
                    {review.is_featured && (
                      <Badge variant="default" className="bg-yellow-500">
                        <Award className="w-3 h-3 mr-1" />
                        대표
                      </Badge>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toggleFeatured(review)}>
                        {review.is_featured ? (
                          <>
                            <StarOff className="w-4 h-4 mr-2" />
                            대표 해제
                          </>
                        ) : (
                          <>
                            <Star className="w-4 h-4 mr-2" />
                            대표 지정
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEditForm(review)}>
                        <Edit className="w-4 h-4 mr-2" />
                        수정
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(review)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {review.rating && (
                  <StarRating rating={review.rating} readonly />
                )}
              </CardHeader>

              <CardContent className="space-y-3">
                {review.title && (
                  <h3 className="font-semibold">{review.title}</h3>
                )}

                <p className="text-sm text-muted-foreground line-clamp-4">
                  {review.content}
                </p>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {review.reviewer_name && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {review.reviewer_name}
                      {review.reviewer_type && (
                        <span>
                          ({REVIEWER_TYPES.find((t) => t.value === review.reviewer_type)?.label})
                        </span>
                      )}
                    </span>
                  )}

                  {review.original_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {review.original_date}
                    </span>
                  )}
                </div>

                {/* 상태 배지들 */}
                <div className="flex flex-wrap gap-1">
                  {review.is_verified && (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      인증됨
                    </Badge>
                  )}
                  {review.can_use_marketing && (
                    <Badge variant="secondary" className="text-xs">
                      <Megaphone className="w-3 h-3 mr-1" />
                      마케팅 활용
                    </Badge>
                  )}
                </div>

                {/* 원본 링크 */}
                {review.source_url && (
                  <a
                    href={review.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    원본 보기
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 후기 추가/수정 모달 */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingReview ? "후기 수정" : "후기 추가"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 출처 */}
            <div className="space-y-2">
              <Label>출처 *</Label>
              <Select
                value={formData.source}
                onValueChange={(v) =>
                  setFormData({ ...formData, source: v as ReviewSource })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REVIEW_SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 별점 */}
            <div className="space-y-2">
              <Label>별점</Label>
              <StarRating
                rating={formData.rating || null}
                onChange={(value) => setFormData({ ...formData, rating: value })}
              />
            </div>

            {/* 제목 */}
            <div className="space-y-2">
              <Label>제목</Label>
              <Input
                value={formData.title || ""}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="후기 제목 (선택)"
              />
            </div>

            {/* 내용 */}
            <div className="space-y-2">
              <Label>후기 내용 *</Label>
              <Textarea
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="후기 내용을 입력하세요"
                rows={5}
              />
            </div>

            {/* 작성자 정보 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>작성자명</Label>
                <Input
                  value={formData.reviewer_name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, reviewer_name: e.target.value })
                  }
                  placeholder="홍길동"
                />
              </div>
              <div className="space-y-2">
                <Label>작성자 유형</Label>
                <Select
                  value={formData.reviewer_type || "anonymous"}
                  onValueChange={(v) =>
                    setFormData({ ...formData, reviewer_type: v as ReviewerType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REVIEWER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 원본 정보 (외부 후기인 경우) */}
            {(formData.source === "naver_place" ||
              formData.source === "naver_blog" ||
              formData.source === "kakao" ||
              formData.source === "google") && (
              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  원본 정보
                </h4>
                <div className="space-y-2">
                  <Label>원본 URL</Label>
                  <Input
                    value={formData.source_url || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, source_url: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>작성일</Label>
                  <Input
                    type="date"
                    value={formData.original_date || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, original_date: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            {/* 활용 옵션 */}
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <h4 className="text-sm font-medium">활용 옵션</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={formData.is_featured}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_featured: !!checked })
                    }
                  />
                  <Award className="w-4 h-4 text-yellow-500" />
                  대표 후기로 지정
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={formData.is_verified}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_verified: !!checked })
                    }
                  />
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  실제 수강생 확인됨
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={formData.can_use_marketing}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, can_use_marketing: !!checked })
                    }
                  />
                  <Megaphone className="w-4 h-4 text-blue-500" />
                  마케팅 활용 동의
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsFormOpen(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "저장 중..." : editingReview ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
