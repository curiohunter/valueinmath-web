"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import StudentClassTabs from "@/components/students/StudentClassTabs"
import {
  SessionPlannerSidebar,
  type ClassInfo,
  type TeacherInfo,
  type StudentInfo,
} from "@/components/tuition-sessions/session-planner-sidebar"
import {
  SessionPlannerMain,
  type SegmentStartConfig,
} from "@/components/tuition-sessions/session-planner-main"
import { createClient } from "@/lib/supabase/client"
import {
  computeAutoStartDate,
  generateStudentMonthlyPlan,
  saveStudentMonthlyPlan,
} from "@/services/tuition-session-service"
import { toast } from "sonner"
import type { ClassSessionSegment, StudentMonthlyPlan } from "@/types/tuition-session"
import { CLASS_COLORS } from "@/types/tuition-session"

interface SegmentState {
  startDate: string
  previousEndDate: string | null
  isManualStartDate: boolean
  endDate: string | null
  isManualEndDate: boolean
  plan: StudentMonthlyPlan | null
}

function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export default function TuitionSessionsPage() {
  const supabase = createClient()

  // --- 기본 데이터 ---
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [teachers, setTeachers] = useState<TeacherInfo[]>([])
  const [studentsByClass, setStudentsByClass] = useState<Map<string, StudentInfo[]>>(new Map())
  const [isLoading, setIsLoading] = useState(true)

  // --- 수강료 기준 (billing) ---
  const [billingYear, setBillingYear] = useState(() => getCurrentYearMonth().year)
  const [billingMonth, setBillingMonth] = useState(() => getCurrentYearMonth().month)

  // --- 캘린더 뷰 (독립 네비게이션) ---
  const [calendarYear, setCalendarYear] = useState(() => getCurrentYearMonth().year)
  const [calendarMonth, setCalendarMonth] = useState(() => getCurrentYearMonth().month)

  // --- 다중 반 선택 상태 ---
  const [selectedStudentsByClass, setSelectedStudentsByClass] = useState<Map<string, Set<string>>>(new Map())
  const [segmentStates, setSegmentStates] = useState<Map<string, SegmentState>>(new Map())
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set())
  const [generatingClassIds, setGeneratingClassIds] = useState<Set<string>>(new Set())
  const [collapsedClasses, setCollapsedClasses] = useState<Set<string>>(new Set())
  const [filterClassId, setFilterClassId] = useState<string | null>(null)

  // --- 캘린더 상태 ---
  const [currentSegments, setCurrentSegments] = useState<ClassSessionSegment[]>([])
  const [excludedDates, setExcludedDates] = useState<Set<string>>(new Set())
  const [addedDates, setAddedDates] = useState<Map<string, string>>(new Map()) // date → classId
  const [isSaving, setIsSaving] = useState(false)

  // --- Refs (안정적 콜백용) ---
  const classesRef = useRef(classes)
  const segmentStatesRef = useRef(segmentStates)
  const selectedRef = useRef(selectedStudentsByClass)
  const billingYearRef = useRef(billingYear)
  const billingMonthRef = useRef(billingMonth)
  const studentsByClassRef = useRef(studentsByClass)
  const excludedDatesRef = useRef(excludedDates)
  const addedDatesRef = useRef(addedDates)
  const currentSegmentsRef = useRef(currentSegments)
  const versionRef = useRef(0)

  classesRef.current = classes
  segmentStatesRef.current = segmentStates
  selectedRef.current = selectedStudentsByClass
  billingYearRef.current = billingYear
  billingMonthRef.current = billingMonth
  studentsByClassRef.current = studentsByClass
  excludedDatesRef.current = excludedDates
  addedDatesRef.current = addedDates
  currentSegmentsRef.current = currentSegments

  // --- 초기 데이터 로드 ---
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        const [classRes, teacherRes, csRes] = await Promise.all([
          supabase
            .from("classes")
            .select("id, name, teacher_id, monthly_fee, sessions_per_month")
            .eq("is_active", true)
            .order("name"),
          supabase.from("employees").select("id, name").eq("status", "재직"),
          supabase
            .from("class_students")
            .select("class_id, student_id, students:student_id(id, name, status)")
            .order("class_id"),
        ])

        const classData = (classRes.data ?? []) as ClassInfo[]
        const teacherData = (teacherRes.data ?? []) as TeacherInfo[]

        const teacherMap = new Map(teacherData.map((t) => [t.id, t.name]))
        const sorted = [...classData].sort((a, b) => {
          const tA = a.teacher_id ? teacherMap.get(a.teacher_id) ?? "ㅎ" : "ㅎ"
          const tB = b.teacher_id ? teacherMap.get(b.teacher_id) ?? "ㅎ" : "ㅎ"
          if (tA !== tB) return tA.localeCompare(tB, "ko")
          return a.name.localeCompare(b.name, "ko")
        })

        const byClass = new Map<string, StudentInfo[]>()
        for (const row of csRes.data ?? []) {
          const student = (row as any).students as { id: string; name: string; status?: string } | null
          if (!student || !row.class_id) continue
          if (student.status && student.status !== "재원") continue
          const cls = classData.find((c) => c.id === row.class_id)
          if (!cls) continue
          const list = byClass.get(row.class_id) ?? []
          if (!list.some((s) => s.id === student.id)) {
            list.push({
              id: student.id,
              name: student.name,
              class_id: row.class_id,
              class_name: cls.name,
            })
          }
          byClass.set(row.class_id, list)
        }
        for (const [, students] of byClass) {
          students.sort((a, b) => a.name.localeCompare(b.name, "ko"))
        }

        setClasses(sorted)
        setTeachers(teacherData)
        setStudentsByClass(byClass)
      } catch (e) {
        console.error("데이터 로드 실패:", e)
        toast.error("데이터를 불러오지 못했습니다")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  // --- 반 이름 조회 ---
  const getClassName = useCallback(
    (classId: string): string => {
      return classes.find((c) => c.id === classId)?.name ?? ""
    },
    [classes]
  )

  // --- 전체 플랜 재생성 (핵심 함수, 안정적) ---
  const regenerateAllPlans = useCallback(
    async (
      studentsByClassMap: Map<string, Set<string>>,
      bYear: number,
      bMonth: number,
      overrideStartDates?: Map<string, string>,
      overrideEndDates?: Map<string, string | null>
    ) => {
      const activeClasses = [...studentsByClassMap.entries()].filter(
        ([, ids]) => ids.size > 0
      )

      if (activeClasses.length === 0) {
        setCurrentSegments([])
        setSegmentStates(new Map())
        segmentStatesRef.current = new Map()
        return
      }

      const version = ++versionRef.current
      const currentStates = segmentStatesRef.current
      const classList = classesRef.current

      // 생성 중인 반 표시
      setGeneratingClassIds(new Set(activeClasses.map(([cid]) => cid)))

      try {
        const allSegments: ClassSessionSegment[] = []
        const newStates = new Map<string, SegmentState>()

        for (const [classId, studentIds] of activeClasses) {
          const existingState = currentStates.get(classId)
          const override = overrideStartDates?.get(classId)
          const startDateOverride =
            override ??
            (existingState?.isManualStartDate ? existingState.startDate : undefined)

          // 종료일 결정
          const endOverride = overrideEndDates?.get(classId)
          const effectiveEndDate =
            endOverride !== undefined
              ? endOverride
              : (existingState?.isManualEndDate ? existingState.endDate : null)

          const firstStudentId = [...studentIds][0]
          const className = classList.find((c) => c.id === classId)?.name ?? ""
          const colorIndex = classList.findIndex((c) => c.id === classId)

          let effectiveStartDate = startDateOverride
          let prevEnd = existingState?.previousEndDate ?? null

          if (!effectiveStartDate) {
            const auto = await computeAutoStartDate(classId, bYear, bMonth)
            effectiveStartDate = auto.startDate
            prevEnd = auto.previousEndDate
          }

          // stale 체크
          if (version !== versionRef.current) return

          const plan = await generateStudentMonthlyPlan(
            firstStudentId,
            classId,
            className,
            bYear,
            bMonth,
            effectiveStartDate,
            colorIndex >= 0 ? colorIndex : 0,
            effectiveEndDate ?? undefined
          )

          // stale 체크
          if (version !== versionRef.current) return

          allSegments.push(...plan.segments)
          newStates.set(classId, {
            startDate: effectiveStartDate,
            previousEndDate: prevEnd,
            isManualStartDate: existingState?.isManualStartDate ?? false,
            endDate: effectiveEndDate,
            isManualEndDate: existingState?.isManualEndDate ?? false,
            plan,
          })
        }

        setCurrentSegments(allSegments)
        setSegmentStates(newStates)
        segmentStatesRef.current = newStates

        // 처음 세그먼트 생성 시 캘린더 자동 이동
        if (currentSegmentsRef.current.length === 0 && allSegments.length > 0) {
          const sd = new Date(allSegments[0].startDate + "T00:00:00+09:00")
          setCalendarYear(sd.getFullYear())
          setCalendarMonth(sd.getMonth() + 1)
        }
      } catch (err) {
        if (version !== versionRef.current) return
        console.error("플랜 생성 실패:", err)
        toast.error("세션 플랜 생성에 실패했습니다")
      } finally {
        if (version === versionRef.current) {
          setGeneratingClassIds(new Set())
        }
      }
    },
    []
  )

  // --- 학생 토글 (다중 반 지원) ---
  const handleToggleStudent = useCallback(
    (studentId: string, classId: string) => {
      const prev = selectedRef.current
      const next = new Map(prev)
      const classSet = new Set(next.get(classId) ?? [])

      if (classSet.has(studentId)) {
        classSet.delete(studentId)
      } else {
        classSet.add(studentId)
      }

      if (classSet.size === 0) {
        next.delete(classId)
      } else {
        next.set(classId, classSet)
      }

      selectedRef.current = next
      setSelectedStudentsByClass(next)
      regenerateAllPlans(next, billingYearRef.current, billingMonthRef.current)
    },
    [regenerateAllPlans]
  )

  // --- 반 전체 토글 ---
  const handleToggleClass = useCallback(
    (classId: string) => {
      const students = studentsByClassRef.current.get(classId) ?? []
      if (students.length === 0) return

      const prev = selectedRef.current
      const next = new Map(prev)
      const currentSelected = next.get(classId)
      const allSelected = currentSelected && currentSelected.size === students.length

      if (allSelected) {
        next.delete(classId)
      } else {
        next.set(classId, new Set(students.map((s) => s.id)))
      }

      selectedRef.current = next
      setSelectedStudentsByClass(next)
      regenerateAllPlans(next, billingYearRef.current, billingMonthRef.current)
    },
    [regenerateAllPlans]
  )

  // --- 수강료 기준 변경 ---
  const handleBillingChange = useCallback(
    (year: number, month: number) => {
      setBillingYear(year)
      setBillingMonth(month)
      billingYearRef.current = year
      billingMonthRef.current = month
      setExcludedDates(new Set())
      setAddedDates(new Map())
      setSavedKeys(new Set())

      // 수동 시작일 모두 리셋
      const resetStates = new Map<string, SegmentState>()
      for (const [classId, state] of segmentStatesRef.current) {
        resetStates.set(classId, { ...state, isManualStartDate: false })
      }
      setSegmentStates(resetStates)
      segmentStatesRef.current = resetStates

      const selected = selectedRef.current
      if (selected.size > 0) {
        regenerateAllPlans(selected, year, month)
      }
    },
    [regenerateAllPlans]
  )

  // --- 세그먼트 시작일 수동 변경 ---
  const handleSegmentStartDateChange = useCallback(
    (classId: string, date: string) => {
      if (!date) return

      // 이 세그먼트만 수동 시작일로 업데이트
      const existing = segmentStatesRef.current.get(classId)
      const updated = {
        ...(existing ?? { startDate: date, previousEndDate: null, isManualStartDate: true, plan: null }),
        startDate: date,
        isManualStartDate: true,
      }
      const newStates = new Map(segmentStatesRef.current)
      newStates.set(classId, updated)
      setSegmentStates(newStates)
      segmentStatesRef.current = newStates

      const overrides = new Map([[classId, date]])
      regenerateAllPlans(selectedRef.current, billingYearRef.current, billingMonthRef.current, overrides)
    },
    [regenerateAllPlans]
  )

  // --- 세그먼트 시작일 자동/수동 토글 ---
  const handleToggleSegmentManualStartDate = useCallback(
    (classId: string) => {
      const currentState = segmentStatesRef.current.get(classId)
      if (!currentState) return

      const goingToAuto = currentState.isManualStartDate

      const newStates = new Map(segmentStatesRef.current)
      newStates.set(classId, { ...currentState, isManualStartDate: !currentState.isManualStartDate })
      setSegmentStates(newStates)
      segmentStatesRef.current = newStates

      if (goingToAuto) {
        // 자동으로 전환 → 재생성 (auto start date 사용)
        regenerateAllPlans(selectedRef.current, billingYearRef.current, billingMonthRef.current)
      }
    },
    [regenerateAllPlans]
  )

  // --- 세그먼트 종료일 수동 변경 ---
  const handleSegmentEndDateChange = useCallback(
    (classId: string, date: string) => {
      if (!date) return

      const existing = segmentStatesRef.current.get(classId)
      const updated = {
        ...(existing ?? { startDate: "", previousEndDate: null, isManualStartDate: false, endDate: date, isManualEndDate: true, plan: null }),
        endDate: date,
        isManualEndDate: true,
      }
      const newStates = new Map(segmentStatesRef.current)
      newStates.set(classId, updated)
      setSegmentStates(newStates)
      segmentStatesRef.current = newStates

      const endOverrides = new Map<string, string | null>([[classId, date]])
      regenerateAllPlans(selectedRef.current, billingYearRef.current, billingMonthRef.current, undefined, endOverrides)
    },
    [regenerateAllPlans]
  )

  // --- 세그먼트 종료일 자동/수동 토글 ---
  const handleToggleSegmentManualEndDate = useCallback(
    (classId: string) => {
      const currentState = segmentStatesRef.current.get(classId)
      if (!currentState) return

      const goingToAuto = currentState.isManualEndDate

      const newStates = new Map(segmentStatesRef.current)
      newStates.set(classId, {
        ...currentState,
        isManualEndDate: !currentState.isManualEndDate,
        endDate: goingToAuto ? null : currentState.endDate,
      })
      setSegmentStates(newStates)
      segmentStatesRef.current = newStates

      if (goingToAuto) {
        // 자동으로 전환 → 종료일 없이 재생성 (회차 기반)
        const endOverrides = new Map<string, string | null>([[classId, null]])
        regenerateAllPlans(selectedRef.current, billingYearRef.current, billingMonthRef.current, undefined, endOverrides)
      }
    },
    [regenerateAllPlans]
  )

  // --- 캘린더 네비게이션 (독립적) ---
  const handleCalendarNavigate = useCallback((delta: number) => {
    setCalendarMonth((prev) => {
      let m = prev + delta
      if (m > 12) {
        setCalendarYear((y) => y + 1)
        return 1
      }
      if (m < 1) {
        setCalendarYear((y) => y - 1)
        return 12
      }
      return m
    })
  }, [])

  // --- 반 접기/펼치기 ---
  const handleToggleCollapse = useCallback((classId: string) => {
    setCollapsedClasses((prev) => {
      const next = new Set(prev)
      if (next.has(classId)) next.delete(classId)
      else next.add(classId)
      return next
    })
  }, [])

  // --- 날짜 토글 (제외/복원/추가) ---
  const handleToggleDate = useCallback((date: string) => {
    // 1) 이미 수동 추가된 날짜 → 제거
    if (addedDatesRef.current.has(date)) {
      setAddedDates((prev) => {
        const next = new Map(prev)
        next.delete(date)
        return next
      })
      return
    }

    // 2) 기존 세션이 있는 날짜 → 제외/복원 토글
    const segments = currentSegmentsRef.current
    const hasSession = segments.some((seg) =>
      seg.sessions.some((s) => s.date === date)
    )
    if (hasSession) {
      setExcludedDates((prev) => {
        const next = new Set(prev)
        if (next.has(date)) next.delete(date)
        else next.add(date)
        return next
      })
      return
    }

    // 3) 빈 날짜 → 첫 번째 세그먼트의 반에 수동 추가 (보강용)
    if (segments.length > 0) {
      const classId = segments[0].classId
      setAddedDates((prev) => {
        const next = new Map(prev)
        next.set(date, classId)
        return next
      })
    }
  }, [])

  // --- 초기화 ---
  const handleReset = useCallback(() => {
    setExcludedDates(new Set())
    setAddedDates(new Map())

    // 수동 시작일/종료일 모두 리셋
    const resetStates = new Map<string, SegmentState>()
    for (const [classId, state] of segmentStatesRef.current) {
      resetStates.set(classId, { ...state, isManualStartDate: false, isManualEndDate: false, endDate: null })
    }
    setSegmentStates(resetStates)
    segmentStatesRef.current = resetStates

    const selected = selectedRef.current
    if (selected.size > 0) {
      regenerateAllPlans(selected, billingYearRef.current, billingMonthRef.current)
    }
  }, [regenerateAllPlans])

  // --- 저장 ---
  const handleSave = useCallback(async () => {
    const selected = selectedRef.current
    if (selected.size === 0) return

    setIsSaving(true)
    let totalCreated = 0
    let totalSkipped = 0

    try {
      for (const [classId, studentIds] of selected) {
        const state = segmentStatesRef.current.get(classId)
        if (!state?.plan) continue

        const classStudents = studentsByClassRef.current.get(classId) ?? []
        const excluded = excludedDatesRef.current

        for (const studentId of studentIds) {
          const studentName =
            classStudents.find((s) => s.id === studentId)?.name ?? state.plan.studentName

          const added = addedDatesRef.current

          const adjustedPlan: StudentMonthlyPlan = {
            ...state.plan,
            studentId,
            studentName,
            segments: state.plan.segments.map((seg) => {
              // 제외 처리
              const sessions = seg.sessions.map((s) =>
                excluded.has(s.date) && s.status === "scheduled"
                  ? { ...s, status: "excluded" as const }
                  : s
              )

              // 수동 추가된 날짜를 이 반의 세션에 추가
              const addedForClass = [...added.entries()]
                .filter(([, cid]) => cid === seg.classId)
                .map(([date]) => {
                  const d = new Date(date + "T00:00:00+09:00")
                  const dayNames = ["일", "월", "화", "수", "목", "금", "토"]
                  return {
                    date,
                    dayOfWeek: dayNames[d.getDay()],
                    status: "scheduled" as const,
                  }
                })

              return {
                ...seg,
                sessions: [...sessions, ...addedForClass],
              }
            }),
          }

          const result = await saveStudentMonthlyPlan(adjustedPlan)
          totalCreated += result.created
          totalSkipped += result.skipped

          if (result.created > 0) {
            setSavedKeys((prev) => {
              const next = new Set(prev)
              next.add(`${classId}:${studentId}`)
              return next
            })
          }
        }
      }

      if (totalCreated > 0) {
        toast.success(`${totalCreated}건 수강료가 생성되었습니다`)
      }
      if (totalSkipped > 0) {
        toast.info(`${totalSkipped}건은 이미 존재하여 건너뛰었습니다`)
      }
    } catch (err) {
      console.error("저장 실패:", err)
      toast.error("저장 중 오류가 발생했습니다")
    } finally {
      setIsSaving(false)
    }
  }, [])

  // --- 파생 데이터 ---
  const totalRecordCount = useMemo(() => {
    let count = 0
    for (const [, ids] of selectedStudentsByClass) {
      count += ids.size
    }
    return count
  }, [selectedStudentsByClass])

  const segmentStartConfigs = useMemo((): SegmentStartConfig[] => {
    // 중복 제거 (classId 기준)
    const seen = new Set<string>()
    return currentSegments
      .filter((seg) => {
        if (seen.has(seg.classId)) return false
        seen.add(seg.classId)
        return true
      })
      .map((seg) => {
        const state = segmentStates.get(seg.classId)
        return {
          classId: seg.classId,
          className: seg.className,
          color: seg.color,
          startDate: state?.startDate ?? seg.startDate,
          previousEndDate: state?.previousEndDate ?? null,
          isManualStartDate: state?.isManualStartDate ?? false,
          endDate: seg.endDate,
          isManualEndDate: state?.isManualEndDate ?? false,
        }
      })
  }, [currentSegments, segmentStates])

  const headerInfo = useMemo(() => {
    const entries = [...selectedStudentsByClass.entries()].filter(
      ([, ids]) => ids.size > 0
    )
    if (entries.length === 0) return null
    return entries.map(([classId, ids]) => ({
      classId,
      className: getClassName(classId),
      count: ids.size,
      color:
        CLASS_COLORS[
          classes.findIndex((c) => c.id === classId) % CLASS_COLORS.length
        ],
    }))
  }, [selectedStudentsByClass, classes, getClassName])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <StudentClassTabs />
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mx-auto mb-4" />
          <div className="text-slate-400 text-sm">로딩 중...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <StudentClassTabs />

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">수업 세션 관리</h2>
        {headerInfo && (
          <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
            {headerInfo.map((info) => (
              <span key={info.classId} className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: info.color }}
                />
                <span className="font-medium text-slate-700">
                  {info.className}
                </span>
                <span>{info.count}명</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 메인 레이아웃 */}
      <div
        className="flex border border-slate-200 rounded-lg overflow-hidden bg-slate-50"
        style={{ height: "calc(100vh - 200px)" }}
      >
        <SessionPlannerSidebar
          classes={classes}
          teachers={teachers}
          studentsByClass={studentsByClass}
          selectedStudentsByClass={selectedStudentsByClass}
          savedKeys={savedKeys}
          generatingClassIds={generatingClassIds}
          filterClassId={filterClassId}
          onFilterClassChange={setFilterClassId}
          onToggleStudent={handleToggleStudent}
          onToggleClass={handleToggleClass}
          collapsedClasses={collapsedClasses}
          onToggleCollapse={handleToggleCollapse}
        />

        <div className="flex-1 p-4 overflow-y-auto">
          <SessionPlannerMain
            billingYear={billingYear}
            billingMonth={billingMonth}
            onBillingChange={handleBillingChange}
            segmentStartConfigs={segmentStartConfigs}
            onSegmentStartDateChange={handleSegmentStartDateChange}
            onToggleSegmentManualStartDate={handleToggleSegmentManualStartDate}
            onSegmentEndDateChange={handleSegmentEndDateChange}
            onToggleSegmentManualEndDate={handleToggleSegmentManualEndDate}
            calendarYear={calendarYear}
            calendarMonth={calendarMonth}
            onCalendarNavigate={handleCalendarNavigate}
            segments={currentSegments}
            excludedDates={excludedDates}
            addedDates={addedDates}
            totalRecordCount={totalRecordCount}
            isSaving={isSaving}
            onToggleDate={handleToggleDate}
            onReset={handleReset}
            onSave={handleSave}
          />
        </div>
      </div>
    </div>
  )
}
