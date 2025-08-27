"use client"

import { useState, useEffect } from "react"
import { Send, User, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import type { Comment } from "@/types/workspace"
import { format, isToday } from "date-fns"
import { ko } from "date-fns/locale"
import { toast } from "sonner"

interface CommentThreadProps {
  parentType: 'todo' | 'memo'
  parentId: string
  onCommentCountChange?: (change: number) => void
}

export function CommentThread({ parentType, parentId, onCommentCountChange }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  
  const supabase = createClient()

  useEffect(() => {
    loadComments()
    loadUser()
    setupRealtimeSubscription()
    
    return () => {
      supabase.removeAllChannels()
    }
  }, [parentId])

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: employee } = await supabase
        .from('employees')
        .select('name')
        .eq('auth_id', user.id)
        .eq('status', '재직')
        .single()
      
      setUser({ ...user, name: employee?.name || user.email })
    }
  }

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('parent_type', parentType)
        .eq('parent_id', parentId)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error('댓글 로드 오류:', error)
    }
  }

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`comments-${parentId}`)
      .on('postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'comments',
          filter: `parent_id=eq.${parentId}`
        },
        (payload) => {
          console.log('Comment realtime event:', payload)
          if (payload.eventType === 'INSERT') {
            // 중복 방지를 위해 이미 존재하는지 확인
            setComments(prev => {
              const exists = prev.some(c => c.id === payload.new.id)
              if (!exists) {
                return [...prev, payload.new as Comment]
              }
              return prev
            })
          } else if (payload.eventType === 'DELETE') {
            setComments(prev => prev.filter(c => c.id !== (payload.old as any).id))
          } else if (payload.eventType === 'UPDATE') {
            setComments(prev => prev.map(c => 
              c.id === (payload.new as any).id ? payload.new as Comment : c
            ))
          }
        }
      )
      .subscribe((status) => {
        console.log('Comment subscription status:', status)
      })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newComment.trim() || !user) return
    
    setLoading(true)
    try {
      const commentData = {
        parent_type: parentType,
        parent_id: parentId,
        content: newComment.trim(),
        created_by: user.id,
        created_by_name: user.name
      }
      
      const { data, error } = await supabase
        .from('comments')
        .insert(commentData)
        .select()
        .single()
      
      if (error) throw error
      
      // 실시간 업데이트가 느릴 경우를 대비해 즉시 로컬 상태 업데이트
      if (data) {
        setComments(prev => [...prev, data])
        // 부모 컴포넌트에 댓글 수 증가 알림
        onCommentCountChange?.(1)
      }
      
      setNewComment("")
      toast.success('댓글이 등록되었습니다')
    } catch (error) {
      console.error('댓글 등록 오류:', error)
      toast.error('댓글 등록에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return
    
    try {
      // 즉시 로컬 상태 업데이트
      setComments(prev => prev.filter(c => c.id !== commentId))
      // 부모 컴포넌트에 댓글 수 감소 알림
      onCommentCountChange?.(-1)
      
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
      
      if (error) {
        // 에러 시 롤백
        loadComments()
        onCommentCountChange?.(1) // 롤백 시 다시 증가
        throw error
      }
      toast.success('댓글이 삭제되었습니다')
    } catch (error) {
      console.error('댓글 삭제 오류:', error)
      toast.error('댓글 삭제에 실패했습니다')
    }
  }

  return (
    <div className="space-y-3 bg-gray-50 rounded-lg p-3">
      {/* 댓글 목록 */}
      <div className="space-y-2">
        {comments.map(comment => (
          <div key={comment.id} className="bg-white rounded p-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 text-xs text-gray-500 mb-1">
                  <div className="flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    {comment.created_by_name || '알 수 없음'}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {isToday(new Date(comment.created_at))
                      ? format(new Date(comment.created_at), 'HH:mm', { locale: ko })
                      : format(new Date(comment.created_at), 'M월 d일 HH:mm', { locale: ko })}
                  </div>
                </div>
                <div className="text-sm">{comment.content}</div>
              </div>
              
              {/* 본인 댓글만 삭제 가능 */}
              {user?.id === comment.created_by && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="text-xs text-red-500 hover:text-red-700 ml-2"
                >
                  삭제
                </button>
              )}
            </div>
          </div>
        ))}
        
        {comments.length === 0 && (
          <div className="text-center py-2 text-xs text-gray-500">
            아직 댓글이 없습니다
          </div>
        )}
      </div>

      {/* 댓글 입력 */}
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="댓글을 입력하세요..."
          className="flex-1 min-h-[60px] text-sm resize-none"
          disabled={loading || !user}
        />
        <Button
          type="submit"
          size="icon"
          disabled={loading || !newComment.trim() || !user}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}