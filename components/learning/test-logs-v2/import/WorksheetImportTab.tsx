"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ChevronDown, ChevronRight, Check, FileText } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/providers/auth-provider"
import {
  fetchWorksheetData,
  getCurrentEmployeeId,
  importTestLogs,
} from "@/lib/test-log-import-client"
import type { WorksheetItem, WorksheetGroup, TestLogInsertData } from "@/types/test-log-import"

interface WorksheetImportTabProps {
  classes: Array<{ id: string; name: string; teacher_id?: string }>
  teachers: Array<{ id: string; name: string }>
  onImported: () => void
}

const getKoreanDate = () => {
  const now = new Date()
  const koreanTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }))
  return koreanTime.toISOString().slice(0, 10)
}

const getDateNDaysAgo = (n: number) => {
  const now = new Date()
  const koreanTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }))
  koreanTime.setDate(koreanTime.getDate() - n)
  return koreanTime.toISOString().slice(0, 10)
}

export function WorksheetImportTab({ classes, teachers, onImported }: WorksheetImportTabProps) {
  const { user } = useAuth()
  const [selectedClassId, setSelectedClassId] = useState<string>("")
  const [startDate, setStartDate] = useState(() => getDateNDaysAgo(7))
  const [endDate, setEndDate] = useState(() => getKoreanDate())
  const [testType, setTestType] = useState<string>("단원테스트")
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [items, setItems] = useState<WorksheetItem[]>([])
  const [groups, setGroups] = useState<WorksheetGroup[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [hasSearched, setHasSearched] = useState(false)

  // 반 선택 시 자동 조회
  const handleSearch = async () => {
    if (!selectedClassId) {
      toast.error("반을 선택해주세요")
      return
    }

    setLoading(true)
    setHasSearched(true)
    try {
      // 선택된 반의 학생들의 mathflat_student_id 가져오기
      const { getSupabaseBrowserClient } = await import("@/lib/supabase/client")
      const supabase = getSupabaseBrowserClient()

      const { data: csData } = await supabase
        .from("class_students")
        .select("student_id")
        .eq("class_id", selectedClassId)

      if (!csData || csData.length === 0) {
        setItems([])
        setGroups([])
        toast.error("해당 반에 학생이 없습니다")
        return
      }

      const { data: studentsData } = await supabase
        .from("students")
        .select("id, name, mathflat_student_id")
        .in("id", csData.map(cs => cs.student_id))
        .eq("is_active", true)
        .not("mathflat_student_id", "is", null)

      const mathflatIds = (studentsData || [])
        .map(s => s.mathflat_student_id!)
        .filter(Boolean)

      if (mathflatIds.length === 0) {
        setItems([])
        setGroups([])
        toast.error("연동된 학생이 없습니다")
        return
      }

      const worksheetItems = await fetchWorksheetData(mathflatIds, startDate, endDate)

      // 선택된 반 정보로 classId/className 재설정
      const className = classes.find(c => c.id === selectedClassId)?.name || ""
      const enrichedItems = worksheetItems.map(item => ({
        ...item,
        classId: selectedClassId,
        className,
      }))

      setItems(enrichedItems)

      // 제목+날짜 기준으로 그룹핑
      const groupMap = new Map<string, WorksheetGroup>()
      for (const item of enrichedItems) {
        const key = `${item.title}___${item.workDate}`
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            title: item.title,
            date: item.workDate,
            count: 0,
            items: [],
            expanded: false,
          })
        }
        const group = groupMap.get(key)!
        group.count++
        group.items.push(item)
      }

      const sortedGroups = [...groupMap.values()].sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date)
        return a.title.localeCompare(b.title, "ko")
      })

      setGroups(sortedGroups)

      // 이미 등록된 항목 제외하고 선택
      const newIds = new Set<string>()
      for (const item of enrichedItems) {
        if (!item.alreadyImported) newIds.add(item.id)
      }
      setSelectedIds(newIds)
    } catch (error) {
      console.error("학습지 데이터 조회 오류:", error)
      toast.error("데이터 조회 중 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  const toggleGroup = (idx: number) => {
    setGroups(prev => prev.map((g, i) => i === idx ? { ...g, expanded: !g.expanded } : g))
  }

  const toggleItem = (itemId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const toggleGroupAll = (group: WorksheetGroup) => {
    const availableItems = group.items.filter(i => !i.alreadyImported)
    const allSelected = availableItems.every(i => selectedIds.has(i.id))

    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allSelected) {
        availableItems.forEach(i => next.delete(i.id))
      } else {
        availableItems.forEach(i => next.add(i.id))
      }
      return next
    })
  }

  const handleImport = async () => {
    if (selectedIds.size === 0) {
      toast.error("가져올 항목을 선택해주세요")
      return
    }

    if (!user) {
      toast.error("로그인이 필요합니다")
      return
    }

    setImporting(true)
    try {
      const employeeId = await getCurrentEmployeeId(user.id)
      const selectedItems = items.filter(i => selectedIds.has(i.id))

      const logs: TestLogInsertData[] = selectedItems.map(item => ({
        class_id: item.classId || null,
        student_id: item.studentId,
        date: item.workDate,
        test: item.title || null,
        test_type: testType || null,
        test_score: item.correctRate,
        note: `${item.assignedCount}문제 중 ${item.correctCount}개 정답`,
        created_by: employeeId,
        student_name_snapshot: item.studentName,
        class_name_snapshot: item.className || null,
        source_type: 'mathflat_worksheet',
        source_id: item.id,
      }))

      const result = await importTestLogs(logs)

      if (result.error) {
        toast.error(`가져오기 오류: ${result.error}`)
      } else {
        toast.success(`${result.inserted}건 등록 완료${result.duplicates > 0 ? ` (중복 ${result.duplicates}건 제외)` : ''}`)
        onImported()
        // 결과 새로고침
        await handleSearch()
      }
    } catch (error) {
      console.error("가져오기 오류:", error)
      toast.error("가져오기 중 오류가 발생했습니다")
    } finally {
      setImporting(false)
    }
  }

  const selectedCount = selectedIds.size
  const totalAvailable = items.filter(i => !i.alreadyImported).length

  return (
    <div className="space-y-4">
      {/* 필터 영역 */}
      <Card className="p-4">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">반 선택</label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="반을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {classes.map(cls => {
                  const teacher = teachers.find(t => t.id === cls.teacher_id)
                  return (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} {teacher ? `(${teacher.name})` : ''}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">시작일</label>
            <input
              type="date"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">종료일</label>
            <input
              type="date"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">테스트 유형</label>
            <Select value={testType} onValueChange={setTestType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="과정총괄테스트">과정총괄테스트</SelectItem>
                <SelectItem value="내용암기테스트">내용암기테스트</SelectItem>
                <SelectItem value="단원테스트">단원테스트</SelectItem>
                <SelectItem value="모의고사">모의고사</SelectItem>
                <SelectItem value="서술형평가">서술형평가</SelectItem>
                <SelectItem value="수학경시대회">수학경시대회</SelectItem>
                <SelectItem value="오답테스트">오답테스트</SelectItem>
                <SelectItem value="내신기출유사">내신기출유사</SelectItem>
                <SelectItem value="내신기출">내신기출</SelectItem>
                <SelectItem value="학교시험점수">학교시험점수</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSearch} disabled={loading || !selectedClassId}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            조회
          </Button>
        </div>
      </Card>

      {/* 결과 */}
      {hasSearched && (
        <>
          {groups.length === 0 && !loading ? (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>해당 기간에 CUSTOM 학습지 데이터가 없습니다</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  총 {items.length}건 ({totalAvailable}건 등록 가능)
                </span>
                <Button
                  onClick={handleImport}
                  disabled={importing || selectedCount === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {selectedCount}건 가져오기
                </Button>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {groups.map((group, gIdx) => {
                  const availableItems = group.items.filter(i => !i.alreadyImported)
                  const allSelected = availableItems.length > 0 && availableItems.every(i => selectedIds.has(i.id))
                  const someSelected = availableItems.some(i => selectedIds.has(i.id))

                  return (
                    <Card key={`${group.title}-${group.date}`} className="overflow-hidden">
                      {/* 그룹 헤더 */}
                      <div
                        className="p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleGroup(gIdx)}
                      >
                        {availableItems.length > 0 && (
                          <Checkbox
                            checked={allSelected ? true : someSelected ? "indeterminate" : false}
                            onCheckedChange={() => toggleGroupAll(group)}
                            onClick={e => e.stopPropagation()}
                          />
                        )}
                        {group.expanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                        <div className="flex-1">
                          <span className="text-sm font-medium">{group.title}</span>
                          <span className="text-xs text-gray-500 ml-2">{group.date}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">{group.count}명</Badge>
                        {group.items.every(i => i.alreadyImported) && (
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            <Check className="w-3 h-3 mr-1" /> 등록됨
                          </Badge>
                        )}
                      </div>

                      {/* 학생별 결과 */}
                      {group.expanded && (
                        <div className="border-t">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 text-gray-600">
                                <th className="px-3 py-2 text-left w-8"></th>
                                <th className="px-3 py-2 text-left">학생</th>
                                <th className="px-3 py-2 text-center">정답률</th>
                                <th className="px-3 py-2 text-center">정답/오답</th>
                                <th className="px-3 py-2 text-center">문제수</th>
                                <th className="px-3 py-2 text-center">상태</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.items.map(item => (
                                <tr key={item.id} className={`border-t ${item.alreadyImported ? 'bg-gray-50 opacity-60' : 'hover:bg-blue-50/30'}`}>
                                  <td className="px-3 py-2">
                                    {item.alreadyImported ? (
                                      <Check className="w-4 h-4 text-green-500" />
                                    ) : (
                                      <Checkbox
                                        checked={selectedIds.has(item.id)}
                                        onCheckedChange={() => toggleItem(item.id)}
                                      />
                                    )}
                                  </td>
                                  <td className="px-3 py-2 font-medium">{item.studentName}</td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`font-semibold ${item.correctRate >= 80 ? 'text-green-600' : item.correctRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                      {item.correctRate}%
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <span className="text-green-600">{item.correctCount}</span>
                                    {' / '}
                                    <span className="text-red-600">{item.wrongCount}</span>
                                  </td>
                                  <td className="px-3 py-2 text-center text-gray-500">{item.assignedCount}</td>
                                  <td className="px-3 py-2 text-center">
                                    {item.alreadyImported && (
                                      <Badge className="bg-green-100 text-green-700 text-xs">등록됨</Badge>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
