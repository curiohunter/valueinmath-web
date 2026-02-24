// ============ 교재 관련 타입 정의 ============

// 교재 카탈로그
export interface Textbook {
  id: string
  name: string
  publisher: string | null
  price: number
  category: string | null
  initial_stock: number
  current_stock: number
  is_active: boolean
  description: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CreateTextbookData {
  name: string
  publisher?: string
  price: number
  category?: string
  initial_stock?: number
  description?: string
  created_by?: string
}

export interface UpdateTextbookData {
  name?: string
  publisher?: string | null
  price?: number
  category?: string | null
  description?: string | null
  is_active?: boolean
  current_stock?: number
}

// 입출고 이력
export type InventoryLogType = "in" | "out"
export type InventoryReason = "purchase" | "return" | "distribution" | "damage" | "adjustment"

export const INVENTORY_REASON_LABELS: Record<InventoryReason, string> = {
  purchase: "구매 입고",
  return: "반품/회수",
  distribution: "학생 배부",
  damage: "파손/분실",
  adjustment: "재고 조정",
}

export interface InventoryLog {
  id: string
  textbook_id: string
  log_type: InventoryLogType
  quantity: number
  reason: string
  note: string | null
  reference_id: string | null
  created_by: string | null
  created_at: string
}

export interface CreateInventoryLogData {
  textbook_id: string
  log_type: InventoryLogType
  quantity: number
  reason: string
  note?: string
  reference_id?: string
  created_by?: string
}

// 교재 배정
export type AssignmentStatus = "pending" | "applied" | "cancelled"

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  pending: "대기",
  applied: "수강료 적용",
  cancelled: "취소",
}

export interface TextbookAssignment {
  id: string
  textbook_id: string
  student_id: string
  quantity: number
  unit_price: number
  total_price: number
  status: AssignmentStatus
  applied_tuition_id: string | null
  student_name_snapshot: string | null
  textbook_name_snapshot: string | null
  assigned_at: string
  created_by: string | null
  created_at: string
  updated_at: string
  // 조인 데이터
  student?: { id: string; name: string }
  textbook?: Textbook
}

// 수강료 추가비용 관련
export interface AdditionalDetail {
  type: "textbook"
  amount: number
  assignment_id: string
  textbook_name: string
  quantity: number
  description: string
}

// 수강료에 표시할 추가비용
export interface AppliedCharge {
  id: string
  type: "textbook"
  title: string
  amount: number
  quantity: number
}

// 교재 카테고리 옵션
export const TEXTBOOK_CATEGORIES = ["수학", "과학", "공통", "기타"] as const
export type TextbookCategory = (typeof TEXTBOOK_CATEGORIES)[number]
