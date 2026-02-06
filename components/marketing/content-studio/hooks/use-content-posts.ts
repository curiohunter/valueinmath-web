"use client"

import useSWR from "swr"
import { useCallback, useMemo } from "react"
import { toast } from "sonner"
import { fetcher, type ApiResponse } from "@/lib/api/fetcher"
import type {
  ContentPost,
  ContentPostFormData,
  ContentType,
  ContentStatus,
} from "@/types/content-post"

interface UseContentPostsOptions {
  contentType?: ContentType | "all"
  status?: ContentStatus | "all"
  search?: string
}

/**
 * 콘텐츠 포스트 관리 커스텀 훅
 * - SWR 기반 데이터 페칭
 * - CRUD 작업 함수 제공
 * - 필터링 및 검색 지원
 */
export function useContentPosts(options: UseContentPostsOptions = {}) {
  const { contentType = "all", status = "all", search = "" } = options

  // URL 생성 - useMemo로 불필요한 재계산 방지
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams()
    if (contentType !== "all") params.append("content_type", contentType)
    if (status !== "all") params.append("status", status)
    if (search) params.append("search", search)
    const queryString = params.toString()
    return `/api/content-posts${queryString ? `?${queryString}` : ""}`
  }, [contentType, status, search])

  const { data, error, isLoading, mutate } = useSWR<
    ApiResponse<ContentPost[]>
  >(apiUrl, fetcher)

  const posts = data?.data ?? []

  // 상태별 카운트 - useMemo로 최적화
  const statusCounts = useMemo(
    () => ({
      all: posts.length,
      draft: posts.filter((p) => p.status === "draft").length,
      ready: posts.filter((p) => p.status === "ready").length,
      published: posts.filter((p) => p.status === "published").length,
      archived: posts.filter((p) => p.status === "archived").length,
    }),
    [posts]
  )

  // 콘텐츠 생성
  const createPost = useCallback(
    async (formData: ContentPostFormData) => {
      try {
        const response = await fetch("/api/content-posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || "생성 실패")
        }

        toast.success("콘텐츠가 저장되었습니다.")
        mutate()
        return result.data as ContentPost
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "저장에 실패했습니다."
        toast.error(message)
        throw error
      }
    },
    [mutate]
  )

  // 콘텐츠 수정
  const updatePost = useCallback(
    async (id: string, formData: Partial<ContentPostFormData>) => {
      try {
        const response = await fetch(`/api/content-posts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        })

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || "수정 실패")
        }

        toast.success("콘텐츠가 수정되었습니다.")
        mutate()
        return result.data as ContentPost
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "수정에 실패했습니다."
        toast.error(message)
        throw error
      }
    },
    [mutate]
  )

  // 콘텐츠 삭제
  const deletePost = useCallback(
    async (id: string) => {
      try {
        const response = await fetch(`/api/content-posts/${id}`, {
          method: "DELETE",
        })

        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || "삭제 실패")
        }

        toast.success("콘텐츠가 삭제되었습니다.")
        mutate()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "삭제에 실패했습니다."
        toast.error(message)
        throw error
      }
    },
    [mutate]
  )

  // 상태 변경
  const changeStatus = useCallback(
    async (id: string, newStatus: ContentStatus) => {
      const payload: Partial<ContentPostFormData> = { status: newStatus }

      // 발행됨으로 변경 시 발행일 자동 설정
      if (newStatus === "published") {
        payload.published_at = new Date().toISOString()
      }

      await updatePost(id, payload)
    },
    [updatePost]
  )

  return {
    posts,
    isLoading,
    error,
    statusCounts,
    createPost,
    updatePost,
    deletePost,
    changeStatus,
    refresh: mutate,
  }
}
