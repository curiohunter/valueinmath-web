"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Memo } from "@/types/workspace"
import { cn } from "@/lib/utils"

interface MemoModalProps {
  isOpen: boolean
  onClose: () => void
  memo?: Memo | null
  user?: any
}

export function MemoModal({ isOpen, onClose, memo, user }: MemoModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "general" as Memo['category'],
    is_pinned: false,
    expires_at: null as Date | null,
  })

  const supabase = createClient()

  useEffect(() => {
    if (memo) {
      setFormData({
        title: memo.title,
        content: memo.content,
        category: memo.category,
        is_pinned: memo.is_pinned,
        expires_at: memo.expires_at ? new Date(memo.expires_at) : null,
      })
    } else {
      setFormData({
        title: "",
        content: "",
        category: "general",
        is_pinned: false,
        expires_at: null,
      })
    }
  }, [memo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('제목과 내용을 모두 입력해주세요')
      return
    }

    setLoading(true)
    try {
      // 현재 유저 정보 가져오기
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      let userName = currentUser?.email
      
      if (currentUser) {
        // employees 테이블에서 이름 가져오기  
        const { data: employee } = await supabase
          .from('employees')
          .select('name')
          .eq('auth_id', currentUser.id)
          .eq('status', '재직')
          .single()
        
        if (employee?.name) {
          userName = employee.name
        }
      }
      
      const memoData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        category: formData.category,
        is_pinned: formData.is_pinned,
        expires_at: formData.expires_at ? format(formData.expires_at, 'yyyy-MM-dd') : null,
        created_by: currentUser?.id || null,
        created_by_name: userName || null,
        last_activity_at: new Date().toISOString(),
      }

      if (memo) {
        // 수정
        const { error } = await supabase
          .from('memos')
          .update({
            ...memoData,
            updated_at: new Date().toISOString()
          })
          .eq('id', memo.id)
        
        if (error) throw error
        toast.success('메모가 수정되었습니다')
      } else {
        // 생성
        const { error } = await supabase
          .from('memos')
          .insert(memoData)
        
        if (error) throw error
        toast.success('메모가 등록되었습니다')
      }
      
      onClose()
    } catch (error) {
      console.error('메모 저장 오류:', error)
      toast.error('메모 저장에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{memo ? '메모 수정' : '새 메모 작성'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 제목 */}
          <div>
            <Label htmlFor="title">제목 *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="메모 제목을 입력하세요"
              disabled={loading}
              required
            />
          </div>

          {/* 내용 */}
          <div>
            <Label htmlFor="content">내용 *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="메모 내용을 입력하세요"
              disabled={loading}
              rows={5}
              required
            />
          </div>

          {/* 카테고리 */}
          <div>
            <Label htmlFor="category">카테고리</Label>
            <Select
              value={formData.category}
              onValueChange={(value: Memo['category']) => 
                setFormData({ ...formData, category: value })
              }
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="notice">📢 공지</SelectItem>
                <SelectItem value="idea">💡 아이디어</SelectItem>
                <SelectItem value="reminder">⏰ 리마인더</SelectItem>
                <SelectItem value="general">📝 일반</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 고정 여부 */}
          <div className="flex items-center justify-between">
            <Label htmlFor="is_pinned" className="flex items-center">
              상단 고정
            </Label>
            <Switch
              id="is_pinned"
              checked={formData.is_pinned}
              onCheckedChange={(checked) => setFormData({ ...formData, is_pinned: checked })}
              disabled={loading}
            />
          </div>

          {/* 만료일 */}
          <div>
            <Label>만료일 (선택사항)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.expires_at && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.expires_at 
                    ? format(formData.expires_at, "PPP", { locale: ko })
                    : "만료일을 선택하세요"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.expires_at || undefined}
                  onSelect={(date) => setFormData({ ...formData, expires_at: date || null })}
                  initialFocus
                  locale={ko}
                />
              </PopoverContent>
            </Popover>
            {formData.expires_at && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setFormData({ ...formData, expires_at: null })}
              >
                만료일 제거
              </Button>
            )}
          </div>

          {/* 버튼 */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '저장 중...' : (memo ? '수정' : '등록')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}