"use client"

import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { Employee, EmployeeFilters } from "@/types/employee"
import type { Database } from "@/types/database"

type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"]

// 직원 데이터 변환 함수 (DB 타입 -> 앱 타입)
function mapEmployeeRowToEmployee(row: EmployeeRow): Employee {
  return {
    ...row,
    name: row.name ?? "",
    position: row.position ?? "",
    department: row.department ?? "",
    phone: row.phone ?? "",
    status: row.status as Employee["status"],
    hire_date: row.hire_date ?? null,
    resign_date: row.resign_date ?? null,
    last_updated_date: row.last_updated_date ?? null,
    notes: row.notes ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
    auth_id: row.auth_id ?? null,
  } as Employee
}

// 직원 목록 가져오기 (클라이언트 컴포넌트용)
export async function getEmployeesClient(
  page = 1,
  pageSize = 10,
  filters: EmployeeFilters = { search: "", department: "all", position: "all", status: "all" },
) {
  try {
    const supabase = getSupabaseBrowserClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase.from("employees").select("*", { count: "exact" })

    // 검색어 필터 적용
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
    }

    // 부서 필터 적용
    const department = filters.department && filters.department !== "all" ? filters.department : null
    if (department) query = query.eq("department", department)

    // 직책 필터 적용
    const position = filters.position && filters.position !== "all" ? filters.position : null
    if (position) query = query.eq("position", position)

    // 상태 필터 적용
    const status = filters.status && filters.status !== "all" ? filters.status : null
    if (status) query = query.eq("status", status)

    // 정렬 적용
    if (filters.status === "퇴직") {
      query = query.order("resign_date", { ascending: false, nullsFirst: false })
    } else if (filters.status === "재직" || filters.status === "all") {
      query = query.order("name", { ascending: true })
    } else {
      query = query.order("updated_at", { ascending: false })
    }

    // 페이지네이션 적용
    const { data, error, count } = await query.range(from, to)

    if (error) {
      console.error("Error fetching employees:", error)
      throw error
    }

    return {
      employees: (data ? (data as EmployeeRow[]).map(mapEmployeeRowToEmployee) : []),
      totalCount: count || 0,
    }
  } catch (error) {
    console.error("Error fetching employees:", error)
    return { employees: [], totalCount: 0 }
  }
}

// 직원 삭제 (클라이언트 컴포넌트용)
export async function deleteEmployeeClient(id: string): Promise<{ error: Error | null }> {
  try {
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.from("employees").delete().eq("id", id as string)

    if (error) throw error

    return { error: null }
  } catch (error) {
    console.error(`Error deleting employee with id ${id}:`, error)
    return { error: error as Error }
  }
}