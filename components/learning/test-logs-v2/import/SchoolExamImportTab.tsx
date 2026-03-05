"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Search, BookOpen } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/providers/auth-provider"
import {
  fetchSchoolExams,
  getClassStudentsForImport,
  getCurrentEmployeeId,
  importTestLogs,
  checkDuplicates,
} from "@/lib/test-log-import-client"
import type { SchoolExamInfo, SchoolExamStudentScore, TestLogInsertData } from "@/types/test-log-import"

interface SchoolExamImportTabProps {
  classes: Array<{ id: string; name: string; teacher_id?: string }>
  teachers: Array<{ id: string; name: string }>
  onImported: () => void
}

const getKoreanDate = () => {
  const now = new Date()
  const koreanTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }))
  return koreanTime.toISOString().slice(0, 10)
}

export function SchoolExamImportTab({ classes, teachers, onImported }: SchoolExamImportTabProps) {
  const { user } = useAuth()

  // 시험지 검색 필터
  const [schoolName, setSchoolName] = useState("")
  const [schoolType, setSchoolType] = useState<string>("")
  const [grade, setGrade] = useState<string>("")
  const [semester, setSemester] = useState<string>("")
  const [examType, setExamType] = useState<string>("")

  // 시험지 목록 및 선택
  const [exams, setExams] = useState<any[]>([])
  const [selectedExam, setSelectedExam] = useState<SchoolExamInfo | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  // 반/학생 선택
  const [selectedClassId, setSelectedClassId] = useState<string>("")
  const [classStudents, setClassStudents] = useState<SchoolExamStudentScore[]>([])
  const [date, setDate] = useState(() => getKoreanDate())

  // 제출
  const [importing, setImporting] = useState(false)
  const [alreadyImportedStudentIds, setAlreadyImportedStudentIds] = useState<Set<string>>(new Set())

  const handleSearchExams = async () => {
    setSearchLoading(true)
    try {
      const results = await fetchSchoolExams({
        schoolType: schoolType && schoolType !== "all" ? schoolType : undefined,
        grade: grade && grade !== "all" ? Number(grade) : undefined,
        semester: semester && semester !== "all" ? Number(semester) : undefined,
        examType: examType && examType !== "all" ? examType : undefined,
        schoolName: schoolName || undefined,
      })
      setExams(results)
      if (results.length === 0) toast.info("검색 결과가 없습니다")
    } catch (error) {
      console.error("시험지 검색 오류:", error)
      toast.error("검색 중 오류가 발생했습니다")
    } finally {
      setSearchLoading(false)
    }
  }

  const handleSelectExam = (exam: any) => {
    setSelectedExam({
      id: exam.id,
      schoolName: exam.school_name,
      schoolType: exam.school_type,
      grade: exam.grade,
      semester: exam.semester,
      examType: exam.exam_type,
      examYear: exam.exam_year,
    })
    // 시험지 선택 시 중복 체크 초기화
    setAlreadyImportedStudentIds(new Set())
  }

  const handleClassChange = async (classId: string) => {
    setSelectedClassId(classId)
    if (!classId) {
      setClassStudents([])
      return
    }

    try {
      const students = await getClassStudentsForImport(classId)
      const className = classes.find(c => c.id === classId)?.name || ""

      const scores: SchoolExamStudentScore[] = students.map(s => ({
        studentId: s.id,
        studentName: s.name,
        classId,
        className,
        testScore: null,
        note: "",
      }))

      setClassStudents(scores)

      // 이미 등록된 학생 확인
      if (selectedExam) {
        const sourceIds = students.map(s => `${selectedExam.id}_${s.id}`)
        const imported = await checkDuplicates("school_exam", sourceIds)
        const importedStudentIds = new Set<string>()
        for (const sourceId of imported) {
          const studentId = sourceId.split("_")[1]
          if (studentId) importedStudentIds.add(studentId)
        }
        setAlreadyImportedStudentIds(importedStudentIds)
      }
    } catch (error) {
      console.error("학생 목록 조회 오류:", error)
      toast.error("학생 목록을 불러오지 못했습니다")
    }
  }

  const handleScoreChange = (studentId: string, score: number | null) => {
    setClassStudents(prev =>
      prev.map(s => s.studentId === studentId ? { ...s, testScore: score } : s)
    )
  }

  const handleNoteChange = (studentId: string, note: string) => {
    setClassStudents(prev =>
      prev.map(s => s.studentId === studentId ? { ...s, note } : s)
    )
  }

  const handleImport = async () => {
    if (!selectedExam) {
      toast.error("시험지를 선택해주세요")
      return
    }
    if (!selectedClassId) {
      toast.error("반을 선택해주세요")
      return
    }
    if (!user) {
      toast.error("로그인이 필요합니다")
      return
    }

    // 점수가 입력된 학생만 (이미 등록된 학생 제외)
    const studentsWithScores = classStudents.filter(
      s => s.testScore !== null && !alreadyImportedStudentIds.has(s.studentId)
    )

    if (studentsWithScores.length === 0) {
      toast.error("점수가 입력된 학생이 없습니다")
      return
    }

    setImporting(true)
    try {
      const employeeId = await getCurrentEmployeeId(user.id)
      const testName = `${selectedExam.schoolName} ${selectedExam.grade}학년 ${selectedExam.semester}학기 ${selectedExam.examType} (${selectedExam.examYear})`

      const logs: TestLogInsertData[] = studentsWithScores.map(s => ({
        class_id: selectedClassId,
        student_id: s.studentId,
        date,
        test: testName,
        test_type: "내신기출",
        test_score: s.testScore,
        note: s.note || null,
        created_by: employeeId,
        student_name_snapshot: s.studentName,
        class_name_snapshot: s.className || null,
        source_type: 'school_exam',
        source_id: `${selectedExam.id}_${s.studentId}`,
      }))

      const result = await importTestLogs(logs)

      if (result.error) {
        toast.error(`등록 오류: ${result.error}`)
      } else {
        toast.success(`${result.inserted}건 등록 완료${result.duplicates > 0 ? ` (중복 ${result.duplicates}건 제외)` : ''}`)
        onImported()
        // 중복 체크 갱신
        await handleClassChange(selectedClassId)
      }
    } catch (error) {
      console.error("등록 오류:", error)
      toast.error("등록 중 오류가 발생했습니다")
    } finally {
      setImporting(false)
    }
  }

  const studentsWithScoresCount = classStudents.filter(
    s => s.testScore !== null && !alreadyImportedStudentIds.has(s.studentId)
  ).length

  return (
    <div className="space-y-4">
      {/* 시험지 검색 */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">시험지 검색</h3>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">학교명</label>
            <input
              type="text"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm w-32"
              value={schoolName}
              onChange={e => setSchoolName(e.target.value)}
              placeholder="학교명"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">학교급</label>
            <Select value={schoolType} onValueChange={setSchoolType}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="중학교">중학교</SelectItem>
                <SelectItem value="고등학교">고등학교</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">학년</label>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="1">1학년</SelectItem>
                <SelectItem value="2">2학년</SelectItem>
                <SelectItem value="3">3학년</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">학기</label>
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="1">1학기</SelectItem>
                <SelectItem value="2">2학기</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">시험유형</label>
            <Select value={examType} onValueChange={setExamType}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="전체" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="중간고사">중간고사</SelectItem>
                <SelectItem value="기말고사">기말고사</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSearchExams} disabled={searchLoading} size="sm">
            {searchLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Search className="w-4 h-4 mr-1" />}
            검색
          </Button>
        </div>

        {/* 시험지 목록 */}
        {exams.length > 0 && (
          <div className="mt-3 max-h-40 overflow-y-auto border rounded-md">
            {exams.map(exam => (
              <div
                key={exam.id}
                className={`p-2 text-sm cursor-pointer hover:bg-blue-50 border-b last:border-b-0 flex items-center justify-between ${
                  selectedExam?.id === exam.id ? 'bg-blue-100 font-medium' : ''
                }`}
                onClick={() => handleSelectExam(exam)}
              >
                <span>
                  {exam.school_name} {exam.grade}학년 {exam.semester}학기 {exam.exam_type}
                </span>
                <Badge variant="outline" className="text-xs">{exam.exam_year}년</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 선택된 시험지 정보 + 반 선택 + 점수 입력 */}
      {selectedExam && (
        <>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">선택된 시험지</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedExam.schoolName} {selectedExam.grade}학년 {selectedExam.semester}학기 {selectedExam.examType} ({selectedExam.examYear}년)
                </p>
              </div>
              <Badge className="bg-black text-white">내신기출</Badge>
            </div>

            <div className="flex items-end gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">반 선택</label>
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
                <label className="text-sm font-medium text-gray-700">시험 날짜</label>
                <input
                  type="date"
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* 학생별 점수 입력 */}
          {classStudents.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {classStudents.length}명 중 {studentsWithScoresCount}명 점수 입력
                </span>
                <Button
                  onClick={handleImport}
                  disabled={importing || studentsWithScoresCount === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {studentsWithScoresCount}건 등록
                </Button>
              </div>

              <Card className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 border-b">
                      <th className="px-3 py-2 text-left">학생</th>
                      <th className="px-3 py-2 text-center w-28">점수</th>
                      <th className="px-3 py-2 text-left">메모</th>
                      <th className="px-3 py-2 text-center w-20">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map(s => {
                      const isImported = alreadyImportedStudentIds.has(s.studentId)
                      return (
                        <tr key={s.studentId} className={`border-t ${isImported ? 'bg-gray-50 opacity-60' : 'hover:bg-blue-50/30'}`}>
                          <td className="px-3 py-2 font-medium">{s.studentName}</td>
                          <td className="px-3 py-2 text-center">
                            {isImported ? (
                              <span className="text-gray-400">-</span>
                            ) : (
                              <input
                                type="number"
                                className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={s.testScore ?? ""}
                                onChange={e => handleScoreChange(s.studentId, e.target.value ? Number(e.target.value) : null)}
                                placeholder="점수"
                                min="0"
                                max="100"
                              />
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isImported ? (
                              <span className="text-gray-400">-</span>
                            ) : (
                              <input
                                type="text"
                                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={s.note}
                                onChange={e => handleNoteChange(s.studentId, e.target.value)}
                                placeholder="메모 (선택)"
                              />
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {isImported && <Badge className="bg-green-100 text-green-700 text-xs">등록됨</Badge>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </Card>
            </>
          )}

          {selectedClassId && classStudents.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>해당 반에 재원생이 없습니다</p>
            </div>
          )}
        </>
      )}

      {!selectedExam && exams.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>시험지를 검색하여 선택해주세요</p>
        </div>
      )}
    </div>
  )
}
