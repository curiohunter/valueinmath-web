"use client"

import React, { useState, useCallback, useMemo, useEffect } from "react"
import Link from "next/link"
import { TuitionSidebar } from "@/components/tuition/tuition-sidebar"
import { TuitionTable } from "@/components/tuition/tuition-table"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { toast as directToast } from "@/components/ui/use-toast"
import { toast as sonnerToast } from "sonner"
import { useClassesWithStudents, useTuitionMutate } from "@/hooks/use-tuition"
import { useEmployees } from "@/hooks/use-employees"
import { useNewConsultStudents } from "@/hooks/use-students"
import StudentClassTabs from "@/components/students/StudentClassTabs"
import { Download, ChevronLeft, ChevronRight, Gift, ArrowRight, AlertCircle, Users } from "lucide-react"
import type { TuitionRow, TuitionFeeInput } from "@/types/tuition"
import { createClient } from "@/lib/supabase/client"
import { getPendingRewards, markRewardApplied, getApplicablePolicies, type CampaignParticipant, type Campaign } from "@/services/campaign-service"

// 해당 월의 첫날과 마지막 날 계산
function getMonthDateRange(year: number, month: number) {
  // JavaScript Date는 0-based month를 사용 (0=1월, 1=2월, ...)
  // month 파라미터는 1-based (1=1월, 2=2월, ...)
  const firstDay = new Date(year, month - 1, 1); // 해당 월의 첫 날
  // 마지막 날: 다음 달의 0일을 구하면 이번 달의 마지막 날이 됨
  // month는 이미 1-based이므로, 그대로 사용하면 다음 달의 0일
  const lastDayDate = new Date(year, month, 0);

  // 날짜를 제대로 설정하기 위해 UTC 시간대 보정
  const adjustedFirstDay = new Date(firstDay.getTime() - firstDay.getTimezoneOffset() * 60000);
  const adjustedLastDay = new Date(lastDayDate.getTime() - lastDayDate.getTimezoneOffset() * 60000);

  return {
    start: adjustedFirstDay.toISOString().split('T')[0],
    end: adjustedLastDay.toISOString().split('T')[0]
  };
}

export default function TuitionPage() {
  // 현재 연월 (기본값: 이번 달)
  const [yearMonth, setYearMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`
  })

  // 선택된 반 ID
  const [selectedClassId, setSelectedClassId] = useState<string>("")
  
  // 선택된 행들
  const [selectedRows, setSelectedRows] = useState<number[]>([])
  
  // 로컬 행 데이터 (편집용)
  const [localRows, setLocalRows] = useState<TuitionRow[]>([])
  
  // 사이드바 열림/닫힘 상태
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // 미지급 마케팅 보상 (학생별)
  const [pendingRewardsCount, setPendingRewardsCount] = useState(0)
  const [pendingRewardsByStudent, setPendingRewardsByStudent] = useState<Record<string, CampaignParticipant[]>>({})

  // 형제 가능성 있는 학생들 (같은 parent_phone을 가진 재원 학생들)
  const [siblingCandidates, setSiblingCandidates] = useState<Record<string, string[]>>({}) // studentId -> [siblingStudentIds]

  // 학생별 적용 가능한 할인 정책
  const [policiesByStudent, setPoliciesByStudent] = useState<Record<string, Campaign[]>>({})

  // 적용 대기 중인 이벤트 ID (저장 시에만 'applied'로 변경)
  const [pendingApplyEventIds, setPendingApplyEventIds] = useState<string[]>([])

  // 단일월 생성 모드 - 필터링 상태는 필요없음

  // 클래스 데이터는 공통으로 사용
  const { data: classesWithStudents = [] } = useClassesWithStudents()
  
  // 직원(선생님) 데이터 가져오기
  const { employees: teachers = [] } = useEmployees(1, 100, { isActive: true })
  
  // 신규상담 학생 데이터 가져오기
  const { data: newConsultStudents = [] } = useNewConsultStudents()
  
  // Mutation hooks (단일월 생성용)
  const {
    saveBulk,
    isSaving,
    isGenerating
  } = useTuitionMutate()

  const { toast, dismiss } = useToast()

  // 미지급 마케팅 보상(학원비 할인) 조회
  useEffect(() => {
    const fetchPendingRewardsData = async () => {
      const supabase = createClient()
      try {
        const result = await getPendingRewards(supabase)
        if (result.success && result.data) {
          const rewards = result.data
          setPendingRewardsCount(rewards.length)

          // 학생별로 그룹화
          const byStudent: Record<string, CampaignParticipant[]> = {}
          for (const reward of rewards) {
            if (!byStudent[reward.student_id]) {
              byStudent[reward.student_id] = []
            }
            byStudent[reward.student_id].push(reward)
          }
          setPendingRewardsByStudent(byStudent)
        }
      } catch (error) {
        console.error('Failed to fetch pending rewards:', error)
      }
    }
    fetchPendingRewardsData()
  }, [])

  // 형제 가능성 있는 학생 조회 (같은 parent_phone + 재원 상태)
  useEffect(() => {
    const fetchSiblingCandidates = async () => {
      const supabase = createClient()
      try {
        // 재원 학생 중 parent_phone이 있는 학생들 조회
        const { data: students, error } = await supabase
          .from('students')
          .select('id, name, parent_phone')
          .eq('status', '재원')
          .not('parent_phone', 'is', null)

        if (error) throw error
        if (!students) return

        // 같은 전화번호를 가진 학생들 그룹화
        const phoneGroups: Record<string, string[]> = {}
        for (const student of students) {
          if (student.parent_phone) {
            const phone = student.parent_phone.replace(/[^0-9]/g, '') // 숫자만 추출
            if (!phoneGroups[phone]) {
              phoneGroups[phone] = []
            }
            phoneGroups[phone].push(student.id)
          }
        }

        // 2명 이상인 그룹만 형제 후보로 설정
        const candidates: Record<string, string[]> = {}
        for (const [phone, studentIds] of Object.entries(phoneGroups)) {
          if (studentIds.length >= 2) {
            for (const studentId of studentIds) {
              // 자신을 제외한 형제 목록
              candidates[studentId] = studentIds.filter(id => id !== studentId)
            }
          }
        }
        setSiblingCandidates(candidates)
      } catch (error) {
        console.error('Failed to fetch sibling candidates:', error)
      }
    }
    fetchSiblingCandidates()
  }, [])

  // 학생별 적용 가능한 할인 정책 조회
  useEffect(() => {
    const fetchApplicablePolicies = async () => {
      if (localRows.length === 0) {
        setPoliciesByStudent({})
        return
      }

      const supabase = createClient()
      const studentIds = [...new Set(localRows.map(row => row.studentId))]
      const policiesMap: Record<string, Campaign[]> = {}

      for (const studentId of studentIds) {
        try {
          const result = await getApplicablePolicies(supabase, studentId)
          if (result.success && result.data) {
            policiesMap[studentId] = result.data
          }
        } catch (error) {
          console.error(`Failed to fetch policies for student ${studentId}:`, error)
        }
      }

      setPoliciesByStudent(policiesMap)
    }
    fetchApplicablePolicies()
  }, [localRows])

  // 단일월 생성 모드: 로컬 데이터만 사용
  const displayRows = localRows
  const filteredRows = localRows


  // 연월 변경 핸들러
  const handleYearMonthChange = useCallback((value: string) => {
    setYearMonth(value)
    setSelectedRows([]) // 선택 초기화
    setLocalRows([]) // 로컬 데이터 초기화하여 새로운 월 데이터 로드 준비
  }, [])

  // 반 선택 핸들러
  const handleClassSelect = useCallback((classId: string) => {
    setSelectedClassId(classId)
    setSelectedRows([]) // 선택 초기화
    // 반 선택 시에는 로컬 데이터를 초기화하지 않음 (편집 중인 데이터 유지)
  }, [])

  // 행 변경 핸들러
  const handleRowChange = useCallback((index: number, field: keyof TuitionRow, value: any) => {
    setLocalRows(prev => prev.map((row, i) => 
      i === index ? { ...row, [field]: value } : row
    ))
  }, [])

  // 행 삭제 핸들러 (UI에서만 삭제, DB 삭제 안함)
  const handleRowDelete = useCallback((index: number) => {
    setLocalRows(prev => prev.filter((_, i) => i !== index))
    setSelectedRows(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i))
    
    toast({
      title: "삭제 완료",
      description: "테이블에서 제거되었습니다. 저장하면 최종 반영됩니다.",
    })
  }, [toast])

  // 행 선택 핸들러
  const handleRowSelect = useCallback((index: number, selected: boolean) => {
    setSelectedRows(prev => 
      selected 
        ? [...prev, index]
        : prev.filter(i => i !== index)
    )
  }, [])

  // 전체 선택 핸들러
  const handleSelectAll = useCallback((selected: boolean) => {
    setSelectedRows(selected ? localRows.map((_, i) => i) : [])
  }, [localRows])

  // 일괄 적용 핸들러
  const handleBulkApply = useCallback((field: string) => {
    if (localRows.length === 0) {
      toast({
        title: "데이터 없음",
        description: "적용할 데이터가 없습니다.",
        variant: "destructive"
      })
      return
    }

    const firstValue = localRows[0][field as keyof TuitionRow]
    setLocalRows(prev => prev.map((row, i) => 
      i === 0 ? row : { ...row, [field]: firstValue }
    ))

    toast({
      title: "일괄 적용 완료",
      description: `${field} 값이 모든 행에 적용되었습니다.`,
    })
  }, [localRows, toast])

  // 반별 전체 추가 핸들러
  const handleAddAll = useCallback(async (classId: string) => {
    const targetClass = classesWithStudents.find(c => c.id === classId)
    if (!targetClass) {
      toast({
        title: "오류",
        description: "선택한 반을 찾을 수 없습니다.",
        variant: "destructive"
      })
      return
    }

    const year = parseInt(yearMonth.split('-')[0])
    const month = parseInt(yearMonth.split('-')[1])
    const newRows: TuitionRow[] = []

    // 날짜 범위 계산
    const dateRange = getMonthDateRange(year, month);

    // 해당 반의 모든 학생에 대해 학원비 생성
    for (const student of targetClass.students) {
      // 중복 체크 제거 - 정규 수업도 중복 추가 가능
      if (true) {
        const amount = targetClass.monthly_fee || 50000 // 기본값 설정
        // 형제 할인 자동 적용 제거 - 할인정책 탭에서 수동 적용

        newRows.push({
          id: `temp-${Date.now()}-${student.id}`, // 임시 ID
          classId,
          className: targetClass.name,
          studentId: student.id,
          studentName: student.name,
          year,
          month,
          isSibling: false, // 더 이상 자동 설정 안함
          classType: '정규',
          amount, // 할인 없이 원래 금액
          note: '',
          paymentStatus: '미납',
          periodStartDate: dateRange.start,
          periodEndDate: dateRange.end
        })
      }
    }

    if (newRows.length > 0) {
      setLocalRows(prev => [...prev, ...newRows])
      toast({
        title: "추가 완료",
        description: `${targetClass.name}반 ${newRows.length}명의 학원비가 추가되었습니다.`,
      })
    }
  }, [classesWithStudents, yearMonth, localRows, toast])

  // 개별 학생 추가 핸들러 (classType 파라미터 추가)
  const handleAddStudent = useCallback(async (classId: string, studentId: string, classType: '정규' | '특강' = '정규') => {
    const targetClass = classesWithStudents.find(c => c.id === classId)
    if (!targetClass) {
      toast({
        title: "오류",
        description: "선택한 반을 찾을 수 없습니다.",
        variant: "destructive"
      })
      return
    }

    const student = targetClass.students.find(s => s.id === studentId)
    if (!student) {
      toast({
        title: "오류",
        description: "선택한 학생을 찾을 수 없습니다.",
        variant: "destructive"
      })
      return
    }

    const year = parseInt(yearMonth.split('-')[0])
    const month = parseInt(yearMonth.split('-')[1])

    // 날짜 범위 계산
    const dateRange = getMonthDateRange(year, month);

    // 중복 체크 제거 - 같은 학생을 여러 번 추가 가능
    // 반이 다르면 같은 학생이라도 추가 가능 (다른 반 수업)
    // 같은 반에서도 중복 추가 가능 (정규/특강 구분은 테이블에서)
    if (true) {
      const amount = classType === '특강' ? 100000 : (targetClass.monthly_fee || 50000) // 특강은 기본 10만원
      // 형제 할인 자동 적용 제거 - 할인정책 탭에서 수동 적용

      const newRow: TuitionRow = {
        id: `temp-${Date.now()}-${student.id}`, // 임시 ID
        classId,
        className: targetClass.name,
        studentId: student.id,
        studentName: student.name,
        year,
        month,
        isSibling: false, // 더 이상 자동 설정 안함
        classType,
        amount, // 할인 없이 원래 금액
        note: classType === '특강' ? '특강' : '',
        paymentStatus: '미납',
        periodStartDate: dateRange.start,
        periodEndDate: dateRange.end
      }

      setLocalRows(prev => [...prev, newRow])
      toast({
        title: "추가 완료",
        description: `${student.name} 학생이 추가되었습니다. 테이블에서 수업유형을 변경할 수 있습니다.`,
      })
    }
  }, [classesWithStudents, yearMonth, localRows, toast])

  // 신규상담 학생 추가 핸들러 (입학테스트비, 특강비용 등)
  const handleAddNewConsultStudent = useCallback(async (studentId: string) => {
    const student = newConsultStudents.find(s => s.id === studentId)
    if (!student) {
      toast({
        title: "오류",
        description: "선택한 학생을 찾을 수 없습니다.",
        variant: "destructive"
      })
      return
    }

    const year = parseInt(yearMonth.split('-')[0])
    const month = parseInt(yearMonth.split('-')[1])

    // 날짜 범위 계산
    const dateRange = getMonthDateRange(year, month);

    // 이미 존재하는지 확인 (신규상담 학생은 class_id가 null)
    const exists = localRows.some(row =>
      row.studentId === studentId &&
      row.year === year &&
      row.month === month &&
      !row.classId // class_id가 null인 경우
    )

    if (!exists) {
      const newRow: TuitionRow = {
        id: `temp-${Date.now()}-${student.id}`, // 임시 ID
        classId: null as any, // NULL로 저장될 예정
        className: '입학테스트비', // 반 이름 대신 구분용 텍스트
        studentId: student.id,
        studentName: student.name,
        year,
        month,
        isSibling: false, // 더 이상 자동 설정 안함
        classType: '입학테스트비', // 입학테스트비로 분류
        amount: 10000, // 기본 입학테스트비 (수정 가능)
        note: '', // 현금/카드 결제 방법 입력용
        paymentStatus: '미납',
        periodStartDate: dateRange.start,
        periodEndDate: dateRange.end
      }

      setLocalRows(prev => [...prev, newRow])
      toast({
        title: "추가 완료",
        description: `${student.name} 학생의 입학테스트비가 추가되었습니다.`,
      })
    } else {
      toast({
        title: "이미 존재",
        description: "해당 학생의 입학테스트비가 이미 추가되어 있습니다.",
        variant: "destructive"
      })
    }
  }, [newConsultStudents, yearMonth, localRows, toast])

  // 월별 자동 생성 핸들러 (로컬에만 추가)
  const handleGenerateMonthly = useCallback(async () => {
    const year = parseInt(yearMonth.split('-')[0])
    const month = parseInt(yearMonth.split('-')[1])
    
    // 생성 시작 알림
    toast({
      title: "생성 중...",
      description: "월별 학원비를 생성하고 있습니다. 잠시만 기다려주세요.",
    })
    
    try {
      // 반별 학생 데이터 조회
      if (classesWithStudents.length === 0) {
        toast({
          title: "생성할 학원비 없음",
          description: "등록된 반이 없습니다.",
          variant: "destructive"
        })
        return
      }
      
      let totalCount = 0
      let successCount = 0
      const newRows: TuitionRow[] = []

      // 날짜 범위 계산
      const dateRange = getMonthDateRange(year, month);

      // 각 반별로 학원비 생성
      for (const classData of classesWithStudents) {
        if (!classData.monthly_fee || classData.monthly_fee <= 0) {
          continue
        }
        
        for (const student of classData.students) {
          totalCount++
          
          // 정규 수업만 중복 체크 (월별 자동 생성은 정규 수업만 생성)
          const exists = localRows.some(row => 
            row.classId === classData.id && 
            row.studentId === student.id && 
            row.year === year && 
            row.month === month &&
            row.classType === '정규'
          )
          
          if (!exists) {
            const amount = classData.monthly_fee
            // 형제 할인 자동 적용 제거 - 할인정책 탭에서 수동 적용

            newRows.push({
              id: `temp-${Date.now()}-${student.id}`, // 임시 ID
              classId: classData.id,
              className: classData.name,
              studentId: student.id,
              studentName: student.name,
              year,
              month,
              isSibling: false, // 더 이상 자동 설정 안함
              classType: '정규',
              amount, // 할인 없이 원래 금액
              note: '',
              paymentStatus: '미납',
              periodStartDate: dateRange.start,
              periodEndDate: dateRange.end
            })

            successCount++
          }
        }
      }
      
      if (newRows.length > 0) {
        setLocalRows(prev => [...prev, ...newRows])
        toast({
          title: "생성 완료",
          description: `${newRows.length}개의 학원비가 생성되었습니다. 저장 버튼을 눌러 저장해주세요.`,
        })
      } else if (totalCount === 0) {
        toast({
          title: "생성할 학원비 없음",
          description: "재원 중인 학생이 없거나 월 수강료가 설정되지 않았습니다.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "이미 존재",
          description: "모든 학생의 학원비가 이미 생성되어 있습니다.",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "생성 실패",
        description: "월별 학원비 자동 생성 중 오류가 발생했습니다.",
        variant: "destructive"
      })
    }
  }, [yearMonth, classesWithStudents, localRows, toast])

  // 일괄 삭제 핸들러 (UI에서만 삭제)
  const handleBulkDelete = useCallback(() => {
    if (selectedRows.length === 0) {
      toast({
        title: "선택된 항목 없음",
        description: "삭제할 항목을 선택해주세요.",
        variant: "destructive"
      })
      return
    }

    const deleteCount = selectedRows.length
    setLocalRows(prev => prev.filter((_, i) => !selectedRows.includes(i)))
    setSelectedRows([])
    
    toast({
      title: "삭제 완료",
      description: `${deleteCount}개 항목이 테이블에서 제거되었습니다. 저장하면 최종 반영됩니다.`,
    })
  }, [selectedRows, toast])

  // 전체 삭제 핸들러 (UI에서만 삭제)
  const handleDeleteAll = useCallback(async () => {
    if (localRows.length === 0) {
      toast({
        title: "삭제할 항목 없음",
        description: "삭제할 학원비가 없습니다.",
        variant: "destructive"
      })
      return
    }

    const warningMessage = pendingApplyEventIds.length > 0
      ? `정말 ${localRows.length}개의 학원비를 테이블에서 모두 제거하시겠습니까?\n\n⚠️ 적용 대기 중인 이벤트 ${pendingApplyEventIds.length}건이 원래 상태로 복구됩니다.`
      : `정말 ${localRows.length}개의 학원비를 테이블에서 모두 제거하시겠습니까?`

    const confirmDelete = window.confirm(warningMessage)

    if (confirmDelete) {
      const deleteCount = localRows.length
      setLocalRows([])
      setSelectedRows([])

      // 적용 대기 중인 이벤트가 있으면 미지급 보상 목록 다시 로드
      if (pendingApplyEventIds.length > 0) {
        setPendingApplyEventIds([])
        // 미지급 보상 다시 조회
        const supabase = createClient()
        const result = await getPendingRewards(supabase)
        if (result.success && result.data) {
          setPendingRewardsCount(result.data.length)
          const byStudent: Record<string, CampaignParticipant[]> = {}
          for (const reward of result.data) {
            if (!byStudent[reward.student_id]) {
              byStudent[reward.student_id] = []
            }
            byStudent[reward.student_id].push(reward)
          }
          setPendingRewardsByStudent(byStudent)
        }
      }

      toast({
        title: "전체 삭제 완료",
        description: `${deleteCount}개 항목이 테이블에서 제거되었습니다.`,
      })
    }
  }, [localRows, toast, pendingApplyEventIds])

  // 저장 핸들러
  const handleSave = useCallback(async () => {
    if (localRows.length === 0) {
      toast({
        title: "저장할 데이터 없음",
        description: "저장할 학원비 데이터가 없습니다.",
        variant: "destructive"
      })
      return
    }

    try {
      // 임시 ID를 가진 항목들을 실제 데이터로 변환
      const dataToSave: TuitionFeeInput[] = localRows.map(row => ({
        class_id: row.classId,
        student_id: row.studentId,
        year: row.year,
        month: row.month,
        is_sibling: row.isSibling,
        class_type: row.classType,
        amount: row.amount,
        note: row.note || undefined,
        payment_status: row.paymentStatus,
        period_start_date: row.periodStartDate,
        period_end_date: row.periodEndDate
      }))

      const result = await saveBulk(dataToSave)
      
      if (result.success) {
        // 기존 토스트들 모두 dismiss
        dismiss()

        // 대기 중인 이벤트들을 'applied'로 업데이트
        if (pendingApplyEventIds.length > 0) {
          const supabase = createClient()
          for (const participantId of pendingApplyEventIds) {
            await markRewardApplied(supabase, participantId)
          }
          setPendingApplyEventIds([])
        }

        // 상태 업데이트 후 toast 호출
        setLocalRows([])
        setSelectedRows([])

        // Sonner 토스트 사용 (더 안정적)
        sonnerToast.success(`저장 완료! ${dataToSave.length}개의 학원비가 저장되었습니다.`)
      } else {
        toast({
          title: "저장 실패",
          description: result.error || "학원비 저장 중 오류가 발생했습니다.",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "저장 실패",
        description: "학원비 저장 중 오류가 발생했습니다.",
        variant: "destructive"
      })
    }
  }, [localRows, saveBulk, toast, dismiss, pendingApplyEventIds])

  // 이벤트 할인 적용 핸들러 (로컬에만 적용, 저장 시에 상태 업데이트)
  const handleApplyEvent = useCallback((participantId: string, discountAmount: number) => {
    // 적용 대기 목록에 추가
    setPendingApplyEventIds(prev => {
      if (prev.includes(participantId)) return prev
      return [...prev, participantId]
    })

    // 미지급 보상 목록에서 제거 (UI에서만)
    setPendingRewardsByStudent(prev => {
      const updated = { ...prev }
      for (const studentId in updated) {
        updated[studentId] = updated[studentId].filter(r => r.id !== participantId)
        if (updated[studentId].length === 0) {
          delete updated[studentId]
        }
      }
      return updated
    })
    setPendingRewardsCount(prev => Math.max(0, prev - 1))

    sonnerToast.success(`이벤트 할인 ${discountAmount.toLocaleString()}원이 적용되었습니다. 저장하면 최종 반영됩니다.`)
  }, [])

  // 할인 정책 적용 핸들러
  const handleApplyPolicy = useCallback((policy: Campaign, discountAmount: number) => {
    sonnerToast.success(`${policy.title} ${discountAmount.toLocaleString()}원이 적용되었습니다. 저장하면 최종 반영됩니다.`)
  }, [])

  return (
    <div className="space-y-6">
      <StudentClassTabs />

      {/* 메인 콘텐츠 */}
      <div className="flex gap-6 relative">
        {/* 왼쪽 사이드바 */}
        <div className={`transition-all duration-300 ${isSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}`}>
          <TuitionSidebar
            yearMonth={yearMonth}
            onYearMonthChange={handleYearMonthChange}
            classesWithStudents={classesWithStudents}
            teachers={teachers.map(t => ({ id: t.id, name: t.name }))}
            newConsultStudents={newConsultStudents}
            onAddAll={handleAddAll}
            onAddStudent={handleAddStudent}
            onAddNewConsultStudent={handleAddNewConsultStudent}
            onGenerateMonthly={handleGenerateMonthly}
            isGenerating={isGenerating}
            selectedClassId={selectedClassId}
            onClassSelect={handleClassSelect}
          />
        </div>

        {/* 오른쪽 테이블 */}
        <div className="flex-1">
          <TuitionTable
            rows={filteredRows}
            originalRows={displayRows}
            onRowChange={handleRowChange}
            onRowDelete={handleRowDelete}
            onBulkApply={handleBulkApply}
            onBulkDelete={handleBulkDelete}
            onDeleteAll={handleDeleteAll}
            onSave={handleSave}
            isSaving={isSaving}
            selectedRows={selectedRows}
            onRowSelect={handleRowSelect}
            onSelectAll={handleSelectAll}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            pendingRewardsByStudent={pendingRewardsByStudent}
            siblingCandidates={siblingCandidates}
            onApplyEvent={handleApplyEvent}
            policiesByStudent={policiesByStudent}
            onApplyPolicy={handleApplyPolicy}
          />
        </div>
      </div>

      {/* 하단 요약 정보 */}
      {displayRows.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center justify-center gap-8">
            <div className="text-lg text-blue-700 font-medium">
              <strong>{yearMonth.replace('-', '년 ')}월</strong> 학원비 현황
            </div>
            <Badge variant="outline" className="bg-white text-blue-700 border-blue-200 px-4 py-2 text-base">
              총 {displayRows.length}건
            </Badge>
            <div className="text-lg text-blue-700 font-bold">
              총 금액: {displayRows.reduce((sum, row) => sum + row.amount, 0).toLocaleString()}원
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}