'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Database } from '@/types/database'

type Student = Database['public']['Tables']['students']['Row']

export interface ConsultationData extends Student {
  entrance_tests?: any[]
}

interface ConsultationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  consultation: ConsultationData | null
  onSave: (data: Partial<ConsultationData>) => void
}

// 한국 시간 기준 날짜 문자열 가져오기
function getKoreanDateString() {
  const koreaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })
  const date = new Date(koreaTime)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function ConsultationModal({
  open,
  onOpenChange,
  consultation,
  onSave
}: ConsultationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [endDateError, setEndDateError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    student_phone: '',
    parent_phone: '',
    school: '',
    school_type: '',
    grade: 1,
    department: '',
    lead_source: '',
    status: '신규상담',
    has_sibling: false,
    start_date: '',
    end_date: '',
    first_contact_date: getKoreanDateString(),
    notes: ''
  })

  useEffect(() => {
    if (consultation) {
      setFormData({
        name: consultation.name || '',
        student_phone: consultation.student_phone || '',
        parent_phone: consultation.parent_phone || '',
        school: consultation.school || '',
        school_type: consultation.school_type || '',
        grade: consultation.grade || 1,
        department: consultation.department || '',
        lead_source: consultation.lead_source || '',
        status: consultation.status || '신규상담',
        has_sibling: consultation.has_sibling || false,
        start_date: consultation.start_date?.split('T')[0] || '',
        end_date: consultation.end_date?.split('T')[0] || '',
        first_contact_date: consultation.first_contact_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        notes: consultation.notes || ''
      })
      setEndDateError(null)
    } else {
      setFormData({
        name: '',
        student_phone: '',
        parent_phone: '',
        school: '',
        school_type: '',
        grade: 1,
        department: '',
        lead_source: '',
        status: '신규상담',
        has_sibling: false,
        start_date: '',
        end_date: '',
        first_contact_date: getKoreanDateString(),
        notes: ''
      })
      setEndDateError(null)
    }
  }, [consultation, open])

  // 상태가 변경될 때 종료일 에러 초기화
  useEffect(() => {
    if (formData.status !== "퇴원") {
      setEndDateError(null)
    }
  }, [formData.status])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 퇴원 상태일 때 종료일 필수 검증
    if (formData.status === "퇴원" && !formData.end_date) {
      setEndDateError("퇴원 상태인 경우 종료일을 입력해야 합니다")
      return
    }

    setIsSubmitting(true)
    try {
      // 퇴원 처리 시 날짜 저장 로그 추가
      if (formData.status === '퇴원' && formData.end_date) {
        // 퇴원 처리 로직 (로그 제거됨)
      }

      // 데이터 처리
      const submitData = {
        name: formData.name,
        student_phone: formData.student_phone || null,
        parent_phone: formData.parent_phone || null,
        school: formData.school || null,
        school_type: formData.school_type || null,
        grade: formData.grade,
        department: formData.department || null,
        lead_source: formData.lead_source || null,
        status: formData.status,
        has_sibling: formData.has_sibling,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        first_contact_date: formData.first_contact_date || null,
        notes: formData.notes || null
      }
      
      await onSave(submitData)
      // 성공 시에만 모달 닫기 (onSave 내부에서 처리)
    } catch (error: any) {
      console.error('신규상담 저장 오류:', error)
      // 에러는 onSave 함수에서 처리
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{consultation ? '신규상담 수정' : '신규상담 추가'}</DialogTitle>
          <DialogDescription>
            {consultation ? '학생의 신규상담 정보를 수정하세요.' : '새로운 학생을 등록하세요. 모든 필수 정보를 입력해주세요.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 기본 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">기본 정보</h3>
              
              <div>
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  placeholder="홍길동"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="student_phone">학생 연락처</Label>
                <Input
                  id="student_phone"
                  placeholder="01012345678"
                  value={formData.student_phone}
                  onChange={(e) => setFormData({ ...formData, student_phone: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="parent_phone">학부모 연락처</Label>
                <Input
                  id="parent_phone"
                  placeholder="01012345678"
                  value={formData.parent_phone}
                  onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="status">상태 *</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="상태 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="재원">재원</SelectItem>
                    <SelectItem value="퇴원">퇴원</SelectItem>
                    <SelectItem value="휴원">휴원</SelectItem>
                    <SelectItem value="미등록">미등록</SelectItem>
                    <SelectItem value="신규상담">신규상담</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="department">담당관</Label>
                <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="담당관 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="고등관">고등관</SelectItem>
                    <SelectItem value="중등관">중등관</SelectItem>
                    <SelectItem value="영재관">영재관</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="has_sibling"
                  checked={formData.has_sibling}
                  onChange={(e) => setFormData({ ...formData, has_sibling: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="has_sibling">형제자매 여부</Label>
              </div>
            </div>

            {/* 학교 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">학교 정보</h3>
              
              <div>
                <Label htmlFor="school">학교</Label>
                <Input
                  id="school"
                  placeholder="OO중"
                  value={formData.school}
                  onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="school_type">학교 유형</Label>
                <Select value={formData.school_type} onValueChange={(value) => setFormData({ ...formData, school_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="학교 유형 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="초등학교">초등학교</SelectItem>
                    <SelectItem value="중학교">중학교</SelectItem>
                    <SelectItem value="고등학교">고등학교</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="grade">학년</Label>
                <Select value={formData.grade.toString()} onValueChange={(value) => setFormData({ ...formData, grade: parseInt(value) })}>
                  <SelectTrigger>
                    <SelectValue placeholder="학년 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1학년</SelectItem>
                    <SelectItem value="2">2학년</SelectItem>
                    <SelectItem value="3">3학년</SelectItem>
                    <SelectItem value="4">4학년</SelectItem>
                    <SelectItem value="5">5학년</SelectItem>
                    <SelectItem value="6">6학년</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="lead_source">유입경로</Label>
                <Select value={formData.lead_source} onValueChange={(value) => setFormData({ ...formData, lead_source: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="유입경로 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="블로그">블로그</SelectItem>
                    <SelectItem value="입소문">입소문</SelectItem>
                    <SelectItem value="전화상담">전화상담</SelectItem>
                    <SelectItem value="원외학부모추천">원외학부모추천</SelectItem>
                    <SelectItem value="원내학부모추천">원내학부모추천</SelectItem>
                    <SelectItem value="원내친구추천">원내친구추천</SelectItem>
                    <SelectItem value="원외친구추천">원외친구추천</SelectItem>
                    <SelectItem value="오프라인">오프라인</SelectItem>
                    <SelectItem value="형제">형제</SelectItem>
                    <SelectItem value="문자메세지">문자메세지</SelectItem>
                    <SelectItem value="부원장">부원장</SelectItem>
                    <SelectItem value="맘까페">맘까페</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 날짜 정보 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">날짜 정보</h3>
              
              <div>
                <Label htmlFor="start_date">시작일</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="end_date">종료일 {formData.status === "퇴원" && <span className="text-red-500">*</span>}</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => {
                    setFormData({ ...formData, end_date: e.target.value })
                    if (formData.status === "퇴원") {
                      setEndDateError(null)
                    }
                  }}
                  className={endDateError ? "border-red-500" : ""}
                />
                {endDateError && (
                  <p className="text-sm text-red-500 mt-1">{endDateError}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="first_contact_date">최초상담일</Label>
                <Input
                  id="first_contact_date"
                  type="date"
                  value={formData.first_contact_date}
                  onChange={(e) => setFormData({ ...formData, first_contact_date: e.target.value })}
                />
              </div>
            </div>

            {/* 메모 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">추가 정보</h3>
              
              <div>
                <Label htmlFor="notes">메모</Label>
                <Textarea
                  id="notes"
                  placeholder="학생에 대한 추가 정보를 입력하세요."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="min-h-[120px]"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '처리 중...' : consultation ? '수정' : '등록'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}