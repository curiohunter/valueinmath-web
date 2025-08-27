"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Todo } from "@/types/workspace"
import { cn } from "@/lib/utils"

interface TodoModalProps {
  isOpen: boolean
  onClose: () => void
  todo?: Todo | null
  user?: any
}

export function TodoModal({ isOpen, onClose, todo, user }: TodoModalProps) {
  const [loading, setLoading] = useState(false)
  const [profiles, setProfiles] = useState<any[]>([])
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as Todo['priority'],
    status: "pending" as Todo['status'],
    assigned_to: "",
    due_date: null as Date | null,
  })

  const supabase = createClient()

  useEffect(() => {
    if (todo) {
      setFormData({
        title: todo.title,
        description: todo.description || "",
        priority: todo.priority,
        status: todo.status,
        assigned_to: todo.assigned_to || "",
        due_date: todo.due_date ? new Date(todo.due_date) : null,
      })
    } else {
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        status: "pending",
        assigned_to: "",
        due_date: null,
      })
    }
  }, [todo])

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('auth_id, name')
        .eq('status', '재직')
        .not('auth_id', 'is', null)  // auth_id가 null이 아닌 것만
        .order('name')
      
      if (error) throw error
      // auth_id를 id로 사용하도록 매핑
      const mappedData = data?.map(emp => ({
        id: emp.auth_id,
        name: emp.name
      })) || []
      setProfiles(mappedData)
    } catch (error) {
      console.error('프로필 목록 로드 오류:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      toast.error('제목을 입력해주세요')
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
          .single()
        
        if (employee?.name) {
          userName = employee.name
        }
      }
      
      const assignedProfile = profiles.find(p => p.id === formData.assigned_to)
      
      const todoData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        priority: formData.priority,
        status: formData.status,
        assigned_to: formData.assigned_to || null,
        assigned_name: assignedProfile?.name || null,
        due_date: formData.due_date ? format(formData.due_date, 'yyyy-MM-dd') : null,
        created_by: currentUser?.id || null,
        created_by_name: userName || null,
      }

      if (todo) {
        // 수정
        const { error } = await supabase
          .from('todos')
          .update({
            ...todoData,
            updated_at: new Date().toISOString()
          })
          .eq('id', todo.id)
        
        if (error) throw error
        toast.success('업무가 수정되었습니다')
      } else {
        // 생성
        const { error } = await supabase
          .from('todos')
          .insert(todoData)
        
        if (error) throw error
        toast.success('업무가 등록되었습니다')
      }
      
      onClose()
    } catch (error) {
      console.error('업무 저장 오류:', error)
      toast.error('업무 저장에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{todo ? '업무 수정' : '새 업무 등록'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 제목 */}
          <div>
            <Label htmlFor="title">제목 *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="업무 제목을 입력하세요"
              disabled={loading}
              required
            />
          </div>

          {/* 설명 */}
          <div>
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="상세 설명을 입력하세요"
              disabled={loading}
              rows={3}
            />
          </div>

          {/* 우선순위와 상태 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">우선순위</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: Todo['priority']) => 
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">🔴 긴급</SelectItem>
                  <SelectItem value="high">🟡 높음</SelectItem>
                  <SelectItem value="medium">🟢 보통</SelectItem>
                  <SelectItem value="low">⚪ 낮음</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">상태</Label>
              <Select
                value={formData.status}
                onValueChange={(value: Todo['status']) => 
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">대기</SelectItem>
                  <SelectItem value="in_progress">진행중</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 담당자 */}
          <div>
            <Label htmlFor="assigned_to">담당자</Label>
            <Select
              value={formData.assigned_to || "unassigned"}
              onValueChange={(value) => setFormData({ ...formData, assigned_to: value === "unassigned" ? "" : value })}
            >
              <SelectTrigger id="assigned_to">
                <SelectValue placeholder="담당자를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">미지정</SelectItem>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 마감일 */}
          <div>
            <Label>마감일</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.due_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.due_date 
                    ? format(formData.due_date, "PPP", { locale: ko })
                    : "마감일을 선택하세요"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.due_date || undefined}
                  onSelect={(date) => setFormData({ ...formData, due_date: date || null })}
                  initialFocus
                  locale={ko}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '저장 중...' : (todo ? '수정' : '등록')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}