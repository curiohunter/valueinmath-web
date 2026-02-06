"use client"

import { memo } from "react"
import Image from "next/image"
import {
  FileText,
  Instagram,
  Send,
  MoreHorizontal,
  Eye,
  Heart,
  MessageCircle,
  Calendar,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Archive,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ContentPost, ContentType, ContentStatus } from "@/types/content-post"
import { CONTENT_TYPE_OPTIONS, CONTENT_STATUS_OPTIONS, STATUS_BADGE_VARIANT } from "./constants"

interface ContentCardProps {
  post: ContentPost
  onEdit: (post: ContentPost) => void
  onDelete: (post: ContentPost) => void
  onCopy: (post: ContentPost) => void
  onStatusChange: (post: ContentPost, status: ContentStatus) => void
}

/**
 * 콘텐츠 타입별 아이콘
 */
function getContentTypeIcon(type: ContentType) {
  switch (type) {
    case "blog":
    case "newsletter":
      return <FileText className="h-4 w-4" />
    case "instagram_feed":
    case "instagram_story":
    case "instagram_reel":
      return <Instagram className="h-4 w-4" />
    case "notice":
      return <Send className="h-4 w-4" />
    default:
      return <FileText className="h-4 w-4" />
  }
}

/**
 * 콘텐츠 카드 컴포넌트
 * - memo로 불필요한 리렌더링 방지
 * @see rerender-memo
 */
function ContentCardComponent({
  post,
  onEdit,
  onDelete,
  onCopy,
  onStatusChange,
}: ContentCardProps) {
  const typeOption = CONTENT_TYPE_OPTIONS.find((t) => t.value === post.content_type)
  const statusOption = CONTENT_STATUS_OPTIONS.find((s) => s.value === post.status)

  const coverImageUrl = post.cover_image?.storage_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${post.cover_image.storage_path}`
    : null

  return (
    <Card className="group overflow-hidden hover:shadow-md transition-shadow">
      {/* 커버 이미지 */}
      {coverImageUrl ? (
        <div className="relative h-40 bg-muted">
          <Image
            src={coverImageUrl}
            alt={post.cover_image?.title || ""}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {post.image_ids && post.image_ids.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <ImageIcon className="h-3 w-3" />
              {post.image_ids.length}
            </div>
          )}
        </div>
      ) : null}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {getContentTypeIcon(post.content_type)}
            <Badge variant="outline" className="text-xs">
              {typeOption?.label}
            </Badge>
            <Badge variant={STATUS_BADGE_VARIANT[post.status]} className="text-xs">
              {statusOption?.label}
            </Badge>
            {post.ai_generated && (
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="mr-1 h-3 w-3" />
                AI
              </Badge>
            )}
            {!coverImageUrl && post.image_ids && post.image_ids.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                <ImageIcon className="mr-1 h-3 w-3" />
                {post.image_ids.length}
              </Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(post)}>
                <Edit className="mr-2 h-4 w-4" />
                수정
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCopy(post)}>
                <Copy className="mr-2 h-4 w-4" />
                내용 복사
              </DropdownMenuItem>
              {post.publish_url && (
                <DropdownMenuItem asChild>
                  <a href={post.publish_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    발행 페이지
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {post.status !== "ready" && (
                <DropdownMenuItem onClick={() => onStatusChange(post, "ready")}>
                  발행 준비로 변경
                </DropdownMenuItem>
              )}
              {post.status !== "published" && (
                <DropdownMenuItem onClick={() => onStatusChange(post, "published")}>
                  발행됨으로 변경
                </DropdownMenuItem>
              )}
              {post.status !== "archived" && (
                <DropdownMenuItem onClick={() => onStatusChange(post, "archived")}>
                  <Archive className="mr-2 h-4 w-4" />
                  보관
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(post)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CardTitle className="line-clamp-1 text-base mt-2">
          {post.title || "(제목 없음)"}
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        <CardDescription className="line-clamp-2">
          {post.body || post.caption || "(내용 없음)"}
        </CardDescription>

        {/* 해시태그 */}
        {post.hashtags && post.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {post.hashtags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs font-normal">
                #{tag}
              </Badge>
            ))}
            {post.hashtags.length > 3 && (
              <Badge variant="outline" className="text-xs font-normal">
                +{post.hashtags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* 통계 (발행된 경우) */}
        {post.status === "published" && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {post.view_count ?? 0}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {post.like_count ?? 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {post.comment_count ?? 0}
            </span>
          </div>
        )}

        {/* 날짜 */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>
            {new Date(post.created_at).toLocaleDateString("ko-KR")}
            {post.published_at && (
              <> · 발행 {new Date(post.published_at).toLocaleDateString("ko-KR")}</>
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// memo로 감싸서 props가 변경될 때만 리렌더링
export const ContentCard = memo(ContentCardComponent)
