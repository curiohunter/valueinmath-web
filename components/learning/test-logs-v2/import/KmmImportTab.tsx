"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Check, AlertTriangle, Trophy } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/providers/auth-provider"
import {
  fetchKmmResults,
  getCurrentEmployeeId,
  importTestLogs,
} from "@/lib/test-log-import-client"
import type { KmmResult, TestLogInsertData } from "@/types/test-log-import"

interface KmmImportTabProps {
  classes: Array<{ id: string; name: string; teacher_id?: string }>
  teachers: Array<{ id: string; name: string }>
  onImported: () => void
}

const getKoreanDate = () => {
  const now = new Date()
  const koreanTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }))
  return koreanTime.toISOString().slice(0, 10)
}

const getCurrentYearMonth = () => {
  const now = new Date()
  const koreanTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }))
  const year = koreanTime.getFullYear()
  const month = String(koreanTime.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

export function KmmImportTab({ classes, teachers, onImported }: KmmImportTabProps) {
  const { user } = useAuth()
  const [yearMonth, setYearMonth] = useState(() => getCurrentYearMonth())
  const [selectedClassId, setSelectedClassId] = useState<string>("")
  const [date, setDate] = useState(() => getKoreanDate())
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<KmmResult[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [hasSearched, setHasSearched] = useState(false)
  const [classStudentIds, setClassStudentIds] = useState<Set<string>>(new Set())

  const handleSearch = async () => {
    if (!yearMonth) {
      toast.error("월을 선택해주세요")
      return
    }

    setLoading(true)
    setHasSearched(true)
    try {
      const kmmResults = await fetchKmmResults(yearMonth)
      setResults(kmmResults)

      // 새로 등록 가능한 항목만 선택
      const newIds = new Set<string>()
      for (const r of kmmResults) {
        if (!r.alreadyImported && r.studentId) newIds.add(r.id)
      }
      setSelectedIds(newIds)
    } catch (error) {
      console.error("KMM 데이터 조회 오류:", error)
      toast.error("데이터 조회 중 오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  // 반 선택 시 해당 반 학생 ID 목록 가져오기
  const handleClassChange = async (classId: string) => {
    setSelectedClassId(classId)

    if (!classId) {
      setClassStudentIds(new Set())
      return
    }

    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client")
    const supabase = getSupabaseBrowserClient()

    const { data: csData } = await supabase
      .from("class_students")
      .select("student_id")
      .eq("class_id", classId)

    const ids = new Set((csData || []).map(cs => cs.student_id))
    setClassStudentIds(ids)

    // 해당 반 학생만 선택
    const newIds = new Set<string>()
    for (const r of results) {
      if (!r.alreadyImported && r.studentId && ids.has(r.studentId)) {
        newIds.add(r.id)
      }
    }
    setSelectedIds(newIds)
  }

  const filteredResults = selectedClassId
    ? results.filter(r => r.studentId && classStudentIds.has(r.studentId))
    : results

  const toggleItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    const available = filteredResults.filter(r => !r.alreadyImported && r.studentId)
    const allSelected = available.every(r => selectedIds.has(r.id))

    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allSelected) {
        available.forEach(r => next.delete(r.id))
      } else {
        available.forEach(r => next.add(r.id))
      }
      return next
    })
  }

  const handleImport = async () => {
    if (selectedIds.size === 0) {
      toast.error("등록할 항목을 선택해주세요")
      return
    }

    if (!selectedClassId) {
      toast.error("등록할 반을 선택해주세요")
      return
    }

    if (!user) {
      toast.error("로그인이 필요합니다")
      return
    }

    setImporting(true)
    try {
      const employeeId = await getCurrentEmployeeId(user.id)
      const selectedResults = filteredResults.filter(r => selectedIds.has(r.id))
      const className = classes.find(c => c.id === selectedClassId)?.name || ""
      const month = yearMonth.split("-")[1]

      const logs: TestLogInsertData[] = selectedResults.map(r => ({
        class_id: selectedClassId,
        student_id: r.studentId!,
        date,
        test: `${month}월 KMM경시대회`,
        test_type: "수학경시대회",
        test_score: r.score,
        note: `${r.schoolType} ${r.grade}학년, 정답:${r.correctCount} 오답:${r.wrongCount}${r.tier ? `, ${r.tier}` : ''}`,
        created_by: employeeId,
        student_name_snapshot: r.studentName,
        class_name_snapshot: className || null,
        source_type: 'kmm',
        source_id: r.id,
      }))

      const result = await importTestLogs(logs)

      if (result.error) {
        toast.error(`등록 오류: ${result.error}`)
      } else {
        toast.success(`${result.inserted}건 등록 완료${result.duplicates > 0 ? ` (중복 ${result.duplicates}건 제외)` : ''}`)
        onImported()
        await handleSearch()
      }
    } catch (error) {
      console.error("등록 오류:", error)
      toast.error("등록 중 오류가 발생했습니다")
    } finally {
      setImporting(false)
    }
  }

  const selectedCount = filteredResults.filter(r => selectedIds.has(r.id)).length
  const unmatchedCount = results.filter(r => !r.studentId).length

  return (
    <div className="space-y-4">
      {/* 필터 영역 */}
      <Card className="p-4">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">월 선택</label>
            <input
              type="month"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              value={yearMonth}
              onChange={e => setYearMonth(e.target.value)}
            />
          </div>

          <Button onClick={handleSearch} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            조회
          </Button>

          {hasSearched && results.length > 0 && (
            <>
              <div className="border-l pl-4 space-y-1">
                <label className="text-sm font-medium text-gray-700">반 선택 (등록용)</label>
                <Select value={selectedClassId} onValueChange={handleClassChange}>
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
                <label className="text-sm font-medium text-gray-700">등록 날짜</label>
                <input
                  type="date"
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </Card>

      {/* 미매칭 경고 */}
      {hasSearched && unmatchedCount > 0 && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{unmatchedCount}명의 학생이 시스템에 매칭되지 않았습니다 (등록 불가)</span>
        </div>
      )}

      {/* 결과 테이블 */}
      {hasSearched && (
        <>
          {filteredResults.length === 0 && !loading ? (
            <div className="text-center py-8 text-gray-400">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{results.length === 0 ? "해당 월에 KMM 경시대회 결과가 없습니다" : "선택된 반에 해당하는 학생이 없습니다"}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  총 {filteredResults.length}건
                  {selectedClassId && ` (${classes.find(c => c.id === selectedClassId)?.name || ''} 반)`}
                </span>
                <Button
                  onClick={handleImport}
                  disabled={importing || selectedCount === 0 || !selectedClassId}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {selectedCount}건 등록
                </Button>
              </div>

              <Card className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 border-b">
                      <th className="px-3 py-2 text-left w-8">
                        <Checkbox
                          checked={filteredResults.filter(r => !r.alreadyImported && r.studentId).length > 0 &&
                            filteredResults.filter(r => !r.alreadyImported && r.studentId).every(r => selectedIds.has(r.id))}
                          onCheckedChange={toggleAll}
                        />
                      </th>
                      <th className="px-3 py-2 text-left">학생</th>
                      <th className="px-3 py-2 text-center">학교급/학년</th>
                      <th className="px-3 py-2 text-center">점수</th>
                      <th className="px-3 py-2 text-center">정답/오답</th>
                      <th className="px-3 py-2 text-center">등급</th>
                      <th className="px-3 py-2 text-center">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map(r => (
                      <tr key={r.id} className={`border-t ${r.alreadyImported ? 'bg-gray-50 opacity-60' : !r.studentId ? 'bg-yellow-50/50' : 'hover:bg-blue-50/30'}`}>
                        <td className="px-3 py-2">
                          {r.alreadyImported ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : r.studentId ? (
                            <Checkbox
                              checked={selectedIds.has(r.id)}
                              onCheckedChange={() => toggleItem(r.id)}
                            />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {r.studentName}
                          {!r.studentId && <span className="text-xs text-yellow-600 ml-1">(미매칭)</span>}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-600">{r.schoolType} {r.grade}학년</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`font-semibold ${(r.score ?? 0) >= 80 ? 'text-green-600' : (r.score ?? 0) >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {r.score ?? '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="text-green-600">{r.correctCount}</span>
                          {' / '}
                          <span className="text-red-600">{r.wrongCount}</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {r.tier && <Badge variant="outline" className="text-xs">{r.tier}</Badge>}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {r.alreadyImported && <Badge className="bg-green-100 text-green-700 text-xs">등록됨</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}
