export interface Employee {
  id: string
  name: string
  phone: string
  position: "원장" | "부원장" | "강사" | "데스크직원" | "데스크보조"
  status: "재직" | "퇴직" | "휴직"
  department: "고등관" | "중등관" | "영재관" | "데스크"
  hire_date: string | null
  resign_date: string | null
  last_updated_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  auth_id?: string | null
}

export interface EmployeeFilters {
  search: string
  department: string
  position: string
  status: string
}
