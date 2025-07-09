// @ts-nocheck
"use server"

import { createServerClient } from "@/lib/auth/server"
import type { Student, StudentFilters } from "@/types/student"
import type { Database } from "@/types/database"

type StudentRow = Database["public"]["Tables"]["students"]["Row"]
type StudentInsert = Database["public"]["Tables"]["students"]["Insert"]
type StudentUpdate = Database["public"]["Tables"]["students"]["Update"]

// 학생 데이터 변환 함수 (DB 타입 -> 앱 타입)
function mapStudentRowToStudent(row: StudentRow): Student {
  return {
    id: row.id,
    name: row.name,
    student_phone: row.student_phone,
    parent_phone: row.parent_phone,
    status: row.status as Student["status"],
    department: row.department as Student["department"],
    school: row.school,
    school_type: row.school_type as Student["school_type"],
    grade: row.grade,
    has_sibling: row.has_sibling,
    lead_source: row.lead_source as Student["lead_source"],
    start_date: row.start_date,
    end_date: row.end_date,
    first_contact_date: row.first_contact_date,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// 학생 목록 조회
export async function getStudents(
  page = 1,
  pageSize = 10,
  filters: StudentFilters = { search: "", department: "all", status: "all" },
): Promise<{ data: Student[]; count: number }> {
  try {
    const supabase = await createServerClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase.from("students").select("*", { count: "exact" })

    // 검색어 필터 적용
    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,school.ilike.%${filters.search}%,student_phone.ilike.%${filters.search}%,parent_phone.ilike.%${filters.search}%`,
      )
    }

    // 부서 필터 적용
    if (filters.department !== "all") {
      query = query.eq("department", filters.department)
    }

    // 상태 필터 적용
    if (filters.status !== "all") {
      query = query.eq("status", filters.status)
    }

    // 정렬 적용
    // 상태가 "퇴원"인 경우 퇴원일(end_date) 기준 내림차순 정렬
    if (filters.status === "퇴원") {
      query = query.order("end_date", { ascending: false, nullsFirst: false })
    }
    // 상태가 "재원"인 경우 이름 기준 오름차순 정렬
    else if (filters.status === "재원" || filters.status === "all") {
      query = query.order("name", { ascending: true })
    }
    // 상태가 "미등록"인 경우 첫 연락일(first_contact_date) 기준 내림차순 정렬
    else if (filters.status === "미등록") {
      query = query.order("first_contact_date", { ascending: false, nullsFirst: false })
    }
    // 그 외 상태는 기본 정렬(업데이트 날짜 내림차순)
    else {
      query = query.order("updated_at", { ascending: false })
    }

    // 페이지네이션 적용
    const { data, error, count } = await query.range(from, to)

    if (error) throw error

    return {
      data: (data || []).map(mapStudentRowToStudent),
      count: count || 0,
    }
  } catch (error) {
    console.error("Error fetching students:", error)
    return { data: [], count: 0 }
  }
}

// 학생 상세 조회
export async function getStudentById(id: string): Promise<Student | null> {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase.from("students").select("*").eq("id", id).single()

    if (error) throw error
    if (!data) return null

    return mapStudentRowToStudent(data)
  } catch (error) {
    console.error(`Error fetching student with id ${id}:`, error)
    return null
  }
}

// 학생 등록
export async function createStudent(
  student: Omit<Student, "id" | "created_at" | "updated_at">,
): Promise<{ data: Student | null; error: Error | null }> {
  try {
    const supabase = await createServerClient()

    const studentData: StudentInsert = {
      name: student.name,
      student_phone: student.student_phone,
      parent_phone: student.parent_phone,
      status: student.status,
      department: student.department,
      school: student.school,
      school_type: student.school_type,
      grade: student.grade,
      has_sibling: student.has_sibling,
      lead_source: student.lead_source,
      start_date: student.start_date,
      end_date: student.end_date,
      first_contact_date: student.first_contact_date,
      notes: student.notes,
    }

    const { data, error } = await supabase.from("students").insert(studentData).select().single()

    if (error) throw error

    return { data: data ? mapStudentRowToStudent(data) : null, error: null }
  } catch (error) {
    console.error("Error creating student:", error)
    return { data: null, error: error as Error }
  }
}

// 학생 정보 수정
export async function updateStudent(
  id: string,
  student: Partial<Student>,
): Promise<{ data: Student | null; error: Error | null }> {
  try {
    const supabase = await createServerClient()

    const studentData: StudentUpdate = {
      name: student.name,
      student_phone: student.student_phone,
      parent_phone: student.parent_phone,
      status: student.status,
      department: student.department,
      school: student.school,
      school_type: student.school_type,
      grade: student.grade,
      has_sibling: student.has_sibling,
      lead_source: student.lead_source,
      start_date: student.start_date,
      end_date: student.end_date,
      first_contact_date: student.first_contact_date,
      notes: student.notes,
    }

    const { data, error } = await supabase.from("students").update(studentData).eq("id", id).select().single()

    if (error) throw error

    return { data: data ? mapStudentRowToStudent(data) : null, error: null }
  } catch (error) {
    console.error(`Error updating student with id ${id}:`, error)
    return { data: null, error: error as Error }
  }
}

// 학생 삭제
export async function deleteStudent(id: string): Promise<{ error: Error | null }> {
  try {
    const supabase = await createServerClient()
    const { error } = await supabase.from("students").delete().eq("id", id)

    if (error) throw error

    return { error: null }
  } catch (error) {
    console.error(`Error deleting student with id ${id}:`, error)
    return { error: error as Error }
  }
}

// 학생 soft delete (상태를 '삭제됨'으로 변경)
export async function softDeleteStudent(id: string): Promise<{ error: Error | null }> {
  try {
    const supabase = await createServerClient()
    const { error } = await supabase
      .from("students")
      .update({ status: "삭제됨" })
      .eq("id", id)

    if (error) throw error

    return { error: null }
  } catch (error) {
    console.error(`Error soft deleting student with id ${id}:`, error)
    return { error: error as Error }
  }
}

// 학생 메모 업데이트
export async function updateStudentNotes(
  id: string,
  notes: string,
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const supabase = await createServerClient()
    const { error } = await supabase.from("students").update({ notes }).eq("id", id)

    if (error) throw error

    return { success: true, error: null }
  } catch (error) {
    console.error(`Error updating notes for student with id ${id}:`, error)
    return { success: false, error: error as Error }
  }
}
