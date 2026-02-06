"use client"

import { useState, useCallback, memo } from "react"
import Image from "next/image"
import { Check, Image as ImageIcon, X, Star, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useGalleryImages } from "./hooks/use-gallery-images"
import type { ContentImage } from "@/types/content-image"

interface ImagePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedIds: string[]
  coverId?: string
  onSelect: (ids: string[], coverId?: string) => void
}

/**
 * 이미지 선택기 모달
 * - 갤러리에서 이미지 다중 선택
 * - 커버 이미지 지정
 * - 검색 필터링
 */
function ImagePickerComponent({
  open,
  onOpenChange,
  selectedIds,
  coverId,
  onSelect,
}: ImagePickerProps) {
  const { images, isLoading } = useGalleryImages({ enabled: open })
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedIds)
  const [localCoverId, setLocalCoverId] = useState<string | undefined>(coverId)
  const [searchQuery, setSearchQuery] = useState("")

  // 모달 열릴 때 상태 동기화
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setLocalSelectedIds(selectedIds)
        setLocalCoverId(coverId)
        setSearchQuery("")
      }
      onOpenChange(isOpen)
    },
    [selectedIds, coverId, onOpenChange]
  )

  // 이미지 선택/해제
  const toggleImage = useCallback((imageId: string) => {
    setLocalSelectedIds((prev) => {
      if (prev.includes(imageId)) {
        // 해제 시 커버도 해제
        if (localCoverId === imageId) {
          setLocalCoverId(undefined)
        }
        return prev.filter((id) => id !== imageId)
      }
      return [...prev, imageId]
    })
  }, [localCoverId])

  // 커버 이미지 토글
  const toggleCover = useCallback((imageId: string) => {
    setLocalCoverId((prev) => (prev === imageId ? undefined : imageId))
    // 커버 설정 시 선택에도 추가
    if (!localSelectedIds.includes(imageId)) {
      setLocalSelectedIds((prev) => [...prev, imageId])
    }
  }, [localSelectedIds])

  // 선택 완료
  const handleConfirm = useCallback(() => {
    onSelect(localSelectedIds, localCoverId)
    onOpenChange(false)
  }, [localSelectedIds, localCoverId, onSelect, onOpenChange])

  // 검색 필터링
  const filteredImages = images.filter((img) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      img.title?.toLowerCase().includes(query) ||
      img.tags?.some((t) => t.toLowerCase().includes(query))
    )
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>갤러리에서 이미지 선택</DialogTitle>
          <DialogDescription>
            콘텐츠에 사용할 이미지를 선택하세요. 별 아이콘을 클릭하면 커버 이미지로 지정됩니다.
          </DialogDescription>
        </DialogHeader>

        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="제목, 태그로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 이미지 그리드 */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="grid grid-cols-4 gap-3 py-4">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-lg bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <ImageIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>이미지가 없습니다.</p>
              <p className="text-sm mt-1">
                콘텐츠 갤러리에서 먼저 이미지를 업로드해주세요.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 py-4">
              {filteredImages.map((image) => {
                const isSelected = localSelectedIds.includes(image.id)
                const isCover = localCoverId === image.id

                return (
                  <div
                    key={image.id}
                    className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all group ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent hover:border-muted-foreground/50"
                    }`}
                    onClick={() => toggleImage(image.id)}
                  >
                    {image.public_url ? (
                      <Image
                        src={image.public_url}
                        alt={image.title || ""}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 25vw, 20vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}

                    {/* 선택 체크 */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="h-3 w-3" />
                      </div>
                    )}

                    {/* 커버 표시 */}
                    {isCover && (
                      <Badge className="absolute top-2 left-2 bg-yellow-500 hover:bg-yellow-500">
                        <Star className="h-3 w-3 fill-current mr-1" />
                        커버
                      </Badge>
                    )}

                    {/* 호버 시 커버 설정 버튼 */}
                    {isSelected && (
                      <button
                        type="button"
                        className="absolute bottom-2 right-2 bg-black/70 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleCover(image.id)
                        }}
                        title={isCover ? "커버 해제" : "커버로 설정"}
                      >
                        <Star
                          className={`h-3 w-3 ${isCover ? "fill-yellow-400 text-yellow-400" : ""}`}
                        />
                      </button>
                    )}

                    {/* 제목 */}
                    {image.title && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white text-xs p-2 pt-4 truncate">
                        {image.title}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-muted-foreground">
              {localSelectedIds.length}개 선택됨
              {localCoverId && " (커버 1개 포함)"}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                취소
              </Button>
              <Button onClick={handleConfirm}>선택 완료</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export const ImagePicker = memo(ImagePickerComponent)
