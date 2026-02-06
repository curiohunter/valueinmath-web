"use client"

import { useState, useCallback, useMemo } from "react"
import { toast } from "sonner"
import { Plus, Search, Filter, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import MarketingTabs from "@/components/marketing/MarketingTabs"

// 직접 import로 번들 최적화 (@see bundle-barrel-imports)
import { ContentList } from "@/components/marketing/content-studio/ContentList"
import { ContentEditor } from "@/components/marketing/content-studio/ContentEditor"
import { useContentPosts } from "@/components/marketing/content-studio/hooks/use-content-posts"
import { CONTENT_TYPE_OPTIONS } from "@/components/marketing/content-studio/constants"

import type { ContentPost, ContentType, ContentStatus, ContentPostFormData } from "@/types/content-post"

/**
 * 콘텐츠 스튜디오 페이지
 *
 * 구조:
 * - 필터/검색: 상단 고정
 * - 상태별 탭: 전체/초안/발행준비/발행됨/보관
 * - 콘텐츠 그리드: 카드 형태로 표시
 * - 에디터 모달: 생성/수정
 *
 * 최적화:
 * - SWR 기반 데이터 페칭 (캐싱, 중복 제거)
 * - 컴포넌트 분리 및 memo 적용
 * - 훅으로 비즈니스 로직 분리
 */
export default function ContentStudioPage() {
  // 필터 상태
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<ContentType | "all">("all")
  const [filterStatus, setFilterStatus] = useState<ContentStatus | "all">("all")

  // 에디터 모달 상태
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 콘텐츠 데이터 훅
  const {
    posts,
    isLoading,
    statusCounts,
    createPost,
    updatePost,
    deletePost,
    changeStatus,
    refresh,
  } = useContentPosts({
    contentType: filterType,
    status: filterStatus,
    search,
  })

  // 새 콘텐츠 작성
  const handleCreateNew = useCallback(() => {
    setEditingPost(null)
    setIsEditorOpen(true)
  }, [])

  // 수정
  const handleEdit = useCallback((post: ContentPost) => {
    setEditingPost(post)
    setIsEditorOpen(true)
  }, [])

  // 삭제
  const handleDelete = useCallback(
    async (post: ContentPost) => {
      if (!confirm("이 콘텐츠를 삭제하시겠습니까?")) return
      await deletePost(post.id)
    },
    [deletePost]
  )

  // 내용 복사
  const handleCopy = useCallback((post: ContentPost) => {
    const content = post.content_type.startsWith("instagram")
      ? `${post.caption || ""}\n\n${post.hashtags?.map((h) => `#${h}`).join(" ") || ""}`
      : post.body || ""

    navigator.clipboard.writeText(content)
    toast.success("내용이 클립보드에 복사되었습니다.")
  }, [])

  // 상태 변경
  const handleStatusChange = useCallback(
    async (post: ContentPost, status: ContentStatus) => {
      await changeStatus(post.id, status)
    },
    [changeStatus]
  )

  // 저장
  const handleSave = useCallback(
    async (data: ContentPostFormData) => {
      setIsSubmitting(true)
      try {
        if (editingPost) {
          await updatePost(editingPost.id, data)
        } else {
          await createPost(data)
        }
        setIsEditorOpen(false)
        setEditingPost(null)
      } finally {
        setIsSubmitting(false)
      }
    },
    [editingPost, createPost, updatePost]
  )

  // 검색어 디바운스 (입력 중 API 호출 최소화)
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
  }, [])

  return (
    <div className="space-y-6">
      <MarketingTabs />

      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">콘텐츠 스튜디오</h1>
          <p className="text-muted-foreground">
            블로그, 인스타그램 등 마케팅 콘텐츠를 작성하고 관리하세요
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => refresh()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            새 콘텐츠
          </Button>
        </div>
      </div>

      {/* 상태별 탭 */}
      <Tabs
        defaultValue="all"
        value={filterStatus}
        onValueChange={(v) => setFilterStatus(v as ContentStatus | "all")}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="all">
              전체
              <Badge variant="secondary" className="ml-1.5">
                {statusCounts.all}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="draft">
              초안
              <Badge variant="secondary" className="ml-1.5">
                {statusCounts.draft}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="ready">
              준비
              <Badge variant="secondary" className="ml-1.5">
                {statusCounts.ready}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="published">
              발행
              <Badge variant="secondary" className="ml-1.5">
                {statusCounts.published}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="archived">
              보관
              <Badge variant="secondary" className="ml-1.5">
                {statusCounts.archived}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* 필터 */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="검색..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={filterType}
              onValueChange={(v) => setFilterType(v as ContentType | "all")}
            >
              <SelectTrigger className="w-[160px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 유형</SelectItem>
                {CONTENT_TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 콘텐츠 목록 */}
        <TabsContent value={filterStatus} className="mt-6">
          <ContentList
            posts={posts}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCopy={handleCopy}
            onStatusChange={handleStatusChange}
            onCreateNew={handleCreateNew}
          />
        </TabsContent>
      </Tabs>

      {/* 에디터 모달 */}
      <ContentEditor
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        editingPost={editingPost}
        onSave={handleSave}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
