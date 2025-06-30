"use client"

import { useState } from "react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import { claudeUtils } from "@/types/claude"

interface TagsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tags: string[]
  onTagSelect: (tag: string) => void
  selectedTags?: string[]
}

export function TagsModal({ 
  open, 
  onOpenChange, 
  tags, 
  onTagSelect, 
  selectedTags = [] 
}: TagsModalProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // 태그 배열에서 유효한 문자열만 필터링
  const validTags = tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0)

  const filteredTags = validTags.filter(tag => 
    tag.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleTagClick = (tag: string) => {
    onTagSelect(tag)
  }

  const clearSearch = () => {
    setSearchQuery("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">활성 태그 목록</DialogTitle>
          <DialogDescription>
            태그를 클릭하여 검색 필터에 추가할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 검색 입력창 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="태그 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                onClick={clearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* 태그 통계 */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>총 {validTags.length}개 태그</span>
            {searchQuery && (
              <span>검색 결과: {filteredTags.length}개</span>
            )}
            {selectedTags.length > 0 && (
              <span>선택된 태그: {selectedTags.length}개</span>
            )}
          </div>

          {/* 태그 목록 */}
          <div className="max-h-96 overflow-y-auto">
            {filteredTags.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? "검색 결과가 없습니다." : "태그가 없습니다."}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {filteredTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag)
                  const tagColor = claudeUtils.getTagColor(tag)
                  
                  return (
                    <Button
                      key={tag}
                      variant="ghost"
                      size="sm"
                      className={`h-auto p-0 justify-start hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        isSelected ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => handleTagClick(tag)}
                    >
                      <Badge
                        className="w-full justify-center text-white hover:opacity-80 transition-opacity cursor-pointer"
                        style={{ 
                          backgroundColor: tagColor,
                          border: 'none'
                        }}
                      >
                        {tag}
                      </Badge>
                    </Button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 선택된 태그 표시 */}
          {selectedTags.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">선택된 태그:</h4>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}