"use server"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import type { Database } from "@/types/database"
import type {
  MonthlyReportData,
  StudyLogSummary,
  TestLogSummary,
  MonthlyStats,
  StudentInfo,
  AnalyticsApiResponse,
  BookProgress,
  ScoreAnalysis
} from "@/types/analytics"

type StudyLogRow = Database["public"]["Tables"]["study_logs"]["Row"]
type TestLogRow = Database["public"]["Tables"]["test_logs"]["Row"]
type StudentRow = Database["public"]["Tables"]["students"]["Row"]

// DB 타입을 앱 타입으로 변환하는 함수들
function mapStudyLogRowToSummary(row: StudyLogRow & { created_by?: string | null }): StudyLogSummary {
  return {
    id: row.id,
    date: row.date,
    class_id: row.class_id,
    book1: row.book1,
    book1log: row.book1log,
    book2: row.book2,
    book2log: row.book2log,
    attendance_status: row.attendance_status,
    homework: row.homework,
    focus: row.focus,
    note: row.note,
    created_by: row.created_by || null,
  }
}

function mapTestLogRowToSummary(row: TestLogRow & { created_by?: string | null }): TestLogSummary {
  return {
    id: row.id,
    date: row.date,
    class_id: row.class_id,
    test_type: row.test_type,
    test: row.test,
    test_score: row.test_score,
    note: row.note,
    created_by: row.created_by || null,
  }
}

function mapStudentRowToInfo(row: StudentRow): StudentInfo {
  return {
    id: row.id,
    name: row.name,
    department: row.department,
    grade: row.grade,
    school: row.school,
  }
}

// 월별 통계 계산 함수
function calculateMonthlyStats(
  studyLogs: StudyLogSummary[],
  testLogs: TestLogSummary[]
): MonthlyStats {
  const totalClasses = studyLogs.length
  const totalTests = testLogs.length

  // 출석 관련 계산
  const attendanceScores = studyLogs
    .map(log => log.attendance_status)
    .filter((score): score is number => score !== null)
  
  const avgAttendance = attendanceScores.length > 0 
    ? attendanceScores.reduce((sum, score) => sum + score, 0) / attendanceScores.length
    : 0

  const attendanceRate = totalClasses > 0 
    ? (attendanceScores.filter(score => score >= 4).length / totalClasses) * 100
    : 0

  // 학습 태도 계산
  const homeworkScores = studyLogs
    .map(log => log.homework)
    .filter((score): score is number => score !== null)
  
  const avgHomework = homeworkScores.length > 0
    ? homeworkScores.reduce((sum, score) => sum + score, 0) / homeworkScores.length
    : 0

  const focusScores = studyLogs
    .map(log => log.focus)
    .filter((score): score is number => score !== null)
  
  const avgFocus = focusScores.length > 0
    ? focusScores.reduce((sum, score) => sum + score, 0) / focusScores.length
    : 0

  // 시험 성적 계산
  const testScores = testLogs
    .map(log => log.test_score)
    .filter((score): score is number => score !== null)
  
  const avgTestScore = testScores.length > 0
    ? testScores.reduce((sum, score) => sum + score, 0) / testScores.length
    : 0

  // 점수 향상도 계산 (첫 번째 절반 vs 두 번째 절반)
  const halfPoint = Math.floor(testScores.length / 2)
  const firstHalf = testScores.slice(0, halfPoint)
  const secondHalf = testScores.slice(halfPoint)
  
  const firstHalfAvg = firstHalf.length > 0 
    ? firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length 
    : 0
  const secondHalfAvg = secondHalf.length > 0 
    ? secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length 
    : 0
  
  const testScoreImprovement = secondHalfAvg - firstHalfAvg

  // 교재 정보 수집
  const booksUsed = [
    ...new Set([
      ...studyLogs.map(log => log.book1).filter(Boolean),
      ...studyLogs.map(log => log.book2).filter(Boolean)
    ])
  ] as string[]

  // 진도 기록 수집
  const progressNotes = [
    ...new Set([
      ...studyLogs.map(log => log.book1log).filter(Boolean),
      ...studyLogs.map(log => log.book2log).filter(Boolean)
    ])
  ] as string[]

  return {
    avgAttendance: Math.round(avgAttendance * 10) / 10,
    attendanceRate: Math.round(attendanceRate * 10) / 10,
    avgHomework: Math.round(avgHomework * 10) / 10,
    avgFocus: Math.round(avgFocus * 10) / 10,
    avgTestScore: Math.round(avgTestScore * 10) / 10,
    testScoreImprovement: Math.round(testScoreImprovement * 10) / 10,
    totalClasses,
    totalTests,
    booksUsed,
    progressNotes
  }
}

// 특이사항 수집 함수
function collectSpecialNotes(studyLogs: StudyLogSummary[], testLogs: TestLogSummary[]): string[] {
  const notes: string[] = []
  
  // 수업 특이사항
  studyLogs.forEach(log => {
    if (log.note && log.note.trim() && !log.note.includes('담당교사:')) {
      notes.push(`${log.date}: ${log.note}`)
    }
  })
  
  // 시험 특이사항 (결석 등) - 담당교사 정보는 제외
  testLogs.forEach(log => {
    if (log.note && log.note.trim() && !log.note.includes('담당교사:')) {
      notes.push(`${log.date}: ${log.note}`)
    }
  })
  
  return notes
}

// 메인 월별 분석 데이터 조회 함수
export async function getMonthlyAnalytics(
  studentId: string,
  year: number,
  month: number
): Promise<AnalyticsApiResponse<MonthlyReportData>> {
  try {
    const supabase = await createServerSupabaseClient()
    
    // 해당 월의 시작일과 종료일 계산
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0] // 해당 월의 마지막 날
    
    // 1. 학생 정보 조회
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .single()
    
    if (studentError || !studentData) {
      return { success: false, error: "학생 정보를 찾을 수 없습니다." }
    }
    
    // 2. study_logs 데이터 조회 (created_by 포함)
    const { data: studyLogsData, error: studyError } = await supabase
      .from("study_logs")
      .select("*, created_by")
      .eq("student_id", studentId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true })
    
    if (studyError) {
      return { success: false, error: "수업 기록 조회 중 오류가 발생했습니다." }
    }
    
    // 3. test_logs 데이터 조회 (created_by 포함)
    const { data: testLogsData, error: testError } = await supabase
      .from("test_logs")
      .select("*, created_by")
      .eq("student_id", studentId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true })
    
    if (testError) {
      return { success: false, error: "시험 기록 조회 중 오류가 발생했습니다." }
    }
    
    // 4. 데이터 변환
    const student = mapStudentRowToInfo(studentData)
    const studyLogs = (studyLogsData || []).map(mapStudyLogRowToSummary)
    const testLogs = (testLogsData || []).map(mapTestLogRowToSummary)
    
    // 5. 통계 계산
    const monthlyStats = calculateMonthlyStats(studyLogs, testLogs)
    
    // 6. 특이사항 수집
    const specialNotes = collectSpecialNotes(studyLogs, testLogs)
    
    // 7. 최종 데이터 구성
    const reportData: MonthlyReportData = {
      student,
      year,
      month,
      studyLogs,
      testLogs,
      monthlyStats,
      specialNotes
    }
    
    return { success: true, data: reportData }
    
  } catch (error) {
    console.error("getMonthlyAnalytics 오류:", error)
    return { 
      success: false, 
      error: "월별 분석 데이터 조회 중 오류가 발생했습니다." 
    }
  }
}

// 김소은 학생 보고서 형태의 텍스트 보고서 생성
export async function generateMonthlyReport(
  studentId: string,
  year: number,
  month: number
): Promise<AnalyticsApiResponse<string>> {
  try {
    const analyticsResult = await getMonthlyAnalytics(studentId, year, month)
    
    if (!analyticsResult.success || !analyticsResult.data) {
      return { success: false, error: analyticsResult.error }
    }
    
    const { student, studyLogs, testLogs, monthlyStats, specialNotes } = analyticsResult.data
    
    // 학생의 반 정보 조회
    const supabase = await createServerSupabaseClient()
    const { data: classData } = await supabase
      .from("class_students")
      .select("class_id, classes(name)")
      .eq("student_id", studentId)
      .single()
    
    const className = classData?.classes?.name || "미배정"
    
    // 선생님별 데이터 그룹핑
    const teacherDataMap = new Map<string, {
      teacherName: string
      teacherId: string
      studyLogs: StudyLogSummary[]
      testLogs: TestLogSummary[]
      books: Map<string, string[]>
    }>()
    
    // study_logs를 선생님별로 그룹핑
    for (const log of studyLogs) {
      // @ts-ignore
      if (log.created_by) {
        // @ts-ignore
        const teacherId = log.created_by
        if (!teacherDataMap.has(teacherId)) {
          // 선생님 이름 조회
          const { data: employee } = await supabase
            .from("employees")
            .select("name")
            .eq("id", teacherId)
            .single()
          
          teacherDataMap.set(teacherId, {
            teacherName: employee?.name || "미확인",
            teacherId,
            studyLogs: [],
            testLogs: [],
            books: new Map()
          })
        }
        
        const teacherData = teacherDataMap.get(teacherId)!
        teacherData.studyLogs.push(log)
        
        // 교재 정보 수집
        if (log.book1 && log.book1log) {
          if (!teacherData.books.has(log.book1)) {
            teacherData.books.set(log.book1, [])
          }
          teacherData.books.get(log.book1)!.push(`${log.date}: ${log.book1log}`)
        }
        if (log.book2 && log.book2log) {
          if (!teacherData.books.has(log.book2)) {
            teacherData.books.set(log.book2, [])
          }
          teacherData.books.get(log.book2)!.push(`${log.date}: ${log.book2log}`)
        }
      }
    }
    
    // test_logs를 선생님별로 그룹핑
    for (const log of testLogs) {
      // @ts-ignore
      if (log.created_by && teacherDataMap.has(log.created_by)) {
        // @ts-ignore
        teacherDataMap.get(log.created_by)!.testLogs.push(log)
      }
    }
    
    // 보고서 헤더
    let report = `${student.name} 학생 월간 학습 보고서

`
    
    // 기본 정보 및 핵심 지표
    report += `${year}년 ${month}월 | ${student.school || '학교 미등록'} ${student.grade || ''}학년 | ${className}

`
    
    // 핵심 지표 대시보드 (개선된 UI)
    // 출석률 계산 수정 (1은 결석)
    const attendanceDays = studyLogs.filter(log => log.attendance_status && log.attendance_status !== 1).length
    const totalDays = studyLogs.length
    const realAttendanceRate = totalDays > 0 ? (attendanceDays / totalDays) * 100 : 0
    
    const attendanceIcon = realAttendanceRate >= 90 ? '🟢' : realAttendanceRate >= 80 ? '🟡' : '🔴'
    const scoreIcon = monthlyStats.avgTestScore >= 90 ? '🟢' : monthlyStats.avgTestScore >= 80 ? '🟡' : '🔴'
    
    report += `이번 달 핵심 지표\n\n`
    
    // 첫 번째 줄 지표
    report += `출석률 ${attendanceIcon} ${realAttendanceRate.toFixed(0)}% | 평균성적 ${scoreIcon} ${monthlyStats.avgTestScore}점 | 총 시험수 ${testLogs.length}회\n`
    report += `과제수행 ${monthlyStats.avgHomework.toFixed(1)}/5.0 | 집중도 ${monthlyStats.avgFocus.toFixed(1)}/5.0`
    
    // 선생님별 학습일수 추가
    const teacherClassCount = new Map<string, number>()
    teacherDataMap.forEach((data, teacherId) => {
      teacherClassCount.set(data.teacherName, data.studyLogs.length)
    })
    
    if (teacherClassCount.size > 0) {
      report += ` | 학습일수: `
      const teacherCountArray = Array.from(teacherClassCount.entries())
      teacherCountArray.forEach(([name, count], index) => {
        report += `${name}(${count})`
        if (index < teacherCountArray.length - 1) report += ', '
      })
    }
    report += ` (총 ${studyLogs.length}일)`
    
    report += `\n\n`
    
    // 과제수행, 집중도 2.5 미만 경고
    if (monthlyStats.avgHomework < 2.5 || monthlyStats.avgFocus < 2.5) {
      report += `⚠️ 주의: `
      if (monthlyStats.avgHomework < 2.5) report += `과제수행도 ${monthlyStats.avgHomework.toFixed(1)} `
      if (monthlyStats.avgFocus < 2.5) report += `집중도 ${monthlyStats.avgFocus.toFixed(1)} `
      report += `(기준: 2.5 이상)\n\n`
    }
    
    // 선생님별 학습 현황
    teacherDataMap.forEach((data, teacherId) => {
      const avgScore = data.testLogs.length > 0 
        ? data.testLogs.reduce((sum, log) => sum + (log.test_score || 0), 0) / data.testLogs.length
        : 0
        
      report += `${data.teacherName} 선생님
`
      
      // 교재 진도
      if (data.books.size > 0) {
        report += `교재 진도\n`
        data.books.forEach((progress, bookName) => {
          report += `• ${bookName}\n`
          progress.forEach(p => {  // 모든 진도 표시
            report += `  - ${p}\n`
          })
        })
        report += `\n`
      }
      
      // 시험 결과
      if (data.testLogs.length > 0) {
        report += `시험 결과 (평균: ${avgScore.toFixed(1)}점)\n`
        data.testLogs
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-5)  // 최근 5개만 표시
          .forEach(log => {
            if (log.test_score !== null) {
              const icon = log.test_score >= 90 ? '✅' : log.test_score >= 80 ? '⚠️' : '❌'
              report += `• ${log.date.slice(5)} ${log.test || '시험'}: ${log.test_score}점 ${icon}\n`
            }
          })
      }
      
      report += `\n`
    })
    
    // 특이사항 (담당교사 정보가 아닌 의미있는 기록만)
    if (specialNotes.length > 0) {
      report += `주요 기록\n`
      specialNotes.forEach(note => {
        report += `• ${note}\n`
      })
      report += `\n`
    }
    
    // 종합 평가 섹션
    report += `\n────────────────────\n종합 평가\n\n(선생님이 직접 작성해주세요)`
    
    return { success: true, data: report }
    
  } catch (error) {
    console.error("generateMonthlyReport 오류:", error)
    return { 
      success: false, 
      error: "월별 보고서 생성 중 오류가 발생했습니다." 
    }
  }
}

// 학생 목록 조회 (analytics 필터용)
export async function getStudentsForAnalytics(): Promise<AnalyticsApiResponse<StudentInfo[]>> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from("students")
      .select("id, name, department, grade, school")
      .eq("status", "재원")
      .order("name", { ascending: true })
    
    if (error) {
      return { success: false, error: "학생 목록 조회 중 오류가 발생했습니다." }
    }
    
    const students = (data || []).map(mapStudentRowToInfo)
    
    return { success: true, data: students }
    
  } catch (error) {
    console.error("getStudentsForAnalytics 오류:", error)
    return { 
      success: false, 
      error: "학생 목록 조회 중 오류가 발생했습니다." 
    }
  }
}

// 교재별 진도 분석
export async function getBookProgressAnalysis(
  studentId: string,
  year: number,
  month: number
): Promise<AnalyticsApiResponse<BookProgress[]>> {
  try {
    const analyticsResult = await getMonthlyAnalytics(studentId, year, month)
    
    if (!analyticsResult.success || !analyticsResult.data) {
      return { success: false, error: analyticsResult.error }
    }
    
    const { studyLogs } = analyticsResult.data
    const bookProgressMap = new Map<string, {
      chapters: Set<string>
      dates: string[]
      lastDate: string
    }>()
    
    // 교재별 진도 수집
    studyLogs.forEach(log => {
      if (log.book1 && log.book1log) {
        if (!bookProgressMap.has(log.book1)) {
          bookProgressMap.set(log.book1, { 
            chapters: new Set(), 
            dates: [],
            lastDate: log.date 
          })
        }
        const bookData = bookProgressMap.get(log.book1)!
        bookData.chapters.add(log.book1log)
        bookData.dates.push(log.date)
        bookData.lastDate = log.date
      }
      if (log.book2 && log.book2log) {
        if (!bookProgressMap.has(log.book2)) {
          bookProgressMap.set(log.book2, { 
            chapters: new Set(), 
            dates: [],
            lastDate: log.date 
          })
        }
        const bookData = bookProgressMap.get(log.book2)!
        bookData.chapters.add(log.book2log)
        bookData.dates.push(log.date)
        bookData.lastDate = log.date
      }
    })
    
    const bookProgresses: BookProgress[] = []
    
    bookProgressMap.forEach((bookData, bookName) => {
      const chapters = Array.from(bookData.chapters).sort()
      const completedChapters = chapters.length
      
      // 현재 진도 (마지막 기록)
      const currentChapter = chapters[chapters.length - 1] || ""
      
      // 진도율 계산 없이 실제 완료된 챕터만 표시
      // totalChapters는 표시하지 않거나 완료된 챕터 수로 표시
      
      bookProgresses.push({
        bookName,
        chapters,
        currentChapter,
        completedChapters,
        totalChapters: completedChapters, // 실제 진행한 챕터 수만 표시
        progressPercentage: 0, // 퍼센트는 사용하지 않음
        lastUpdated: bookData.lastDate
      })
    })
    
    // 마지막 업데이트 날짜 기준으로 정렬
    bookProgresses.sort((a, b) => {
      const dateA = a.lastUpdated || '0000-00-00'
      const dateB = b.lastUpdated || '0000-00-00'
      return dateB.localeCompare(dateA)
    })
    
    return { success: true, data: bookProgresses }
    
  } catch (error) {
    console.error("getBookProgressAnalysis 오류:", error)
    return { 
      success: false, 
      error: "교재 진도 분석 중 오류가 발생했습니다." 
    }
  }
}

// 월별 보고서 저장
export async function saveMonthlyReport(
  studentId: string,
  year: number,
  month: number,
  reportContent: string,
  teacherComment?: string
): Promise<AnalyticsApiResponse<{ id: string }>> {
  try {
    const supabase = await createServerSupabaseClient()
    
    // 기존 보고서가 있는지 확인
    const { data: existing, error: checkError } = await supabase
      .from("monthly_reports")
      .select("id")
      .eq("student_id", studentId)
      .eq("year", year)
      .eq("month", month)
      .single()
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116은 no rows found
      throw checkError
    }
    
    let result
    
    if (existing) {
      // 기존 보고서 업데이트
      result = await supabase
        .from("monthly_reports")
        .update({
          report_content: reportContent,
          teacher_comment: teacherComment,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id)
        .select("id")
        .single()
    } else {
      // 새 보고서 생성
      result = await supabase
        .from("monthly_reports")
        .insert({
          student_id: studentId,
          year,
          month,
          report_content: reportContent,
          teacher_comment: teacherComment
        })
        .select("id")
        .single()
    }
    
    if (result.error) {
      throw result.error
    }
    
    return { success: true, data: { id: result.data.id } }
    
  } catch (error) {
    console.error("saveMonthlyReport 오류:", error)
    return { 
      success: false, 
      error: "월별 보고서 저장 중 오류가 발생했습니다." 
    }
  }
}

// 저장된 월별 보고서 조회
export async function getSavedMonthlyReports(
  studentId?: string,
  year?: number,
  month?: number
): Promise<AnalyticsApiResponse<any[]>> {
  try {
    const supabase = await createServerSupabaseClient()
    
    let query = supabase
      .from("monthly_reports")
      .select(`
        *,
        student:students(id, name, school, grade, department)
      `)
    
    if (studentId) {
      query = query.eq("student_id", studentId)
    }
    
    if (year) {
      query = query.eq("year", year)
    }
    
    if (month) {
      query = query.eq("month", month)
    }
    
    const { data, error } = await query.order("created_at", { ascending: false })
    
    if (error) {
      throw error
    }
    
    return { success: true, data: data || [] }
    
  } catch (error) {
    console.error("getSavedMonthlyReports 오류:", error)
    return { 
      success: false, 
      error: "저장된 보고서 조회 중 오류가 발생했습니다." 
    }
  }
}

// 특정 보고서 조회
export async function getSavedReportById(
  reportId: string
): Promise<AnalyticsApiResponse<{
  report_content: string
  student: StudentInfo
  year: number
  month: number
  created_at: string
  teacher_comment?: string
}>> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data, error } = await supabase
      .from("monthly_reports")
      .select(`
        *,
        student:students(id, name, school, grade, department)
      `)
      .eq("id", reportId)
      .single()
    
    if (error) {
      throw error
    }
    
    if (!data) {
      return { success: false, error: "보고서를 찾을 수 없습니다." }
    }
    
    return { 
      success: true, 
      data: {
        report_content: data.report_content,
        student: mapStudentRowToInfo(data.student),
        year: data.year,
        month: data.month,
        created_at: data.created_at,
        teacher_comment: data.teacher_comment
      }
    }
    
  } catch (error) {
    console.error("getSavedReportById 오류:", error)
    return { 
      success: false, 
      error: "보고서 조회 중 오류가 발생했습니다." 
    }
  }
}

// 반별 보고서 생성
export async function generateClassReport(
  classId: string | "all",
  year: number,
  month: number
): Promise<AnalyticsApiResponse<string>> {
  try {
    const classAnalyticsResult = await getClassAnalytics(classId, year, month)
    
    if (!classAnalyticsResult.success || !classAnalyticsResult.data) {
      return { success: false, error: classAnalyticsResult.error }
    }
    
    const { classInfo, students } = classAnalyticsResult.data
    
    // 보고서 헤더
    let report = `📊 ${year}년 ${month}월 월간 학습 보고서\n`
    if (classInfo) {
      report += `🏫 반: ${classInfo.name}\n`
    } else {
      report += `🏫 전체 학생\n`
    }
    report += `\n========================\n`
    
    // 반별 통계 요약
    const classStats = {
      totalStudents: students.length,
      avgTestScore: 0,
      avgAttendance: 0,
      totalTests: 0,
      booksUsed: new Set<string>()
    }
    
    students.forEach(({ monthlyStats }) => {
      if (monthlyStats.totalTests > 0) {
        classStats.avgTestScore += monthlyStats.avgTestScore
        classStats.totalTests++
      }
      classStats.avgAttendance += monthlyStats.avgAttendance
      monthlyStats.booksUsed.forEach(book => classStats.booksUsed.add(book))
    })
    
    if (classStats.totalTests > 0) {
      classStats.avgTestScore /= classStats.totalTests
    }
    classStats.avgAttendance /= students.length
    
    report += `\n📈 반 전체 통계\n`
    report += `▪️ 총 학생 수: ${classStats.totalStudents}명\n`
    report += `▪️ 평균 출석 점수: ${classStats.avgAttendance.toFixed(1)}/5.0\n`
    if (classStats.totalTests > 0) {
      report += `▪️ 평균 시험 점수: ${classStats.avgTestScore.toFixed(1)}점\n`
    }
    report += `▪️ 사용 교재: ${Array.from(classStats.booksUsed).join(', ')}\n`
    
    // 각 학생별 상세 보고
    report += `\n========================\n\n`
    report += `📚 학생별 학습 현황\n`
    
    students.forEach(({ student, monthlyStats, bookProgresses, testLogs }) => {
      report += `\n------------------------\n`
      report += `👤 ${student.name} (${student.school || '학교 미등록'} ${student.grade || '?'}학년)\n`
      
      // 교재 진도
      if (bookProgresses.length > 0) {
        report += `\n▪️ 교재 진도:\n`
        bookProgresses.forEach(book => {
          report += `  - ${book.bookName}: ${book.currentChapter || '시작 전'} (${book.completedChapters}개 완료)\n`
        })
      }
      
      // 시험 성적
      if (testLogs.length > 0) {
        report += `\n▪️ 시험 성적:\n`
        testLogs.forEach(test => {
          if (test.test_score !== null) {
            report += `  - ${test.date} ${test.test || '시험'}: ${test.test_score}점\n`
          }
        })
        report += `  평균: ${monthlyStats.avgTestScore.toFixed(1)}점\n`
      }
      
      // 학습 태도
      report += `\n▪️ 학습 태도:\n`
      report += `  - 출석: ${monthlyStats.avgAttendance.toFixed(1)}/5.0\n`
      report += `  - 과제: ${monthlyStats.avgHomework.toFixed(1)}/5.0\n`
      report += `  - 집중도: ${monthlyStats.avgFocus.toFixed(1)}/5.0\n`
    })
    
    return { success: true, data: report }
    
  } catch (error) {
    console.error("generateClassReport 오류:", error)
    return { 
      success: false, 
      error: "반별 보고서 생성 중 오류가 발생했습니다." 
    }
  }
}

// 반별 분석 데이터 조회 함수
export async function getClassAnalytics(
  classId: string | "all",
  year: number,
  month: number
): Promise<AnalyticsApiResponse<{
  classInfo?: { id: string; name: string }
  students: Array<{
    student: StudentInfo
    studyLogs: StudyLogSummary[]
    testLogs: TestLogSummary[]
    monthlyStats: MonthlyStats
    bookProgresses: BookProgress[]
  }>
}>> {
  try {
    const supabase = await createServerSupabaseClient()
    
    // 해당 월의 시작일과 종료일 계산
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]
    
    // 1. 반 정보 및 학생 목록 조회
    let classInfo = null
    let studentIds: string[] = []
    
    if (classId === "all") {
      // 모든 재원 학생 조회
      const { data: students, error } = await supabase
        .from("students")
        .select("id")
        .eq("status", "재원")
      
      if (error) throw error
      studentIds = students?.map(s => s.id) || []
    } else {
      // 특정 반 정보 조회
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("id, name")
        .eq("id", classId)
        .single()
      
      if (classError) throw classError
      classInfo = classData
      
      // 해당 반 학생 조회
      const { data: classStudents, error: studentsError } = await supabase
        .from("class_students")
        .select("student_id")
        .eq("class_id", classId)
      
      if (studentsError) throw studentsError
      studentIds = classStudents?.map(cs => cs.student_id) || []
    }
    
    // 2. 각 학생의 데이터 조회
    const studentsData = []
    
    for (const studentId of studentIds) {
      const analyticsResult = await getMonthlyAnalytics(studentId, year, month)
      
      if (analyticsResult.success && analyticsResult.data) {
        const bookProgressResult = await getBookProgressAnalysis(studentId, year, month)
        
        studentsData.push({
          student: analyticsResult.data.student,
          studyLogs: analyticsResult.data.studyLogs,
          testLogs: analyticsResult.data.testLogs,
          monthlyStats: analyticsResult.data.monthlyStats,
          bookProgresses: bookProgressResult.success ? bookProgressResult.data || [] : []
        })
      }
    }
    
    return { 
      success: true, 
      data: {
        classInfo,
        students: studentsData
      }
    }
    
  } catch (error) {
    console.error("getClassAnalytics 오류:", error)
    return { 
      success: false, 
      error: "반별 분석 데이터 조회 중 오류가 발생했습니다." 
    }
  }
}

// 자동 보고서 생성 (매월 초 실행용)
export async function generateAllMonthlyReports(
  year: number,
  month: number
): Promise<AnalyticsApiResponse<{ total: number, success: number, failed: number }>> {
  try {
    const supabase = await createServerSupabaseClient()
    
    // 재원 상태의 모든 학생 조회
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, name")
      .eq("status", "재원")
    
    if (studentsError) {
      throw studentsError
    }
    
    let successCount = 0
    let failedCount = 0
    
    // 각 학생에 대해 보고서 생성
    for (const student of students || []) {
      try {
        // 보고서 생성
        const reportResult = await generateMonthlyReport(student.id, year, month)
        
        if (reportResult.success && reportResult.data) {
          // 보고서 저장
          const saveResult = await saveMonthlyReport(
            student.id,
            year,
            month,
            reportResult.data,
            "(선생님이 직접 작성해주세요)"
          )
          
          if (saveResult.success) {
            successCount++
          } else {
            failedCount++
          }
        } else {
          failedCount++
        }
      } catch (error) {
        console.error(`${student.name} 학생 보고서 생성 실패:`, error)
        failedCount++
      }
    }
    
    return { 
      success: true, 
      data: { 
        total: students?.length || 0,
        success: successCount,
        failed: failedCount
      }
    }
    
  } catch (error) {
    console.error("generateAllMonthlyReports 오류:", error)
    return { 
      success: false, 
      error: "전체 보고서 생성 중 오류가 발생했습니다." 
    }
  }
}