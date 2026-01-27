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
import { createClient } from "@/lib/supabase/client"
import type { Database } from '@/types/database'

type EntranceTest = Database['public']['Tables']['entrance_tests']['Row']

export interface EntranceTestData extends EntranceTest {
  student_name?: string
}

interface TestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  test: EntranceTestData | null
  onSave: (data: Partial<EntranceTestData>) => Promise<boolean> | void
  onStatusChange?: () => void
}

export function TestModal({
  open,
  onOpenChange,
  test,
  onSave,
  onStatusChange
}: TestModalProps) {
  const supabase = createClient()
  const [formData, setFormData] = useState({
    test_date: '',
    test_hour: '14',
    test_minute: '00',
    test1_level: '',
    test2_level: '',
    test1_score: '',
    test2_score: '',
    status: '테스트예정',
    test_result: '',
    recommended_class: '',
    notes: ''
  })

  const [classes, setClasses] = useState<{id: string, name: string}[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 시간 옵션 생성
  const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
  const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'))
  
  // 클래스 목록 가져오기
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('id, name')
          .eq('is_active', true)
          .order('name')

        if (error) throw error
        setClasses(data || [])
      } catch (error) {
        console.error('클래스 목록 로딩 오류:', error)
      }
    }

    if (open) {
      loadClasses()
    }
  }, [open])

  useEffect(() => {
    if (test) {
      // test_result 값 매칭 로직 수정
      let testResultValue = 'pending' // 기본값
      if (test.test_result === '합격') {
        testResultValue = '합격'
      } else if (test.test_result === '불합격') {
        testResultValue = '불합격'
      } else if (test.test_result === null || test.test_result === undefined) {
        testResultValue = 'pending'
      }
      
      // test2_level 값 매칭 로직 수정
      let test2LevelValue = 'none' // 기본값
      if (test.test2_level && test.test2_level.trim() !== '') {
        test2LevelValue = test.test2_level
      }
      
      // 날짜와 시간 분리
      let testDate = ''
      let testHour = '14'
      let testMinute = '00'
      
      if (test.test_date) {
        // 한국시간으로 직접 파싱
        const dateStr = test.test_date.slice(0, 19) // YYYY-MM-DDTHH:mm:ss 부분만
        testDate = dateStr.slice(0, 10) // YYYY-MM-DD
        testHour = dateStr.slice(11, 13) // HH
        testMinute = dateStr.slice(14, 16) // mm
        
        // 5분 단위로 반올림
        const roundedMinute = Math.round(parseInt(testMinute) / 5) * 5
        testMinute = roundedMinute.toString().padStart(2, '0')
        if (testMinute === '60') {
          testMinute = '00'
          testHour = (parseInt(testHour) + 1).toString().padStart(2, '0')
        }
      }
      
      setFormData({
        test_date: testDate,
        test_hour: testHour,
        test_minute: testMinute,
        test1_level: test.test1_level || '',
        test2_level: test2LevelValue,
        test1_score: test.test1_score !== null ? test.test1_score.toString() : '',
        test2_score: test.test2_score !== null ? test.test2_score.toString() : '',
        status: test.status || '테스트예정',
        test_result: testResultValue,
        recommended_class: test.recommended_class || '',
        notes: test.notes || ''
      })
    } else if (open && !test) {
      // 새 테스트 생성 시 폼 초기화
      const today = new Date()
      const defaultDate = today.toISOString().slice(0, 10)
      
      setFormData({
        test_date: defaultDate,
        test_hour: '14',
        test_minute: '00',
        test1_level: '',
        test2_level: 'none',
        test1_score: '',
        test2_score: '',
        status: '테스트예정',
        test_result: 'pending',
        recommended_class: '',
        notes: ''
      })
    }
  }, [test, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // test2_level과 test_result에서 특수 값 처리
    const processedTest2Level = formData.test2_level === 'none' ? null : formData.test2_level
    const processedTestResult = formData.test_result === 'pending' || formData.test_result === '' ? null : formData.test_result

    const submitData: any = {
      test_date: formData.test_date ? `${formData.test_date}T${formData.test_hour}:${formData.test_minute}:00` : null,
      test1_level: formData.test1_level || null,
      test2_level: processedTest2Level,
      test1_score: formData.test1_score ? parseInt(formData.test1_score) : null,
      test2_score: formData.test2_score ? parseInt(formData.test2_score) : null,
      status: formData.status,
      test_result: processedTestResult,
      recommended_class: formData.recommended_class || null,
      notes: formData.notes || null
    }

    await onSave(submitData)
    setIsSubmitting(false)
  }

  const testLevels = [
    '초3-1', '초3-2', '초4-1', '초4-2', '초5-1', '초5-2', 
    '초6-1', '초6-2', '중1-1', '중1-2', '중2-1', '중2-2', 
    '중3-1', '중3-2', '공통수학1', '공통수학2', '대수', '미적분', '확통'
  ]
  
  // 등록 결정
  const handleEnrollmentDecision = async (status: '재원' | '미등록') => {
    if (!test?.student_id) {
      alert('학생 정보가 없습니다.')
      return
    }

    try {
      const { error } = await supabase
        .from('students')
        .update({ status })
        .eq('id', test.student_id)
      
      if (error) throw error
      
      alert(`학생 상태가 '${status}'로 변경되었습니다.`)
      // 상담 목록 새로고침을 위해 부모 컴포넌트에 알림
      onOpenChange(false)
      if (onStatusChange) {
        onStatusChange()
      }
    } catch (error) {
      console.error('상태 변경 오류:', error)
      alert('상태 변경 중 오류가 발생했습니다.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>입학테스트 {test?.id ? '수정' : '등록'}</DialogTitle>
          <DialogDescription>
            입학테스트 정보를 {test?.id ? '수정' : '입력'}해주세요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>테스트 일시</Label>
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-2">
                  <Input
                    type="date"
                    value={formData.test_date}
                    onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
                  />
                </div>
                <div>
                  <Select value={formData.test_hour} onValueChange={(value) => setFormData({ ...formData, test_hour: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOUR_OPTIONS.map((hour) => (
                        <SelectItem key={hour} value={hour}>
                          {hour}시
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={formData.test_minute} onValueChange={(value) => setFormData({ ...formData, test_minute: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MINUTE_OPTIONS.map((minute) => (
                        <SelectItem key={minute} value={minute}>
                          {minute}분
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="status">테스트 상태</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="테스트예정">테스트예정</SelectItem>
                  <SelectItem value="결과상담대기">결과상담대기</SelectItem>
                  <SelectItem value="결과상담완료">결과상담완료</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="test1_level">1차 테스트 레벨</Label>
              <Select value={formData.test1_level} onValueChange={(value) => setFormData({ ...formData, test1_level: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="레벨 선택" />
                </SelectTrigger>
                <SelectContent>
                  {testLevels.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="test2_level">2차 테스트 레벨</Label>
              <Select value={formData.test2_level} onValueChange={(value) => setFormData({ ...formData, test2_level: value === "none" ? "" : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="레벨 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">없음</SelectItem>
                  {testLevels.map(level => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="test1_score">1차 점수</Label>
              <Input
                id="test1_score"
                type="number"
                min="0"
                max="100"
                value={formData.test1_score}
                onChange={(e) => setFormData({ ...formData, test1_score: e.target.value })}
                placeholder="점수 입력"
              />
            </div>
            <div>
              <Label htmlFor="test2_score">2차 점수</Label>
              <Input
                id="test2_score"
                type="number"
                min="0"
                max="100"
                value={formData.test2_score}
                onChange={(e) => setFormData({ ...formData, test2_score: e.target.value })}
                placeholder="점수 입력 (선택사항)"
              />
            </div>
            <div>
              <Label htmlFor="test_result">테스트 결과</Label>
              <Select value={formData.test_result} onValueChange={(value) => setFormData({ ...formData, test_result: value === "pending" ? "" : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="결과 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">미정</SelectItem>
                  <SelectItem value="합격">합격</SelectItem>
                  <SelectItem value="불합격">불합격</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="recommended_class">추천반</Label>
              <Select value={formData.recommended_class || 'none'} onValueChange={(value) => setFormData({ ...formData, recommended_class: value === 'none' ? '' : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="추천반 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">없음</SelectItem>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.name}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="notes">메모</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="테스트 관련 메모"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : (test?.id ? '수정' : '등록')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}