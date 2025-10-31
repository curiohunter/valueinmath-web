import { createClient } from "@/lib/supabase/client"
import { createServerClient } from "@/lib/auth/server"
import {
  Notification,
  NotificationCount,
  NotificationType,
} from "@/types/consultation-requests"

/**
 * 직원용: 본인의 알림 목록 조회
 * RLS: 본인 알림만 조회 가능
 */
export async function getMyNotifications(
  employeeId: string,
  limit = 10
): Promise<Notification[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error

  return data || []
}

/**
 * 직원용: 읽지 않은 알림 개수
 * RLS: 본인 알림만 조회 가능
 */
export async function getUnreadNotificationCount(
  employeeId: string
): Promise<NotificationCount> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("notifications")
    .select("type")
    .eq("employee_id", employeeId)
    .eq("is_read", false)

  if (error) throw error

  const notifications = data || []
  const byType = {
    consultation_request: 0,
    new_comment: 0,
    comment_reply: 0,
  }

  notifications.forEach((n) => {
    if (n.type in byType) {
      byType[n.type as NotificationType]++
    }
  })

  return {
    total: notifications.length,
    by_type: byType,
  }
}

/**
 * 직원용: 알림 읽음 처리
 * RLS: 본인 알림만 수정 가능
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)

  if (error) throw error
}

/**
 * 직원용: 여러 알림 일괄 읽음 처리
 * RLS: 본인 알림만 수정 가능
 */
export async function markNotificationsAsRead(notificationIds: string[]): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .in("id", notificationIds)

  if (error) throw error
}

/**
 * 직원용: 모든 알림 읽음 처리
 * RLS: 본인 알림만 수정 가능
 */
export async function markAllNotificationsAsRead(employeeId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("employee_id", employeeId)
    .eq("is_read", false)

  if (error) throw error
}

/**
 * 직원용: 알림 삭제
 * RLS: 본인 알림만 삭제 가능
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)

  if (error) throw error
}

/**
 * 시스템용: 전체 직원에게 알림 생성 (서버사이드 전용)
 *
 * 중요: 이 함수는 서버사이드에서만 호출되어야 합니다.
 * notifications 테이블의 INSERT RLS 정책이 false이므로
 * Service Role Key가 필요합니다.
 *
 * API Route 또는 Server Action에서 호출하세요.
 */
export async function createNotificationsForAllEmployees(notification: {
  type: NotificationType
  title: string
  content: string
  related_id: string | null
}): Promise<void> {
  // Service Role을 사용하기 위해 서버 클라이언트 생성
  // 주의: 클라이언트 컴포넌트에서는 호출 불가
  const supabase = await createServerClient()

  // 재직 중인 모든 직원 조회
  const { data: employees, error: employeesError } = await supabase
    .from("employees")
    .select("id")
    .eq("status", "재직")

  if (employeesError) throw employeesError
  if (!employees || employees.length === 0) return

  // 각 직원에게 알림 생성
  const notifications = employees.map((employee) => ({
    employee_id: employee.id,
    type: notification.type,
    title: notification.title,
    content: notification.content,
    related_id: notification.related_id,
    is_read: false,
  }))

  const { error: insertError } = await supabase
    .from("notifications")
    .insert(notifications)

  if (insertError) throw insertError
}

/**
 * 시스템용: 특정 직원에게 알림 생성 (서버사이드 전용)
 *
 * 중요: 이 함수는 서버사이드에서만 호출되어야 합니다.
 * Service Role Key가 필요합니다.
 */
export async function createNotificationForEmployee(
  employeeId: string,
  notification: {
    type: NotificationType
    title: string
    content: string
    related_id: string | null
  }
): Promise<void> {
  const supabase = await createServerClient()

  const { error } = await supabase
    .from("notifications")
    .insert({
      employee_id: employeeId,
      type: notification.type,
      title: notification.title,
      content: notification.content,
      related_id: notification.related_id,
      is_read: false,
    })

  if (error) throw error
}

/**
 * Realtime 구독용: 새 알림 감지
 *
 * 사용 예시:
 * ```typescript
 * const channel = supabase
 *   .channel('notifications')
 *   .on('postgres_changes', {
 *     event: 'INSERT',
 *     schema: 'public',
 *     table: 'notifications',
 *     filter: `employee_id=eq.${employeeId}`
 *   }, (payload) => {
 *     console.log('새 알림:', payload.new)
 *   })
 *   .subscribe()
 * ```
 */
export function subscribeToNotifications(
  employeeId: string,
  onNewNotification: (notification: Notification) => void
) {
  const supabase = createClient()

  const channel = supabase
    .channel(`notifications:${employeeId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `employee_id=eq.${employeeId}`,
      },
      (payload) => {
        onNewNotification(payload.new as Notification)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
