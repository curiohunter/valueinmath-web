"use client"

import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import type { LeadSourceMetrics, SortField, SortDirection } from "../types"

export function useLeadSourceData() {
  const [leadSourceMetrics, setLeadSourceMetrics] = useState<LeadSourceMetrics[]>([])
  const [leadSourceSummary, setLeadSourceSummary] = useState<LeadSourceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>("firstContacts")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/funnel/by-source")
      if (res.ok) {
        const data = await res.json()
        setLeadSourceMetrics(data.data || [])
        setLeadSourceSummary(data.summary || null)
      }
    } catch (error) {
      console.error("Failed to load lead source data:", error)
      toast.error("리드소스 데이터를 불러오는데 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // 정렬된 데이터
  const sortedMetrics = useMemo(() => {
    return [...leadSourceMetrics].sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]

      // null 처리
      if (aVal === null && bVal === null) return 0
      if (aVal === null) return 1
      if (bVal === null) return -1

      if (sortDirection === "asc") {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      }
    })
  }, [leadSourceMetrics, sortField, sortDirection])

  // 정렬 토글
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  // 정렬 아이콘
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    return sortDirection === "asc" ? "↑" : "↓"
  }

  return {
    leadSourceMetrics: sortedMetrics,
    sortedMetrics,  // alias for direct access
    summary: leadSourceSummary,
    loading,
    loadData,
    sortField,
    sortDirection,
    handleSort,
    getSortIcon,
  }
}
