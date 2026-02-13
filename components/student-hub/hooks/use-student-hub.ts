"use client"

import { useState, useCallback } from "react"
import { DEFAULT_TAB, DEFAULT_SUB_TAB, TAB_GROUPS } from "../tab-config"

export function useStudentHub() {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(DEFAULT_TAB)
  const [activeSubTab, setActiveSubTab] = useState(DEFAULT_SUB_TAB)
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false)

  const selectStudent = useCallback((studentId: string) => {
    setSelectedStudentId(studentId)
    setShowDetailOnMobile(true)
  }, [])

  const clearStudent = useCallback(() => {
    setSelectedStudentId(null)
    setShowDetailOnMobile(false)
  }, [])

  const switchTab = useCallback((tabId: string) => {
    setActiveTab(tabId)
    const group = TAB_GROUPS.find((g) => g.id === tabId)
    if (group) {
      setActiveSubTab(group.subTabs[0].id)
    }
  }, [])

  const switchSubTab = useCallback((subTabId: string) => {
    setActiveSubTab(subTabId)
  }, [])

  const goBackToList = useCallback(() => {
    setShowDetailOnMobile(false)
  }, [])

  return {
    selectedStudentId,
    activeTab,
    activeSubTab,
    showDetailOnMobile,
    selectStudent,
    clearStudent,
    switchTab,
    switchSubTab,
    goBackToList,
  }
}
