"use server"

import { createServerClient } from "@/lib/auth/server"
import type { Employee, EmployeeFilters } from "@/types/employee"
import type { Database } from "@/types/database"

type EmployeeRow = Database["public"]["Tables"]["employees"]["Row"]
type EmployeeInsert = Database["public"]["Tables"]["employees"]["Insert"]
type EmployeeUpdate = Database["public"]["Tables"]["employees"]["Update"]

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
    subjects: row.subjects ?? [],
    philosophy: row.philosophy ?? "",
    experience: row.experience ?? "",
    is_public: row.is_public ?? false,
  } as Employee
}

// 직원 목록 조회
export async function getEmployees(
  page = 1,
  pageSize = 10,
  filters: EmployeeFilters = { search: "", department: "all", position: "all", status: "all" },
): Promise<{ data: Employee[]; count: number }> {
  try {
    const supabase = await createServerClient()
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

    if (error) throw error

    return {
      data: (data ? (data as EmployeeRow[]).map(mapEmployeeRowToEmployee) : []),
      count: count || 0,
    }
  } catch (error) {
    console.error("Error fetching employees:", error)
    return { data: [], count: 0 }
  }
}

// 직원 상세 조회
export async function getEmployeeById(id: string): Promise<Employee | null> {
  try {
    const supabase = await createServerClient()
    const { data, error } = await supabase.from("employees").select("*").eq("id", id as string).single()

    if (error) throw error
    if (!data) return null

    return mapEmployeeRowToEmployee(data as EmployeeRow)
  } catch (error) {
    console.error(`Error fetching employee with id ${id}:`, error)
    return null
  }
}

// 직원 등록 (서버 액션)
export async function createEmployee(
  employee: Omit<Employee, "id" | "created_at" | "updated_at">,
): Promise<{ data: Employee | null; error: Error | null }> {
  try {
    const supabase = await createServerClient()

    // undefined 필드 제거 (스프레드 + 조건부)
    const employeeData: EmployeeInsert = {
      name: employee.name,
      phone: employee.phone ?? null,
      position: employee.position ?? null,
      status: employee.status,
      department: employee.department ?? null,
      hire_date: employee.hire_date ?? null,
      resign_date: employee.resign_date ?? null,
      last_updated_date: employee.last_updated_date ?? null,
      notes: employee.notes ?? null,
      auth_id: employee.auth_id ?? null,
    }

    const { data, error } = await supabase.from("employees").insert([employeeData as EmployeeInsert]).select().single()

    if (error) throw error

    return { data: data ? mapEmployeeRowToEmployee(data as EmployeeRow) : null, error: null }
  } catch (error) {
    console.error("Error creating employee:", error)
    return { data: null, error: error as Error }
  }
}

// 직원 정보 수정
export async function updateEmployee(
  id: string,
  employee: Partial<Employee>,
): Promise<{ data: Employee | null; error: Error | null }> {
  try {
    const supabase = await createServerClient()

    // undefined 필드 제거 (스프레드 + 조건부)
    const employeeData: EmployeeUpdate = {
      ...(employee.name ? { name: employee.name } : {}),
      ...(employee.phone ? { phone: employee.phone } : {}),
      ...(employee.position ? { position: employee.position as NonNullable<EmployeeRow["position"]> } : {}),
      ...(employee.status ? { status: employee.status as NonNullable<EmployeeRow["status"]> } : {}),
      ...(employee.department ? { department: employee.department as NonNullable<EmployeeRow["department"]> } : {}),
      ...(employee.hire_date ? { hire_date: employee.hire_date } : {}),
      ...(employee.resign_date ? { resign_date: employee.resign_date } : {}),
      ...(employee.last_updated_date ? { last_updated_date: employee.last_updated_date } : {}),
      ...(employee.notes ? { notes: employee.notes } : {}),
      ...(employee.notes ? { notes: employee.notes } : {}),
      ...(employee.auth_id ? { auth_id: employee.auth_id } : {}),
      ...(employee.subjects ? { subjects: employee.subjects } : {}),
      ...(employee.philosophy ? { philosophy: employee.philosophy } : {}),
      ...(employee.experience ? { experience: employee.experience } : {}),
      ...(employee.is_public !== undefined ? { is_public: employee.is_public } : {}),
    }

    const { data, error } = await supabase.from("employees").update(employeeData as EmployeeUpdate).eq("id", id as string).select().single()

    if (error) throw error

    return { data: data ? mapEmployeeRowToEmployee(data as EmployeeRow) : null, error: null }
  } catch (error) {
    console.error(`Error updating employee with id ${id}:`, error)
    return { data: null, error: error as Error }
  }
}

// 직원 삭제
export async function deleteEmployee(id: string): Promise<{ error: Error | null }> {
  try {
    const supabase = await createServerClient()
    const { error } = await supabase.from("employees").delete().eq("id", id as string)

    if (error) throw error

    return { error: null }
  } catch (error) {
    console.error(`Error deleting employee with id ${id}:`, error)
    return { error: error as Error }
  }
}

// 직원 메모 업데이트
export async function updateEmployeeNotes(
  id: string,
  notes: string,
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const supabase = await createServerClient()
    const { error } = await supabase.from("employees").update({ notes: notes ?? null } as EmployeeUpdate).eq("id", id as string)

    if (error) throw error

    return { success: true, error: null }
  } catch (error) {
    console.error(`Error updating notes for employee with id ${id}:`, error)
    return { success: false, error: error as Error }
  }
}


// 서버 컴포넌트용 직원 목록 가져오기
export async function getEmployeesServer() {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from("employees").select("*")

  if (error) {
    console.error("Error fetching employees:", error)
    return []
  }

  return data ? (data as EmployeeRow[]).map(mapEmployeeRowToEmployee) : []
}
