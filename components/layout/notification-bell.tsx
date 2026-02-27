"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, UserCheck, MessageSquare, CheckCheck, PhoneCall } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { testGetPendingUsers } from "@/actions/test-pending-users"
import type { Notification } from "@/types/consultation-requests"

interface PendingUser {
  id: string
  email: string
  name: string
  approval_status: string
  created_at: string
}

interface NotificationBellProps {
  user: any
}

export function NotificationBell({ user }: NotificationBellProps) {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const supabase = createClient()

  // Load employee info, admin status, pending users, and notifications
  useEffect(() => {
    async function loadData() {
      if (!user) return

      try {
        // Get employee info
        const { data: employee, error: employeeError } = await supabase
          .from("employees")
          .select("id, position, name")
          .eq("auth_id", user.id)
          .single()

        if (employeeError || !employee) return

        setEmployeeId(employee.id)
        const adminStatus = employee.position === "원장" || employee.position === "부원장"
        setIsAdmin(adminStatus)

        // Load unread notifications for this employee
        const { data: notifData } = await supabase
          .from("notifications")
          .select("*")
          .eq("employee_id", employee.id)
          .eq("is_read", false)
          .order("created_at", { ascending: false })
          .limit(20)

        if (notifData) {
          setNotifications(notifData as Notification[])
        }

        // Load pending users (admin only)
        if (adminStatus) {
          const { data: pendingUsersData, error } = await supabase
            .from("profiles")
            .select("id, name, email, approval_status, created_at")
            .eq("approval_status", "pending")
            .order("created_at", { ascending: false })

          if (!error) {
            setPendingUsers(pendingUsersData || [])
          }
        }
      } catch (error) {
        console.error("NotificationBell loadData error:", error)
      }
    }

    loadData()
  }, [user, supabase])

  // Realtime: notifications table INSERT
  useEffect(() => {
    if (!employeeId) return

    const channel = supabase
      .channel(`notif_bell_${employeeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `employee_id=eq.${employeeId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification

          setNotifications((prev) => [newNotif, ...prev])

          // Show toast for new notifications
          if (newNotif.type === "new_inquiry") {
            toast.info(`새 상담 신청: ${newNotif.content}`, {
              duration: 10000,
            })
          } else if (newNotif.type === "new_consultation") {
            toast.info(`상담 내역 등록: ${newNotif.content}`, {
              duration: 8000,
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [employeeId, supabase])

  // Realtime: profiles table for pending users (admin only)
  useEffect(() => {
    if (!isAdmin) return

    const channel = supabase
      .channel("notification_bell_profiles")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          if (payload.new.approval_status === "pending") {
            toast.info(`${payload.new.email}님이 회원가입했습니다. 승인이 필요합니다.`, {
              duration: 10000,
            })
            setPendingUsers((prev) => [payload.new as PendingUser, ...prev])
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        (payload) => {
          if (payload.new.approval_status === "pending") {
            setPendingUsers((prev) => {
              const exists = prev.some((u) => u.id === payload.new.id)
              if (exists) {
                return prev.map((u) =>
                  u.id === payload.new.id ? (payload.new as PendingUser) : u
                )
              }
              return [payload.new as PendingUser, ...prev]
            })
          } else if (payload.new.approval_status !== "pending") {
            setPendingUsers((prev) => prev.filter((u) => u.id !== payload.new.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAdmin, supabase])

  // Refresh pending users when dropdown opens (admin only)
  const refreshPendingUsers = useCallback(async () => {
    if (!isAdmin) return

    try {
      const serverResult = await testGetPendingUsers()
      if (serverResult.success && serverResult.pendingUsers) {
        setPendingUsers(serverResult.pendingUsers)
        return
      }

      const { data: pendingUsersData, error } = await supabase
        .from("profiles")
        .select("id, name, email, approval_status, created_at")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false })

      if (!error) {
        setPendingUsers(pendingUsersData || [])
      }
    } catch (error) {
      console.error("refreshPendingUsers error:", error)
    }
  }, [isAdmin, supabase])

  // Refresh on dropdown open
  useEffect(() => {
    if (isOpen && isAdmin) {
      refreshPendingUsers()
    }
  }, [isOpen, isAdmin, refreshPendingUsers])

  // Mark a single notification as read
  const handleMarkAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)

    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
    }
  }

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (!employeeId || notifications.length === 0) return

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("employee_id", employeeId)
      .eq("is_read", false)

    if (!error) {
      setNotifications([])
    }
  }

  // Navigate to relevant page when clicking notification
  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification.id)
    setIsOpen(false)
    if (notification.type === "new_consultation") {
      window.location.href = "/students/consultations"
    } else {
      window.location.href = "/students/consultations"
    }
  }

  const inquiryNotifications = notifications.filter((n) => n.type === "new_inquiry")
  const consultationNotifications = notifications.filter((n) => n.type === "new_consultation")
  const allNotifCount = inquiryNotifications.length + consultationNotifications.length
  const pendingCount = isAdmin ? pendingUsers.length : 0
  const totalBadge = allNotifCount + pendingCount

  // Non-employee: disabled bell
  if (!employeeId) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 rounded-full hover:bg-gray-100 transition-colors"
        disabled
      >
        <Bell className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full hover:bg-gray-100 transition-colors"
        >
          <Bell className="h-4 w-4" />
          {totalBadge > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalBadge > 9 ? "9+" : totalBadge}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4" />
              알림
              {totalBadge > 0 && (
                <Badge variant="destructive">{totalBadge}</Badge>
              )}
              {allNotifCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7 text-xs text-muted-foreground"
                  onClick={handleMarkAllAsRead}
                >
                  <CheckCheck className="w-3 h-3 mr-1" />
                  모두 읽음
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4 max-h-96 overflow-y-auto">
            {/* Section 1: New Inquiry Notifications */}
            {inquiryNotifications.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  상담 신청
                </p>
                {inquiryNotifications.map((notif) => (
                  <NotificationItem
                    key={notif.id}
                    notif={notif}
                    icon={<MessageSquare className="w-3.5 h-3.5 text-orange-600 shrink-0" />}
                    bgClass="bg-orange-50 hover:bg-orange-100"
                    onClick={() => handleNotificationClick(notif)}
                    onDismiss={() => handleMarkAsRead(notif.id)}
                  />
                ))}
              </div>
            )}

            {/* Section 2: Consultation Notifications */}
            {consultationNotifications.length > 0 && (
              <div className="space-y-2">
                {inquiryNotifications.length > 0 && (
                  <div className="border-t pt-3" />
                )}
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  상담 내역
                </p>
                {consultationNotifications.map((notif) => (
                  <NotificationItem
                    key={notif.id}
                    notif={notif}
                    icon={<PhoneCall className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                    bgClass="bg-blue-50 hover:bg-blue-100"
                    onClick={() => handleNotificationClick(notif)}
                    onDismiss={() => handleMarkAsRead(notif.id)}
                  />
                ))}
              </div>
            )}

            {/* Section 3: Pending Users (admin only) */}
            {isAdmin && pendingUsers.length > 0 && (
              <div className="space-y-2">
                {allNotifCount > 0 && (
                  <div className="border-t pt-3" />
                )}
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  가입 승인 대기
                </p>
                {pendingUsers.map((pendingUser) => (
                  <div key={pendingUser.id} className="border rounded-lg p-3 space-y-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        이름: {pendingUser.name && pendingUser.name.trim() !== "" ? pendingUser.name : "이름 없음"}, 이메일: {pendingUser.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        신청 계정연결 하세요
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsOpen(false)
                          window.location.href = "/employees"
                        }}
                        className="flex-1"
                      >
                        <UserCheck className="w-3 h-3 mr-1" />
                        확인
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {allNotifCount === 0 && pendingCount === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">새로운 알림이 없습니다</p>
              </div>
            )}
          </CardContent>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Reusable notification item */
function NotificationItem({
  notif,
  icon,
  bgClass,
  onClick,
  onDismiss,
}: {
  notif: Notification
  icon: React.ReactNode
  bgClass: string
  onClick: () => void
  onDismiss: () => void
}) {
  return (
    <div
      className={`border rounded-lg p-3 ${bgClass} cursor-pointer transition-colors`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 flex-1">
          <p className="text-sm font-medium flex items-center gap-1.5">
            {icon}
            {notif.title}
          </p>
          <p className="text-sm text-muted-foreground">{notif.content}</p>
          <p className="text-xs text-muted-foreground">
            {formatTimeAgo(notif.created_at)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          title="읽음 처리"
        >
          <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
      </div>
    </div>
  )
}

/** Format a timestamp as relative time in Korean */
function formatTimeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return "방금 전"
  if (diffMin < 60) return `${diffMin}분 전`

  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}시간 전`

  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay}일 전`

  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
}
