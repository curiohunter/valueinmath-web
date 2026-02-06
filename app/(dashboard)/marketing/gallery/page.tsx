"use client"

import React, { useState, useCallback, useRef } from "react"
import useSWR, { mutate } from "swr"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
  Upload,
  Image as ImageIcon,
  Filter,
  Search,
  X,
  CheckCircle,
  Trash2,
  Edit,
  MoreHorizontal,
  Tag,
  Calendar,
  Eye,
} from "lucide-react"
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
import type { ContentImage, ImageCategory } from "@/types/content-image"
import { IMAGE_CATEGORIES } from "@/types/content-image"
import MarketingTabs from "@/components/marketing/MarketingTabs"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function GalleryPage() {
  const [category, setCategory] = useState<ImageCategory | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedImage, setSelectedImage] = useState<ContentImage | null>(null)
  const [editImage, setEditImage] = useState<ContentImage | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // API URL 생성
  const apiUrl = `/api/content-images${category !== "all" ? `?category=${category}` : ""}`
  const { data, isLoading } = useSWR<{ success: boolean; data: ContentImage[] }>(
    apiUrl,
    fetcher
  )

  const images = data?.data || []

  // 검색 필터링
  const filteredImages = images.filter((img) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      img.title?.toLowerCase().includes(query) ||
      img.caption?.toLowerCase().includes(query) ||
      img.tags?.some((t) => t.toLowerCase().includes(query))
    )
  })

  // 파일 업로드 처리
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)

    const supabase = createClient()
    const totalFiles = files.length
    let uploaded = 0

    try {
      for (const file of Array.from(files)) {
        // 파일 확장자 및 타입 검사
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name}은 이미지 파일이 아닙니다.`)
          continue
        }

        // 파일 크기 검사 (10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name}은 10MB를 초과합니다.`)
          continue
        }

        // 고유한 파일 경로 생성
        const timestamp = Date.now()
        const ext = file.name.split(".").pop()
        const path = `uploads/${timestamp}-${Math.random().toString(36).slice(2)}.${ext}`

        // Storage에 업로드
        const { error: uploadError } = await supabase.storage
          .from("content-images")
          .upload(path, file)

        if (uploadError) {
          console.error("업로드 오류:", uploadError)
          toast.error(`${file.name} 업로드 실패`)
          continue
        }

        // 이미지 크기 가져오기
        const img = new window.Image()
        const imgPromise = new Promise<{ width: number; height: number }>((resolve) => {
          img.onload = () => resolve({ width: img.width, height: img.height })
          img.onerror = () => resolve({ width: 0, height: 0 })
        })
        img.src = URL.createObjectURL(file)
        const dimensions = await imgPromise

        // 메타데이터 저장
        const response = await fetch("/api/content-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storage_path: path,
            original_filename: file.name,
            file_size: file.size,
            mime_type: file.type,
            width: dimensions.width,
            height: dimensions.height,
            category: "daily",
          }),
        })

        if (!response.ok) {
          toast.error(`${file.name} 정보 저장 실패`)
          continue
        }

        uploaded++
        setUploadProgress(Math.round((uploaded / totalFiles) * 100))
      }

      if (uploaded > 0) {
        toast.success(`${uploaded}개 이미지 업로드 완료`)
        mutate(apiUrl)
      }
    } catch (error) {
      console.error("업로드 중 오류:", error)
      toast.error("업로드 중 오류가 발생했습니다.")
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [apiUrl])

  // 드래그 앤 드롭 처리
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      handleFileUpload(e.dataTransfer.files)
    },
    [handleFileUpload]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // 이미지 수정
  const handleSaveEdit = async () => {
    if (!editImage) return

    try {
      const response = await fetch(`/api/content-images/${editImage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editImage.title,
          caption: editImage.caption,
          category: editImage.category,
          tags: editImage.tags,
          privacy_consent: editImage.privacy_consent,
        }),
      })

      if (!response.ok) throw new Error("수정 실패")

      toast.success("이미지 정보가 수정되었습니다.")
      setEditImage(null)
      mutate(apiUrl)
    } catch (error) {
      console.error("수정 오류:", error)
      toast.error("수정에 실패했습니다.")
    }
  }

  // 이미지 삭제
  const handleDelete = async (image: ContentImage) => {
    if (!confirm("이 이미지를 삭제하시겠습니까?")) return

    try {
      const response = await fetch(`/api/content-images/${image.id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("삭제 실패")

      toast.success("이미지가 삭제되었습니다.")
      setSelectedImage(null)
      mutate(apiUrl)
    } catch (error) {
      console.error("삭제 오류:", error)
      toast.error("삭제에 실패했습니다.")
    }
  }

  return (
    <div className="space-y-6">
      <MarketingTabs />

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">콘텐츠 갤러리</h1>
          <p className="text-muted-foreground">마케팅 콘텐츠용 이미지 관리</p>
        </div>
        <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
          <Upload className="w-4 h-4 mr-2" />
          {isUploading ? `업로드 중 (${uploadProgress}%)` : "이미지 업로드"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
        />
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as ImageCategory | "all")}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="카테고리" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {IMAGE_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="제목, 설명, 태그로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredImages.length}개 이미지
        </div>
      </div>

      {/* 드래그 앤 드롭 영역 / 이미지 그리드 */}
      <div
        className="min-h-[400px] border-2 border-dashed rounded-lg p-4"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">로딩 중...</div>
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <ImageIcon className="w-12 h-12 mb-4" />
            <p>이미지를 드래그하여 업로드하세요</p>
            <p className="text-sm">또는 위 버튼을 클릭하세요</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredImages.map((image) => (
              <div
                key={image.id}
                className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer border hover:border-primary transition-colors"
                onClick={() => setSelectedImage(image)}
              >
                <img
                  src={image.public_url}
                  alt={image.alt_text || image.title || "이미지"}
                  className="w-full h-full object-cover"
                />

                {/* 오버레이 */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Eye className="w-8 h-8 text-white" />
                </div>

                {/* 초상권 동의 배지 */}
                {image.privacy_consent && (
                  <div className="absolute top-2 left-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                )}

                {/* 카테고리 배지 */}
                <div className="absolute bottom-2 left-2">
                  <Badge variant="secondary" className="text-xs">
                    {IMAGE_CATEGORIES.find((c) => c.value === image.category)?.label}
                  </Badge>
                </div>

                {/* 메뉴 */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="secondary" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditImage(image)
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        수정
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(image)
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 이미지 상세 모달 */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          {selectedImage && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                <img
                  src={selectedImage.public_url}
                  alt={selectedImage.alt_text || "이미지"}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-4">
                <DialogHeader>
                  <DialogTitle>{selectedImage.title || "제목 없음"}</DialogTitle>
                </DialogHeader>

                {selectedImage.caption && (
                  <p className="text-muted-foreground">{selectedImage.caption}</p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    <span className="font-medium">카테고리:</span>
                    <Badge variant="outline">
                      {IMAGE_CATEGORIES.find((c) => c.value === selectedImage.category)?.label}
                    </Badge>
                  </div>

                  {selectedImage.tags && selectedImage.tags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="w-4 h-4" />
                      <span className="font-medium">태그:</span>
                      {selectedImage.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  )}

                  {selectedImage.taken_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">촬영일:</span>
                      <span>{selectedImage.taken_at}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">초상권 동의:</span>
                    <span>{selectedImage.privacy_consent ? "동의함" : "미동의"}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span className="font-medium">사용 횟수:</span>
                    <span>{selectedImage.used_count}회</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditImage(selectedImage)
                      setSelectedImage(null)
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    수정
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(selectedImage)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    삭제
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 이미지 수정 모달 */}
      <Dialog open={!!editImage} onOpenChange={() => setEditImage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이미지 정보 수정</DialogTitle>
          </DialogHeader>
          {editImage && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>제목</Label>
                <Input
                  value={editImage.title || ""}
                  onChange={(e) =>
                    setEditImage({ ...editImage, title: e.target.value })
                  }
                  placeholder="이미지 제목"
                />
              </div>

              <div className="space-y-2">
                <Label>설명</Label>
                <Textarea
                  value={editImage.caption || ""}
                  onChange={(e) =>
                    setEditImage({ ...editImage, caption: e.target.value })
                  }
                  placeholder="이미지 설명"
                />
              </div>

              <div className="space-y-2">
                <Label>카테고리</Label>
                <Select
                  value={editImage.category}
                  onValueChange={(v) =>
                    setEditImage({ ...editImage, category: v as ImageCategory })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>태그 (쉼표로 구분)</Label>
                <Input
                  value={editImage.tags?.join(", ") || ""}
                  onChange={(e) =>
                    setEditImage({
                      ...editImage,
                      tags: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="태그1, 태그2, ..."
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="privacy"
                  checked={editImage.privacy_consent}
                  onCheckedChange={(checked) =>
                    setEditImage({ ...editImage, privacy_consent: !!checked })
                  }
                />
                <Label htmlFor="privacy">초상권 사용 동의 확인</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditImage(null)}>
              취소
            </Button>
            <Button onClick={handleSaveEdit}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
