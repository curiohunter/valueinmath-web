"use client"

import useSWR from "swr"
import { useMemo } from "react"
import { fetcher, type ApiResponse } from "@/lib/api/fetcher"
import type { ContentImage } from "@/types/content-image"

interface UseGalleryImagesOptions {
  enabled?: boolean
}

/**
 * 갤러리 이미지 조회 훅
 * - 이미지 선택기에서 사용
 * - enabled 옵션으로 조건부 페칭 지원
 */
export function useGalleryImages(options: UseGalleryImagesOptions = {}) {
  const { enabled = true } = options

  const { data, error, isLoading } = useSWR<ApiResponse<ContentImage[]>>(
    enabled ? "/api/content-images" : null,
    fetcher
  )

  const images = data?.data ?? []

  // ID로 이미지 찾기 - Map 활용으로 O(1) 조회
  const imageMap = useMemo(() => {
    return new Map(images.map((img) => [img.id, img]))
  }, [images])

  const getImageById = (id: string) => imageMap.get(id)

  const getImagesByIds = (ids: string[]) => {
    return ids.map((id) => imageMap.get(id)).filter(Boolean) as ContentImage[]
  }

  return {
    images,
    isLoading,
    error,
    getImageById,
    getImagesByIds,
  }
}
