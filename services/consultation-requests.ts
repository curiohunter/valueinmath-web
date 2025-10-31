import { createClient } from "@/lib/supabase/client"
import { createServerClient } from "@/lib/auth/server"
import {
  ConsultationRequest,
  ConsultationRequestFormData,
  ConsultationRequestFilter,
  ConsultationRequestStatus,
} from "@/types/consultation-requests"
import { createNotificationsForAllEmployees } from "./notifications"

/**
 * 학부모용: 상담 요청 생성
 * RLS: 해당 학생/학부모만 생성 가능
 */
export async function createConsultationRequest(
  data: ConsultationRequestFormData,
  requesterId: string
): Promise<ConsultationRequest> {
  const supabase = createClient()

  // 1. 상담 요청 생성
  const { data: request, error } = await supabase
    .from("consultation_requests")
    .insert({
      student_id: data.student_id,
      requester_id: requesterId,
      method: data.method,
      type: data.type,
      content: data.content,
      status: '대기중',
    })
    .select(`
      *,
      student:students!consultation_requests_student_id_fkey (
        name
      )
    `)
    .single()

  if (error) throw error
  if (!request) throw new Error("상담 요청 생성에 실패했습니다.")

  // 2. 전체 직원에게 알림 생성 (service role 필요)
  try {
    await createNotificationsForAllEmployees({
      type: 'consultation_request',
      title: '새로운 상담 요청',
      content: `${(request.student as any)?.name || '학생'}님의 학부모가 ${data.type} 상담을 요청했습니다.`,
      related_id: request.id,
    })
  } catch (notifError) {
    console.error('알림 생성 실패:', notifError)
    // 알림 실패는 치명적이지 않으므로 계속 진행
  }

  return {
    id: request.id,
    student_id: request.student_id,
    requester_id: request.requester_id,
    method: request.method,
    type: request.type,
    content: request.content,
    counselor_id: request.counselor_id,
    status: request.status,
    created_at: request.created_at,
    updated_at: request.updated_at,
    student_name: (request.student as any)?.name || "알 수 없음",
  }
}

/**
 * 직원용: 상담 요청 목록 조회 (필터링)
 * RLS: 재직 직원만 조회 가능
 */
export async function getConsultationRequests(
  filter?: ConsultationRequestFilter
): Promise<ConsultationRequest[]> {
  const supabase = createClient()

  let query = supabase
    .from("consultation_requests")
    .select(`
      *,
      student:students!consultation_requests_student_id_fkey (
        name
      ),
      requester:profiles!consultation_requests_requester_id_fkey (
        name,
        role
      ),
      counselor:employees!consultation_requests_counselor_id_fkey (
        name
      )
    `)

  // 필터 적용
  if (filter?.status) {
    query = query.eq("status", filter.status)
  }
  if (filter?.type) {
    query = query.eq("type", filter.type)
  }
  if (filter?.method) {
    query = query.eq("method", filter.method)
  }
  if (filter?.date_from) {
    query = query.gte("created_at", filter.date_from)
  }
  if (filter?.date_to) {
    query = query.lte("created_at", filter.date_to)
  }

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) throw error

  return (data || []).map((request) => ({
    id: request.id,
    student_id: request.student_id,
    requester_id: request.requester_id,
    method: request.method,
    type: request.type,
    content: request.content,
    counselor_id: request.counselor_id,
    status: request.status,
    created_at: request.created_at,
    updated_at: request.updated_at,
    student_name: (request.student as any)?.name || "알 수 없음",
    requester_name: (request.requester as any)?.name || "알 수 없음",
    requester_role: (request.requester as any)?.role || "parent",
    counselor_name: (request.counselor as any)?.name || null,
  }))
}

/**
 * 학부모용: 본인의 상담 요청 목록 조회
 * RLS: 해당 학생/학부모만 조회 가능
 */
export async function getMyConsultationRequests(studentId: string): Promise<ConsultationRequest[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("consultation_requests")
    .select(`
      *,
      student:students!consultation_requests_student_id_fkey (
        name
      ),
      counselor:employees!consultation_requests_counselor_id_fkey (
        name
      )
    `)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })

  if (error) throw error

  return (data || []).map((request) => ({
    id: request.id,
    student_id: request.student_id,
    requester_id: request.requester_id,
    method: request.method,
    type: request.type,
    content: request.content,
    counselor_id: request.counselor_id,
    status: request.status,
    created_at: request.created_at,
    updated_at: request.updated_at,
    student_name: (request.student as any)?.name || "알 수 없음",
    counselor_name: (request.counselor as any)?.name || null,
  }))
}

/**
 * 직원용: 상담 요청 상태 변경
 * RLS: 재직 직원만 수정 가능
 */
export async function updateConsultationRequestStatus(
  requestId: string,
  status: ConsultationRequestStatus,
  counselorId?: string
): Promise<void> {
  const supabase = createClient()

  const updateData: any = { status }
  if (counselorId) {
    updateData.counselor_id = counselorId
  }

  const { error } = await supabase
    .from("consultation_requests")
    .update(updateData)
    .eq("id", requestId)

  if (error) throw error
}

/**
 * 직원용: 상담 요청 삭제
 * RLS: 재직 직원만 삭제 가능
 */
export async function deleteConsultationRequest(requestId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from("consultation_requests")
    .delete()
    .eq("id", requestId)

  if (error) throw error
}

/**
 * 직원용: 상담 요청을 기존 consultations 테이블로 전환
 * (처리 완료 시 상담 기록으로 저장)
 */
export async function convertToConsultation(
  requestId: string,
  counselorId: string
): Promise<void> {
  const supabase = createClient()

  // 1. 상담 요청 조회
  const { data: request, error: fetchError } = await supabase
    .from("consultation_requests")
    .select("*")
    .eq("id", requestId)
    .single()

  if (fetchError) throw fetchError
  if (!request) throw new Error("상담 요청을 찾을 수 없습니다.")

  // 2. consultations 테이블에 저장
  const { error: insertError } = await supabase
    .from("consultations")
    .insert({
      student_id: request.student_id,
      type: '정기상담', // 상담 요청은 정기상담으로 분류
      method: request.method === '대면' ? '대면' : '전화',
      date: new Date().toISOString(),
      counselor_id: counselorId,
      content: `[${request.type}] ${request.content}`,
      status: '완료',
    })

  if (insertError) throw insertError

  // 3. 상담 요청 상태를 '완료'로 변경
  await updateConsultationRequestStatus(requestId, '완료', counselorId)
}
