"use client"

import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { SchoolExamScore, SchoolExamScoreFilters, SchoolExamScoreFormData } from "@/types/school-exam-score"

// 학교 시험 성적 목록 조회
export async function getSchoolExamScores(
  page = 1,
  pageSize = 20,
  filters: Partial<SchoolExamScoreFilters> = {}
): Promise<{ data: SchoolExamScore[]; count: number }> {
  try {
    const supabase = getSupabaseBrowserClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from("school_exam_scores")
      .select(
        `
        *,
        student:students!inner(name, grade, status),
        school_exam:school_exams(pdf_file_path)
      `,
        { count: "exact" }
      )

    // 학생명 검색 필터
    if (filters.search) {
      query = query.ilike("student.name", `%${filters.search}%`)
    }

    // 학교명 검색 필터
    if (filters.school_name) {
      query = query.ilike("school_name", `%${filters.school_name}%`)
    }

    // 학교 타입 필터
    if (filters.school_type && filters.school_type !== "all") {
      query = query.eq("school_type", filters.school_type)
    }

    // 학년 필터
    if (filters.grade && filters.grade !== "all") {
      query = query.eq("grade", filters.grade)
    }

    // 학기 필터
    if (filters.semester && filters.semester !== "all") {
      query = query.eq("semester", filters.semester)
    }

    // 시험 유형 필터
    if (filters.exam_type && filters.exam_type !== "all") {
      query = query.eq("exam_type", filters.exam_type)
    }

    // 출제연도 필터
    if (filters.exam_year && filters.exam_year !== "all") {
      query = query.eq("exam_year", filters.exam_year)
    }

    // 과목 필터
    if (filters.subject) {
      query = query.ilike("subject", `%${filters.subject}%`)
    }

    // 정렬: 최신순 (출제연도 내림차순, 학생명 오름차순, 과목명 오름차순)
    query = query.order("exam_year", { ascending: false })
    query = query.order("school_name", { ascending: true })
    query = query.order("subject", { ascending: true })

    // 페이지네이션
    const { data, error, count } = await query.range(from, to)

    if (error) throw error

    return {
      data: (data as SchoolExamScore[]) || [],
      count: count || 0,
    }
  } catch (error) {
    console.error("Error fetching school exam scores:", error)
    throw error
  }
}

// 학교 시험 성적 단일 조회
export async function getSchoolExamScore(id: string): Promise<SchoolExamScore | null> {
  try {
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("school_exam_scores")
      .select(
        `
        *,
        student:students(name, grade, status),
        school_exam:school_exams(pdf_file_path)
      `
      )
      .eq("id", id)
      .single()

    if (error) throw error
    return data as SchoolExamScore
  } catch (error) {
    console.error("Error fetching school exam score:", error)
    return null
  }
}

// 학교 시험 성적 생성 (여러 과목 동시 생성)
export async function createSchoolExamScores(formData: SchoolExamScoreFormData): Promise<{ success: boolean }> {
  try {
    const supabase = getSupabaseBrowserClient()

    // 현재 사용자 정보 가져오기
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("User not authenticated")

    // 직원 ID 가져오기
    const { data: employee } = await supabase
      .from("employees")
      .select("id")
      .eq("auth_id", user.id)
      .eq("status", "재직")
      .single()

    if (!employee) throw new Error("Employee not found")

    // 각 과목별로 개별 행 생성
    const scoresData = formData.scores.map((scoreItem) => ({
      student_id: formData.student_id,
      school_type: formData.school_type,
      grade: formData.grade,
      semester: formData.semester,
      school_name: formData.school_name,
      exam_year: formData.exam_year,
      exam_type: formData.exam_type,
      school_exam_id: formData.school_exam_id || null,
      subject: scoreItem.subject,
      score: scoreItem.score,
      notes: formData.notes || null,
      created_by: employee.id,
    }))

    const { error } = await supabase.from("school_exam_scores").insert(scoresData)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error creating school exam scores:", error)
    throw error
  }
}

// 학교 시험 성적 수정
export async function updateSchoolExamScore(
  id: string,
  formData: { subject: string; score: number | null; notes?: string }
): Promise<{ success: boolean }> {
  try {
    const supabase = getSupabaseBrowserClient()

    const updateData = {
      subject: formData.subject,
      score: formData.score,
      notes: formData.notes || null,
    }

    const { error } = await supabase.from("school_exam_scores").update(updateData).eq("id", id)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error updating school exam score:", error)
    throw error
  }
}

// 학교 시험 성적 삭제
export async function deleteSchoolExamScore(id: string): Promise<{ success: boolean }> {
  try {
    const supabase = getSupabaseBrowserClient()

    const { error } = await supabase.from("school_exam_scores").delete().eq("id", id)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error deleting school exam score:", error)
    throw error
  }
}

// 출제연도 목록 조회 (필터용)
export async function getScoreExamYears(): Promise<number[]> {
  try {
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("school_exam_scores")
      .select("exam_year")
      .order("exam_year", { ascending: false })

    if (error) throw error

    // 중복 제거
    const years = Array.from(new Set(data.map((item) => item.exam_year)))
    return years
  } catch (error) {
    console.error("Error fetching score exam years:", error)
    return []
  }
}

// 학교명 목록 조회 (필터용)
export async function getSchoolNames(): Promise<string[]> {
  try {
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("school_exam_scores")
      .select("school_name")
      .order("school_name", { ascending: true })

    if (error) throw error

    // 중복 제거
    const schools = Array.from(new Set(data.map((item) => item.school_name)))
    return schools
  } catch (error) {
    console.error("Error fetching school names:", error)
    return []
  }
}

// 과목 목록 조회 (필터용)
export async function getSubjects(): Promise<string[]> {
  try {
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("school_exam_scores")
      .select("subject")
      .order("subject", { ascending: true })

    if (error) throw error

    // 중복 제거
    const subjects = Array.from(new Set(data.map((item) => item.subject)))
    return subjects
  } catch (error) {
    console.error("Error fetching subjects:", error)
    return []
  }
}

// 재원/퇴원 학생 목록 조회 (등록 모달용)
export async function getActiveStudents(): Promise<
  Array<{ id: string; name: string; grade: number; status: string; school: string }>
> {
  try {
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("students")
      .select("id, name, grade, status, school")
      .in("status", ["재원", "퇴원"])
      .order("status", { ascending: true }) // 재원(ㅈ)이 퇴원(ㅌ)보다 먼저 (ㄱㄴㄷ순)
      .order("name", { ascending: true }) // 이름 ㄱㄴㄷ순

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Error fetching active students:", error)
    return []
  }
}
