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

    // 학생명 검색 시 먼저 student_id 목록 조회
    let studentIds: string[] | null = null
    if (filters.search) {
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .ilike("name", `%${filters.search}%`)

      if (students && students.length > 0) {
        studentIds = students.map(s => s.id)
      } else {
        // 검색 결과 없음
        return { data: [], count: 0 }
      }
    }

    let query = supabase
      .from("school_exam_scores")
      .select(
        `
        *,
        student:students!inner(name, grade, status),
        school:schools(id, name, school_type),
        school_exam:school_exams(pdf_file_path)
      `,
        { count: "exact" }
      )

    // 학생명 검색 필터 (student_id로 필터)
    if (studentIds) {
      query = query.in("student_id", studentIds)
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

    // 서버 정렬: 연도↓ → 학기↓ → 시험유형 → 학교유형 → 학년↓ → 학교명 → 과목명
    query = query.order("exam_year", { ascending: false })
    query = query.order("semester", { ascending: false })
    query = query.order("exam_type", { ascending: true })  // 기말 < 중간 (가나다순)
    query = query.order("school_type", { ascending: true }) // 고등학교 < 중학교 (가나다순)
    query = query.order("grade", { ascending: false })     // 3 → 2 → 1
    query = query.order("school_name", { ascending: true })
    query = query.order("subject", { ascending: true })

    // 페이지네이션
    const { data, error, count } = await query.range(from, to)

    if (error) {
      // PGRST103: offset이 총 row 수보다 클 때 발생
      // 필터 적용 후 결과가 줄어든 경우 - 빈 배열 반환 (UI에서 페이지 리셋 처리)
      if (error.code === "PGRST103") {
        return {
          data: [],
          count: count || 0,
        }
      }
      throw error
    }

    return {
      data: (data as SchoolExamScore[]) || [],
      count: count || 0,
    }
  } catch (error: any) {
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
        school:schools(id, name, school_type),
        school_exam:school_exams(pdf_file_path)
      `
      )
      .eq("id", id)
      .single()

    if (error) throw error
    return data as SchoolExamScore
  } catch {
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

    // 학교 정보 가져오기 (school_name, school_type 저장을 위해)
    const { data: school } = await supabase
      .from("schools")
      .select("name, school_type")
      .eq("id", formData.school_id)
      .single()

    if (!school) throw new Error("School not found")

    // 각 과목별로 개별 행 생성
    const scoresData = formData.scores.map((scoreItem) => ({
      student_id: formData.student_id,
      school_id: formData.school_id,
      school_name: school.name,
      school_type: school.school_type,
      grade: formData.grade,
      semester: formData.semester,
      exam_year: formData.exam_year,
      exam_type: formData.exam_type,
      school_exam_id: formData.school_exam_id || null,
      subject: scoreItem.subject,
      score: scoreItem.score,
      notes: formData.notes || null,
      created_by: employee.id,
    }))

    const { error } = await supabase.from("school_exam_scores").insert(scoresData)

    if (error) {
      // 중복 키 오류 처리
      if (error.code === '23505') {
        throw new Error("이미 등록된 성적입니다. 동일한 학생/학교/연도/학기/시험유형/과목 조합은 중복 등록할 수 없습니다.")
      }
      throw error
    }

    return { success: true }
  } catch (error: any) {
    throw error
  }
}

// 학교 시험 성적 수정 (전체 필드)
export async function updateSchoolExamScore(
  id: string,
  formData: {
    school_id: string
    grade: 1 | 2 | 3
    semester: 1 | 2
    exam_year: number
    exam_type: "중간고사" | "기말고사"
    school_exam_id?: string | null
    subject: string
    score: number | null
    notes?: string
  }
): Promise<{ success: boolean }> {
  try {
    const supabase = getSupabaseBrowserClient()

    // 학교 정보 가져오기 (school_name, school_type 저장을 위해)
    const { data: school } = await supabase
      .from("schools")
      .select("name, school_type")
      .eq("id", formData.school_id)
      .single()

    if (!school) throw new Error("School not found")

    const updateData = {
      school_id: formData.school_id,
      school_name: school.name,
      school_type: school.school_type,
      grade: formData.grade,
      semester: formData.semester,
      exam_year: formData.exam_year,
      exam_type: formData.exam_type,
      school_exam_id: formData.school_exam_id || null,
      subject: formData.subject,
      score: formData.score,
      notes: formData.notes || null,
    }

    const { error } = await supabase.from("school_exam_scores").update(updateData).eq("id", id)

    if (error) throw error

    return { success: true }
  } catch (error) {
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
  } catch {
    return []
  }
}

// 학교 목록 조회 (중학교, 고등학교만)
export async function getSchools(): Promise<Array<{ id: string; name: string; school_type: string; short_name: string | null }>> {
  try {
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("schools")
      .select("id, name, school_type, short_name")
      .in("school_type", ["중학교", "고등학교"])
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (error) throw error

    return data || []
  } catch {
    return []
  }
}

// 학교명 목록 조회 (필터용 - 기존 데이터 기반)
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
  } catch {
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
  } catch {
    return []
  }
}

// 재원/퇴원 학생 목록 조회 (등록 모달용)
export async function getActiveStudents(): Promise<
  Array<{ id: string; name: string; grade: number; status: string; school_id: string | null; school_name: string | null; school_grade: number | null }>
> {
  try {
    const supabase = getSupabaseBrowserClient()

    // 학생 기본 정보
    const { data: students, error } = await supabase
      .from("students")
      .select("id, name, grade, status")
      .in("status", ["재원", "퇴원"])
      .order("status", { ascending: true })
      .order("name", { ascending: true })

    if (error) throw error
    if (!students || students.length === 0) return []

    // student_schools에서 현재 학교 정보 가져오기
    const studentIds = students.map(s => s.id)
    const { data: studentSchools } = await supabase
      .from("student_schools")
      .select(`
        student_id,
        school_id,
        grade,
        school:schools(name)
      `)
      .in("student_id", studentIds)
      .eq("is_current", true)

    // 학교 정보 맵 생성
    const schoolMap = new Map<string, { school_id: string | null; school_name: string | null; school_grade: number | null }>()
    studentSchools?.forEach((ss: any) => {
      schoolMap.set(ss.student_id, {
        school_id: ss.school_id,
        school_name: ss.school?.name || null,
        school_grade: ss.grade,
      })
    })

    // 학생 데이터에 학교 정보 합치기
    return students.map(student => ({
      ...student,
      school_id: schoolMap.get(student.id)?.school_id || null,
      school_name: schoolMap.get(student.id)?.school_name || null,
      school_grade: schoolMap.get(student.id)?.school_grade || null,
    }))
  } catch {
    return []
  }
}
