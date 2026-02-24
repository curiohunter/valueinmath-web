/**
 * Textbook Service - 교재 관리, 재고, 배정, 수강료 연동
 */

import { SupabaseClient } from "@supabase/supabase-js"
import type {
  Textbook,
  CreateTextbookData,
  UpdateTextbookData,
  InventoryLog,
  CreateInventoryLogData,
  TextbookAssignment,
  AdditionalDetail,
} from "@/types/textbook"

type ServiceResult<T = undefined> = {
  success: boolean
  data?: T
  error?: string
}

// ============ 교재 카탈로그 CRUD ============

export async function createTextbook(
  supabase: SupabaseClient,
  data: CreateTextbookData
): Promise<ServiceResult<Textbook>> {
  const { data: textbook, error } = await supabase
    .from("textbooks")
    .insert({
      name: data.name,
      publisher: data.publisher || null,
      price: data.price,
      category: data.category || null,
      initial_stock: data.initial_stock || 0,
      current_stock: 0,
      description: data.description || null,
      created_by: data.created_by || null,
    })
    .select()
    .single()

  if (error) {
    console.error("[TextbookService] createTextbook error:", error)
    return { success: false, error: error.message }
  }

  // 초기 재고가 있으면 입고 이력 생성
  if (data.initial_stock && data.initial_stock > 0) {
    await supabase.from("textbook_inventory_logs").insert({
      textbook_id: textbook.id,
      log_type: "in",
      quantity: data.initial_stock,
      reason: "purchase",
      note: "초기 재고 등록",
      created_by: data.created_by || null,
    })
  }

  return { success: true, data: textbook }
}

export async function updateTextbook(
  supabase: SupabaseClient,
  id: string,
  data: UpdateTextbookData
): Promise<ServiceResult<Textbook>> {
  const { data: textbook, error } = await supabase
    .from("textbooks")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("[TextbookService] updateTextbook error:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data: textbook }
}

export async function deactivateTextbook(
  supabase: SupabaseClient,
  id: string
): Promise<ServiceResult> {
  const { error } = await supabase
    .from("textbooks")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    console.error("[TextbookService] deactivateTextbook error:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function getTextbooks(
  supabase: SupabaseClient,
  options?: { activeOnly?: boolean; category?: string }
): Promise<ServiceResult<Textbook[]>> {
  let query = supabase
    .from("textbooks")
    .select("*")
    .order("created_at", { ascending: false })

  if (options?.activeOnly !== false) {
    query = query.eq("is_active", true)
  }

  if (options?.category) {
    query = query.eq("category", options.category)
  }

  const { data, error } = await query

  if (error) {
    console.error("[TextbookService] getTextbooks error:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data: data || [] }
}

export async function getTextbook(
  supabase: SupabaseClient,
  id: string
): Promise<ServiceResult<Textbook>> {
  const { data, error } = await supabase
    .from("textbooks")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    console.error("[TextbookService] getTextbook error:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

// ============ 재고 관리 ============

export async function addInventoryLog(
  supabase: SupabaseClient,
  data: CreateInventoryLogData
): Promise<ServiceResult<InventoryLog>> {
  // 출고 시 재고 확인
  if (data.log_type === "out") {
    const { data: textbook } = await supabase
      .from("textbooks")
      .select("current_stock")
      .eq("id", data.textbook_id)
      .single()

    if (textbook && textbook.current_stock < data.quantity) {
      return { success: false, error: `재고가 부족합니다. (현재 재고: ${textbook.current_stock})` }
    }
  }

  const { data: log, error } = await supabase
    .from("textbook_inventory_logs")
    .insert({
      textbook_id: data.textbook_id,
      log_type: data.log_type,
      quantity: data.quantity,
      reason: data.reason,
      note: data.note || null,
      reference_id: data.reference_id || null,
      created_by: data.created_by || null,
    })
    .select()
    .single()

  if (error) {
    console.error("[TextbookService] addInventoryLog error:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data: log }
}

export async function getInventoryLogs(
  supabase: SupabaseClient,
  textbookId: string,
  options?: { limit?: number }
): Promise<ServiceResult<InventoryLog[]>> {
  const query = supabase
    .from("textbook_inventory_logs")
    .select("*")
    .eq("textbook_id", textbookId)
    .order("created_at", { ascending: false })
    .limit(options?.limit || 50)

  const { data, error } = await query

  if (error) {
    console.error("[TextbookService] getInventoryLogs error:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data: data || [] }
}

// ============ 교재 배정 ============

export async function assignTextbook(
  supabase: SupabaseClient,
  textbookId: string,
  studentId: string,
  quantity: number,
  createdBy?: string
): Promise<ServiceResult<TextbookAssignment>> {
  // 1. 교재 정보 조회
  const { data: textbook, error: tbError } = await supabase
    .from("textbooks")
    .select("name, price, current_stock")
    .eq("id", textbookId)
    .single()

  if (tbError || !textbook) {
    return { success: false, error: "교재를 찾을 수 없습니다" }
  }

  // 2. 재고 확인
  if (textbook.current_stock < quantity) {
    return { success: false, error: `재고가 부족합니다. (현재 재고: ${textbook.current_stock})` }
  }

  // 3. 학생 이름 조회
  const { data: student } = await supabase
    .from("students")
    .select("name")
    .eq("id", studentId)
    .single()

  // 4. 배정 생성
  const { data: assignment, error: assignError } = await supabase
    .from("textbook_assignments")
    .insert({
      textbook_id: textbookId,
      student_id: studentId,
      quantity,
      unit_price: textbook.price,
      total_price: textbook.price * quantity,
      status: "pending",
      student_name_snapshot: student?.name || null,
      textbook_name_snapshot: textbook.name,
      created_by: createdBy || null,
    })
    .select()
    .single()

  if (assignError) {
    console.error("[TextbookService] assignTextbook error:", assignError)
    return { success: false, error: assignError.message }
  }

  // 5. 자동 출고 이력 생성 (트리거가 재고 차감)
  await supabase.from("textbook_inventory_logs").insert({
    textbook_id: textbookId,
    log_type: "out",
    quantity,
    reason: "distribution",
    note: `${student?.name || "학생"} 배정`,
    reference_id: assignment.id,
    created_by: createdBy || null,
  })

  return { success: true, data: assignment }
}

export async function cancelAssignment(
  supabase: SupabaseClient,
  assignmentId: string,
  createdBy?: string
): Promise<ServiceResult> {
  // 1. 배정 정보 조회
  const { data: assignment, error: aError } = await supabase
    .from("textbook_assignments")
    .select("*")
    .eq("id", assignmentId)
    .single()

  if (aError || !assignment) {
    return { success: false, error: "배정을 찾을 수 없습니다" }
  }

  if (assignment.status === "cancelled") {
    return { success: false, error: "이미 취소된 배정입니다" }
  }

  // 2. 수강료 적용 상태면 먼저 해제 필요
  if (assignment.status === "applied" && assignment.applied_tuition_id) {
    return { success: false, error: "수강료에 적용된 교재비를 먼저 해제해주세요" }
  }

  // 3. 배정 취소
  const { error: updateError } = await supabase
    .from("textbook_assignments")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", assignmentId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // 4. 자동 입고 이력 생성 (트리거가 재고 복원)
  await supabase.from("textbook_inventory_logs").insert({
    textbook_id: assignment.textbook_id,
    log_type: "in",
    quantity: assignment.quantity,
    reason: "return",
    note: `${assignment.student_name_snapshot || "학생"} 배정 취소`,
    reference_id: assignmentId,
    created_by: createdBy || null,
  })

  return { success: true }
}

export async function getStudentAssignments(
  supabase: SupabaseClient,
  studentId: string,
  status?: string
): Promise<ServiceResult<TextbookAssignment[]>> {
  let query = supabase
    .from("textbook_assignments")
    .select(`
      *,
      textbook:textbooks(id, name, price, category)
    `)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) {
    console.error("[TextbookService] getStudentAssignments error:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data: data || [] }
}

export async function getTextbookAssignments(
  supabase: SupabaseClient,
  textbookId: string
): Promise<ServiceResult<TextbookAssignment[]>> {
  const { data, error } = await supabase
    .from("textbook_assignments")
    .select(`
      *,
      student:students(id, name)
    `)
    .eq("textbook_id", textbookId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[TextbookService] getTextbookAssignments error:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data: data || [] }
}

export async function getPendingAssignments(
  supabase: SupabaseClient,
  options?: { studentId?: string }
): Promise<ServiceResult<TextbookAssignment[]>> {
  let query = supabase
    .from("textbook_assignments")
    .select(`
      *,
      student:students(id, name),
      textbook:textbooks(id, name, price, category)
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (options?.studentId) {
    query = query.eq("student_id", options.studentId)
  }

  const { data, error } = await query

  if (error) {
    console.error("[TextbookService] getPendingAssignments error:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data: data || [] }
}

// ============ 수강료 연동 ============

export async function applyTextbookToTuition(
  supabase: SupabaseClient,
  assignmentId: string,
  tuitionFeeId: string
): Promise<ServiceResult> {
  // 1. 배정 정보 조회
  const { data: assignment, error: aError } = await supabase
    .from("textbook_assignments")
    .select("*")
    .eq("id", assignmentId)
    .single()

  if (aError || !assignment) {
    return { success: false, error: "배정을 찾을 수 없습니다" }
  }

  if (assignment.status === "applied") {
    return { success: false, error: "이미 적용된 교재비입니다" }
  }

  if (assignment.status === "cancelled") {
    return { success: false, error: "취소된 배정은 적용할 수 없습니다" }
  }

  // 2. 수강료 정보 조회
  const { data: tuitionFee, error: tError } = await supabase
    .from("tuition_fees")
    .select("additional_details, amount, base_amount, total_discount, total_additional, note")
    .eq("id", tuitionFeeId)
    .single()

  if (tError || !tuitionFee) {
    return { success: false, error: "수강료를 찾을 수 없습니다" }
  }

  // 3. additional_details에 항목 추가
  const textbookName = assignment.textbook_name_snapshot || "교재"
  const currentDetails: AdditionalDetail[] = tuitionFee.additional_details || []
  const newDetail: AdditionalDetail = {
    type: "textbook",
    amount: assignment.total_price,
    assignment_id: assignmentId,
    textbook_name: textbookName,
    quantity: assignment.quantity,
    description: `${textbookName} x ${assignment.quantity}`,
  }

  // 4. 금액 계산
  const baseAmount = tuitionFee.base_amount || tuitionFee.amount
  const newTotalAdditional = (tuitionFee.total_additional || 0) + assignment.total_price
  const totalDiscount = tuitionFee.total_discount || 0
  const newAmount = baseAmount - totalDiscount + newTotalAdditional

  // 5. note 업데이트
  const notePrefix = tuitionFee.note ? `${tuitionFee.note} / ` : ""
  const newNote = `${notePrefix}교재 ${textbookName} ${assignment.total_price.toLocaleString()}원 추가`

  // 6. DB 업데이트
  const { error: updateError } = await supabase
    .from("tuition_fees")
    .update({
      additional_details: [...currentDetails, newDetail],
      base_amount: baseAmount,
      total_additional: newTotalAdditional,
      amount: newAmount,
      final_amount: newAmount,
      note: newNote,
    })
    .eq("id", tuitionFeeId)

  if (updateError) {
    console.error("[TextbookService] applyTextbookToTuition update error:", updateError)
    return { success: false, error: updateError.message }
  }

  // 7. 배정 상태 업데이트
  const { error: statusError } = await supabase
    .from("textbook_assignments")
    .update({
      status: "applied",
      applied_tuition_id: tuitionFeeId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assignmentId)

  if (statusError) {
    console.error("[TextbookService] applyTextbookToTuition status error:", statusError)
    return { success: false, error: statusError.message }
  }

  return { success: true }
}

// ============ 일괄 배정 ============

export interface BulkAssignResult {
  successCount: number
  failCount: number
  totalStockUsed: number
  errors: string[]
}

export async function bulkAssignTextbook(
  supabase: SupabaseClient,
  params: {
    textbookId: string
    studentIds: string[]
    quantity: number
    createdBy?: string
  }
): Promise<ServiceResult<BulkAssignResult>> {
  const { textbookId, studentIds, quantity, createdBy } = params

  if (studentIds.length === 0) {
    return { success: false, error: "배부할 학생을 선택해주세요" }
  }

  // 1. 교재 정보 조회
  const { data: textbook, error: tbError } = await supabase
    .from("textbooks")
    .select("name, price, current_stock")
    .eq("id", textbookId)
    .single()

  if (tbError || !textbook) {
    return { success: false, error: "교재를 찾을 수 없습니다" }
  }

  // 2. 재고 총량 검증
  const totalNeeded = studentIds.length * quantity
  if (textbook.current_stock < totalNeeded) {
    return {
      success: false,
      error: `재고가 부족합니다. (필요: ${totalNeeded}, 현재 재고: ${textbook.current_stock})`,
    }
  }

  // 3. 이미 배부된 학생 필터링
  const { data: existingAssignments } = await supabase
    .from("textbook_assignments")
    .select("student_id")
    .eq("textbook_id", textbookId)
    .neq("status", "cancelled")
    .in("student_id", studentIds)

  const alreadyAssignedIds = new Set(
    (existingAssignments || []).map((a) => a.student_id)
  )
  const filteredStudentIds = studentIds.filter(
    (id) => !alreadyAssignedIds.has(id)
  )

  if (filteredStudentIds.length === 0) {
    return { success: false, error: "선택한 학생들은 모두 이미 배부되었습니다" }
  }

  // 4. 학생 이름 조회
  const { data: studentsData } = await supabase
    .from("students")
    .select("id, name")
    .in("id", filteredStudentIds)

  const studentMap = new Map(
    (studentsData || []).map((s) => [s.id, s.name])
  )

  // 5. 순차 처리 (DB 트리거 경합 방지)
  const result: BulkAssignResult = {
    successCount: 0,
    failCount: 0,
    totalStockUsed: 0,
    errors: [],
  }

  for (const studentId of filteredStudentIds) {
    const studentName = studentMap.get(studentId) || "학생"

    // 배정 생성
    const { data: assignment, error: assignError } = await supabase
      .from("textbook_assignments")
      .insert({
        textbook_id: textbookId,
        student_id: studentId,
        quantity,
        unit_price: textbook.price,
        total_price: textbook.price * quantity,
        status: "pending",
        student_name_snapshot: studentName,
        textbook_name_snapshot: textbook.name,
        created_by: createdBy || null,
      })
      .select()
      .single()

    if (assignError) {
      result.failCount++
      result.errors.push(`${studentName}: ${assignError.message}`)
      continue
    }

    // 출고 이력 생성 (트리거가 재고 차감)
    const { error: logError } = await supabase
      .from("textbook_inventory_logs")
      .insert({
        textbook_id: textbookId,
        log_type: "out",
        quantity,
        reason: "distribution",
        note: `${studentName} 배정`,
        reference_id: assignment.id,
        created_by: createdBy || null,
      })

    if (logError) {
      result.failCount++
      result.errors.push(`${studentName}: 출고 이력 생성 실패`)
      continue
    }

    result.successCount++
    result.totalStockUsed += quantity
  }

  return { success: true, data: result }
}

export async function removeTextbookFromTuition(
  supabase: SupabaseClient,
  tuitionFeeId: string,
  assignmentId: string
): Promise<ServiceResult> {
  // 1. 수강료 조회
  const { data: tuitionFee, error: tError } = await supabase
    .from("tuition_fees")
    .select("additional_details, note, amount, base_amount, total_discount, total_additional")
    .eq("id", tuitionFeeId)
    .single()

  if (tError || !tuitionFee) {
    return { success: false, error: "수강료를 찾을 수 없습니다" }
  }

  // 2. additional_details에서 해당 항목 찾기 및 제거
  const currentDetails: AdditionalDetail[] = tuitionFee.additional_details || []
  const removedDetail = currentDetails.find((d) => d.assignment_id === assignmentId)

  if (!removedDetail) {
    return { success: false, error: "해당 교재비를 찾을 수 없습니다" }
  }

  const updatedDetails = currentDetails.filter((d) => d.assignment_id !== assignmentId)

  // 3. 금액 복원
  const chargeAmount = removedDetail.amount || 0
  const newTotalAdditional = Math.max(0, (tuitionFee.total_additional || 0) - chargeAmount)
  const baseAmount = tuitionFee.base_amount || tuitionFee.amount
  const totalDiscount = tuitionFee.total_discount || 0
  const newAmount = baseAmount - totalDiscount + newTotalAdditional

  // 4. note에서 교재비 정보 제거
  let newNote = tuitionFee.note || ""
  if (newNote) {
    const textbookName = removedDetail.textbook_name || ""
    const amountFormatted = chargeAmount.toLocaleString()
    const parts = newNote.split(/\s*\/\s*/)
    const filteredParts = parts.filter((part) => {
      const trimmed = part.trim()
      if (!trimmed) return false
      if (trimmed.includes("추가") && textbookName && trimmed.includes(textbookName)) return false
      if (trimmed.includes("추가") && amountFormatted && trimmed.includes(amountFormatted + "원")) return false
      return true
    })
    newNote = filteredParts.join(" / ").trim()
    newNote = newNote.replace(/^[\s\/]+|[\s\/]+$/g, "").trim()
  }

  // 5. DB 업데이트
  const { error: updateError } = await supabase
    .from("tuition_fees")
    .update({
      additional_details: updatedDetails,
      total_additional: newTotalAdditional,
      amount: newAmount,
      final_amount: newAmount,
      note: newNote || null,
    })
    .eq("id", tuitionFeeId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // 6. 배정 상태 되돌리기
  const { error: statusError } = await supabase
    .from("textbook_assignments")
    .update({
      status: "pending",
      applied_tuition_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assignmentId)

  if (statusError) {
    console.warn("배정 상태 업데이트 실패:", statusError.message)
  }

  return { success: true }
}
