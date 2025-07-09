"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getSupabaseBrowserClient } from "@/lib/supabase/client" // 1. Supabase 클라이언트 변경

interface PendingRegistration {
  id: string
  name: string
  role: string
  email: string
  student_name: string | null
  created_at: string
  user_id: string; // 승인 로직에 필요
}

// 2. user 객체를 props로 받기 위한 인터페이스 추가
interface NotificationButtonProps {
  user: any
}

export function NotificationButton({ user }: NotificationButtonProps) { // 3. props로 user 받기
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  // const [user, setUser] = useState<any>(null) // 더 이상 필요 없으므로 삭제

  const supabase = getSupabaseBrowserClient() // 1. Supabase 클라이언트 변경

  // 4. 관리자 권한 확인 로직 변경
  useEffect(() => {
    async function checkAdminStatus() {
      // user 객체가 없으면 관리자가 아니므로 바로 종료
      if (!user) {
        setIsAdmin(false)
        return
      }

      try {
        const { data: employee, error } = await supabase
          .from("employees")
          .select("position")
          .eq("auth_id", user.id)
          .single() // 한 명의 직원 정보만 가져옴

        if (error) {
          // 일치하는 직원이 없거나 에러 발생 시 관리자가 아님
          setIsAdmin(false)
          return
        }

        const adminStatus = employee?.position === "원장" || employee?.position === "부원장"
        setIsAdmin(adminStatus)

      } catch (error) {
        console.error("관리자 권한 확인 중 오류:", error)
        setIsAdmin(false)
      }
    }

    checkAdminStatus()
  }, [user, supabase]) // user 객체가 바뀔 때마다 실행

  // 대기 중인 등록 신청 조회 (기존 로직 유지)
  useEffect(() => {
    if (!isAdmin) return

    const loadPendingRegistrations = async () => {
      try {
        const { data, error } = await supabase
          .from("pending_registrations")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .returns<PendingRegistration[]>() // ✨ 이 부분을 추가하여 반환 타입을 명시합니다.

        if (error) throw error

        setPendingRegistrations(data || [])
        setPendingCount(data?.length || 0)
      } catch (error) {
        console.error("대기 중인 등록 신청 조회 오류:", error)
      }
    }

    loadPendingRegistrations()

    // 실시간 구독
    const channel = supabase
      .channel('pending_registrations_notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pending_registrations'
      }, () => {
        loadPendingRegistrations()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAdmin, supabase]) // supabase를 의존성 배열에 추가

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "student": return "학생"
      case "parent": return "학부모"
      case "teacher": return "직원"
      default: return role
    }
  }

  // 승인/거부 로직 (기존과 거의 동일)
  const handleApproval = async (registration: PendingRegistration, approve: boolean) => {
    try {
      if (!approve) {
        // 거부
        const { error } = await supabase
          .from("pending_registrations")
          .update({ status: "rejected" })
          .eq("id", registration.id)
        if (error) throw error
      } else {
        // 승인
        if (registration.role === "teacher") {
          // 직원 연결
          const { data: employee, error: empError } = await supabase
            .from("employees")
            .select("id, name, position, department")
            .eq("name", registration.name)
            .is("auth_id", null)
            .single()

          if (empError || !employee) {
            throw new Error(`이름이 '${registration.name}'인 직원(미연결 상태)을 찾을 수 없습니다.`)
          }

          const { error: updateEmpError } = await supabase
            .from("employees")
            .update({ auth_id: registration.user_id })
            .eq("id", employee.id)
          if (updateEmpError) throw updateEmpError

          const { error: profileError } = await supabase
            .from("profiles")
            .update({
              name: employee.name,
              position: employee.position,
              department: employee.department,
              approval_status: "approved",
            })
            .eq('id', registration.user_id)
          if (profileError) throw profileError

        } else {
          // 학생/학부모 (profiles 테이블의 상태만 변경)
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ approval_status: "approved" })
            .eq('id', registration.user_id)
          if (profileError) throw profileError
        }

        // pending_registrations 상태 변경
        const { error: finalError } = await supabase
          .from("pending_registrations")
          .update({ status: "approved" })
          .eq("id", registration.id)
        if (finalError) throw finalError
      }

      // 상태 업데이트 후 목록에서 제거 (UI 즉시 반영)
      setPendingRegistrations(prev => prev.filter(p => p.id !== registration.id))
      setPendingCount(prev => prev - 1)

      alert(approve ? "승인이 완료되었습니다." : "거부가 완료되었습니다.")
      // window.location.reload()는 사용자 경험에 좋지 않으므로, 상태 관리로 대체했습니다.

    } catch (error) {
      console.error("승인 처리 오류:", error)
      alert("처리 중 오류가 발생했습니다: " + (error as Error).message)
    }
  }

  if (!isAdmin) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full hover:bg-gray-100 transition-colors"
        >
          <Bell className="h-4 w-4" />
          {pendingCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {pendingCount > 9 ? '9+' : pendingCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>등록 신청 알림</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {pendingRegistrations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            대기 중인 등록 신청이 없습니다
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {pendingRegistrations.map((registration) => (
              <div key={registration.id} className="p-3 border-b last:border-b-0">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{registration.name}</p>
                      <p className="text-xs text-gray-500">{getRoleLabel(registration.role)}</p>
                      {registration.student_name && (
                        <p className="text-xs text-gray-500">학생: {registration.student_name}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        {new Date(registration.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      className="h-6 px-2 text-xs bg-green-500 hover:bg-green-600"
                      onClick={() => handleApproval(registration, true)}
                    >
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-6 px-2 text-xs"
                      onClick={() => handleApproval(registration, false)}
                    >
                      거부
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}