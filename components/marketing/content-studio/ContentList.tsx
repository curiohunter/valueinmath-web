"use client"

import { memo } from "react"
import { FileText, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ContentCard } from "./ContentCard"
import type { ContentPost, ContentStatus } from "@/types/content-post"

interface ContentListProps {
  posts: ContentPost[]
  isLoading: boolean
  onEdit: (post: ContentPost) => void
  onDelete: (post: ContentPost) => void
  onCopy: (post: ContentPost) => void
  onStatusChange: (post: ContentPost, status: ContentStatus) => void
  onCreateNew: () => void
}

/**
 * 콘텐츠 목록 컴포넌트
 * - 로딩, 빈 상태, 그리드 표시
 */
function ContentListComponent({
  posts,
  isLoading,
  onEdit,
  onDelete,
  onCopy,
  onStatusChange,
  onCreateNew,
}: ContentListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-40 bg-muted" />
            <CardContent className="p-4 space-y-3">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">콘텐츠가 없습니다</h3>
          <p className="mt-2 text-muted-foreground">
            첫 번째 마케팅 콘텐츠를 작성해보세요.
          </p>
          <Button className="mt-6" onClick={onCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            새 콘텐츠 작성
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <ContentCard
          key={post.id}
          post={post}
          onEdit={onEdit}
          onDelete={onDelete}
          onCopy={onCopy}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  )
}

export const ContentList = memo(ContentListComponent)
