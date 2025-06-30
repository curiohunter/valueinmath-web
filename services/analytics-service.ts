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
function mapStudyLogRowToSummary(row: StudyLogRow): StudyLogSummary {
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
  }
}

function mapTestLogRowToSummary(row: TestLogRow): TestLogSummary {
  return {
    id: row.id,
    date: row.date,
    class_id: row.class_id,
    test_type: row.test_type,
    test: row.test,
    test_score: row.test_score,
    note: row.note,
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
    if (log.note && log.note.trim()) {
      notes.push(`${log.date}: ${log.note}`)
    }
  })
  
  // 시험 특이사항 (결석 등)
  testLogs.forEach(log => {
    if (log.note && log.note.trim()) {
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
    
    // 2. study_logs 데이터 조회
    const { data: studyLogsData, error: studyError } = await supabase
      .from("study_logs")
      .select("*")
      .eq("student_id", studentId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true })
    
    if (studyError) {
      return { success: false, error: "수업 기록 조회 중 오류가 발생했습니다." }
    }
    
    // 3. test_logs 데이터 조회
    const { data: testLogsData, error: testError } = await supabase
      .from("test_logs")
      .select("*")
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
    
    // 보고서 텍스트 생성
    let report = `📊 ${student.name} 학생 (${year}.${month})월 학습 보고서

------------------------

📈 학습 개요

▪️ 교재 진도`
    
    // 교재별 진도 정리
    const bookProgressMap = new Map<string, string[]>()
    studyLogs.forEach(log => {
      if (log.book1 && log.book1log) {
        if (!bookProgressMap.has(log.book1)) {
          bookProgressMap.set(log.book1, [])
        }
        bookProgressMap.get(log.book1)!.push(`${log.date} : ${log.book1log}`)
      }
      if (log.book2 && log.book2log) {
        if (!bookProgressMap.has(log.book2)) {
          bookProgressMap.set(log.book2, [])
        }
        bookProgressMap.get(log.book2)!.push(`${log.date} : ${log.book2log}`)
      }
    })
    
    bookProgressMap.forEach((progress, book) => {
      report += `\n- ${book}\n`
      progress.forEach(entry => {
        report += `  ${entry}\n`
      })
    })
    
    // 교재 진도 섹션 - 학습 개요에 이미 교재 진도가 포함되어 있으므로 제거

    // 시험 결과 섹션
    if (monthlyStats.totalTests > 0) {
      report += `

------------------------

📝 시험 결과

▪️ 성적 요약
- 평균 점수: ${monthlyStats.avgTestScore}점
- 총 시험 횟수: ${monthlyStats.totalTests}회`

      if (monthlyStats.testScoreImprovement !== 0) {
        const improvement = monthlyStats.testScoreImprovement > 0 ? '향상' : '하락'
        report += `
- 점수 변화: ${Math.abs(monthlyStats.testScoreImprovement)}점 ${improvement}`
      }
    }
    
    // 기타 보고 섹션
    if (specialNotes.length > 0) {
      report += `

------------------------

📝 기타 보고

▪️ 특이사항`
      specialNotes.forEach(note => {
        report += `\n- ${note}`
      })
    }
    
    // 선생님 코멘트 섹션 - 빈칸으로 제공하여 선생님이 직접 작성
    report += `

------------------------

👨‍🏫 선생님 코멘트

▪️ 종합 평가
(선생님이 직접 작성해주세요)`
    
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
    const bookProgressMap = new Map<string, Set<string>>()
    
    // 교재별 진도 수집
    studyLogs.forEach(log => {
      if (log.book1 && log.book1log) {
        if (!bookProgressMap.has(log.book1)) {
          bookProgressMap.set(log.book1, new Set())
        }
        bookProgressMap.get(log.book1)!.add(log.book1log)
      }
      if (log.book2 && log.book2log) {
        if (!bookProgressMap.has(log.book2)) {
          bookProgressMap.set(log.book2, new Set())
        }
        bookProgressMap.get(log.book2)!.add(log.book2log)
      }
    })
    
    const bookProgresses: BookProgress[] = []
    
    bookProgressMap.forEach((chaptersSet, bookName) => {
      const chapters = Array.from(chaptersSet).sort()
      const completedChapters = chapters.length
      
      // 현재 진도 추정 (마지막 기록)
      const currentChapter = chapters[chapters.length - 1] || ""
      
      // 진도율 계산 (임시로 장 수 기반)
      const progressPercentage = Math.min((completedChapters / 10) * 100, 100)
      
      bookProgresses.push({
        bookName,
        chapters,
        currentChapter,
        completedChapters,
        totalChapters: Math.max(completedChapters + 2, 10), // 추정
        progressPercentage: Math.round(progressPercentage)
      })
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
    
    const { data, error } = await query.order("year", { ascending: false }).order("month", { ascending: false })
    
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