'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { ModalField } from '@/types/learning'
import { getKoreanDate } from '@/types/learning'

interface ModalState {
  open: boolean
  rowIdx: number | null
  field: ModalField | null
  value: string
}

interface UseLearningUIReturn {
  // 날짜 관련
  date: string
  setDate: (date: string) => void

  // 필터 관련
  selectedClassIds: string[]
  setSelectedClassIds: React.Dispatch<React.SetStateAction<string[]>>

  // 사이드바
  isSidebarOpen: boolean
  toggleSidebar: () => void

  // 반 아코디언
  openClassIds: string[]
  toggleClassAccordion: (classId: string) => void

  // 모달 상태
  modalState: ModalState
  openModal: (idx: number, field: ModalField, value: string | undefined) => void
  closeModal: () => void
  setModalValue: (value: string) => void
  modalInputRef: React.RefObject<HTMLInputElement | null>

  // 반 만들기 모달
  classModalOpen: boolean
  openClassModal: () => void
  closeClassModal: () => void
}

export function useLearningUI(): UseLearningUIReturn {
  const today = getKoreanDate()

  // 날짜 상태
  const [date, setDate] = useState(today)

  // 필터 상태
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])

  // 사이드바 상태
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // 반 아코디언 상태
  const [openClassIds, setOpenClassIds] = useState<string[]>([])

  // 모달 상태
  const [modalState, setModalState] = useState<ModalState>({
    open: false,
    rowIdx: null,
    field: null,
    value: ""
  })
  const modalInputRef = useRef<HTMLInputElement | null>(null)

  // 반 만들기 모달 상태
  const [classModalOpen, setClassModalOpen] = useState(false)

  // 모달이 열릴 때 인풋에 포커스
  useEffect(() => {
    if (modalState.open && modalInputRef.current) {
      modalInputRef.current.focus()
    }
  }, [modalState.open])

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev)
  }, [])

  const toggleClassAccordion = useCallback((classId: string) => {
    setOpenClassIds(prev =>
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    )
  }, [])

  const openModal = useCallback((idx: number, field: ModalField, value: string | undefined) => {
    setModalState({
      open: true,
      rowIdx: idx,
      field,
      value: value || ""
    })
  }, [])

  const closeModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      open: false
    }))
  }, [])

  const setModalValue = useCallback((value: string) => {
    setModalState(prev => ({
      ...prev,
      value
    }))
  }, [])

  const openClassModal = useCallback(() => {
    setClassModalOpen(true)
  }, [])

  const closeClassModal = useCallback(() => {
    setClassModalOpen(false)
  }, [])

  return {
    date,
    setDate,
    selectedClassIds,
    setSelectedClassIds,
    isSidebarOpen,
    toggleSidebar,
    openClassIds,
    toggleClassAccordion,
    modalState,
    openModal,
    closeModal,
    setModalValue,
    modalInputRef,
    classModalOpen,
    openClassModal,
    closeClassModal
  }
}
