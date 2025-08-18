"use client"

import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { Student, StudentFilters } from "@/types/student"
import type { Database } from "@/types/database"

type StudentRow = Database["public"]["Tables"]["students"]["Row"]

// 학생 데이터 변환 함수 (DB 타입 -> 앱 타입)
function mapStudentRowToStudent(row: StudentRow): Student {
  return {
    id: row.id,
    name: row.name,
    student_phone: row.student_phone,
    parent_phone: row.parent_phone,
    status: row.status as Student["status"],
    department: row.department as Student["department"],
    notes: row.notes,
    school: row.school,
    school_type: row.school_type as Student["school_type"],
    grade: row.grade,
    has_sibling: row.has_sibling || false,
    lead_source: row.lead_source as Student["lead_source"],
    start_date: row.start_date,
    end_date: row.end_date,
    first_contact_date: row.first_contact_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

// 학생 목록 조회 (클라이언트용)
export async function getStudents(
  page = 1,
  pageSize = 10,
  filters: StudentFilters = { search: "", department: "all", status: "all" },
  sortBy: string = "name",
  sortOrder: "asc" | "desc" = "asc"
): Promise<{ data: Student[]; count: number }> {
  try {
    const supabase = getSupabaseBrowserClient()
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

    // 정렬 적용 - URL 파라미터 기반으로 정렬
    if (sortBy === "start_date") {
      query = query.order("start_date", { ascending: sortOrder === "asc", nullsFirst: false })
    } else if (sortBy === "name") {
      query = query.order("name", { ascending: sortOrder === "asc" })
    } else {
      // 기본 정렬 (상태별)
      if (filters.status === "퇴원") {
        query = query.order("end_date", { ascending: false, nullsFirst: false })
      } else if (filters.status === "미등록") {
        query = query.order("first_contact_date", { ascending: false, nullsFirst: false })
      } else {
        query = query.order("name", { ascending: true })
      }
    }

    // 페이지네이션 적용
    const { data, error, count } = await query.range(from, to)

    if (error) throw error

    return {
      data: data ? (data as StudentRow[]).map(mapStudentRowToStudent) : [],
      count: count || 0,
    }
  } catch (error) {
    console.error("Error fetching students:", error)
    return { data: [], count: 0 }
  }
}

// 학생 삭제 (클라이언트용)
export async function deleteStudent(id: string): Promise<{ error: Error | null }> {
  try {
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.from("students").delete().eq("id", id as string)

    if (error) throw error

    return { error: null }
  } catch (error) {
    console.error(`Error deleting student with id ${id}:`, error)
    return { error: error as Error }
  }
}

// 학생 메모 업데이트 (클라이언트용)
export async function updateStudentNotes(
  id: string,
  notes: string,
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const supabase = getSupabaseBrowserClient()
    
    const { error } = await supabase
      .from("students")
      .update({ notes })
      .eq("id", id)

    if (error) throw error

    return { success: true, error: null }
  } catch (error) {
    console.error(`Error updating notes for student with id ${id}:`, error)
    return { success: false, error: error as Error }
  }
}