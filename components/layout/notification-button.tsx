"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { getCurrentUser } from "@/actions/auth-actions"

interface PendingRegistration {
  id: string
  name: string
  role: string
  email: string
  student_name: string | null
  created_at: string
}

export function NotificationButton() {
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [user, setUser] = useState<any>(null)

  const supabase = createClientComponentClient()

  // 관리자 권한 확인
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const { user } = await getCurrentUser()
        setUser(user)
        
        if (!user) return

        const { data: employee, error } = await supabase
          .from("employees")
          .select("position")
          .eq("auth_id", user.id)
          .maybeSingle()

        if (error) {
          console.error("직원 정보 조회 오류:", error)
          setIsAdmin(false)
          return
        }

        const isAdminUser = employee?.position === "원장" || employee?.position === "부원장"
        setIsAdmin(isAdminUser)
      } catch (error) {
        console.error("관리자 권한 확인 오류:", error)
      }
    }

    checkAdminStatus()
  }, [])

  // 대기 중인 등록 신청 조회
  useEffect(() => {
    if (!isAdmin) return

    const loadPendingRegistrations = async () => {
      try {
        const { data, error } = await supabase
          .from("pending_registrations")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false })

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
  }, [isAdmin])

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "student": return "학생"
      case "parent": return "학부모"
      case "teacher": return "직원"
      default: return role
    }
  }

  const handleApproval = async (registrationId: string, approve: boolean) => {
    try {
      if (!approve) {
        // 거부의 경우 단순히 상태만 변경
        const { error } = await supabase
          .from("pending_registrations")
          .update({ status: "rejected" })
          .eq("id", registrationId)

        if (error) throw error
      } else {
        // 승인의 경우 복잡한 로직 수행
        
        // 1. pending_registrations에서 정보 가져오기
        const { data: registration, error: regError } = await supabase
          .from("pending_registrations")
          .select("*")
          .eq("id", registrationId)
          .single()

        if (regError || !registration) {
          throw new Error("등록 정보를 찾을 수 없습니다.")
        }

        if (registration.role === "teacher") {
          // 직원인 경우 기존 직원과 연결
          
          // 2. employees 테이블에서 이름이 일치하는 직원 찾기
          const { data: employee, error: empError } = await supabase
            .from("employees")
            .select("*")
            .eq("name", registration.name)
            .is("auth_id", null) // 아직 계정이 연결되지 않은 직원
            .maybeSingle()

          if (empError || !employee) {
            alert(`이름이 '${registration.name}'인 직원을 찾을 수 없거나 이미 계정이 연결되어 있습니다.`)
            return
          }

          // 3. 해당 직원의 auth_id를 신청자의 user_id로 업데이트
          const { error: updateEmpError } = await supabase
            .from("employees")
            .update({ 
              auth_id: registration.user_id
            })
            .eq("id", employee.id)

          if (updateEmpError) throw updateEmpError

          // 4. profiles 테이블에 직원 정보와 함께 업데이트
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert({ 
              id: registration.user_id,
              name: employee.name,
              position: employee.position,
              department: employee.department,
              approval_status: "approved",
              email: registration.email
            })

          if (profileError) throw profileError

        } else {
          // 학생/학부모인 경우 (향후 구현)
          // 현재는 profiles 테이블만 업데이트
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert({ 
              id: registration.user_id,
              approval_status: "approved",
              email: registration.email
            })

          if (profileError) throw profileError
        }

        // 5. pending_registrations.status = 'approved'로 변경
        const { error: finalError } = await supabase
          .from("pending_registrations")
          .update({ status: "approved" })
          .eq("id", registrationId)

        if (finalError) throw finalError
      }

      // 목록 새로고침
      const { data, error: fetchError } = await supabase
        .from("pending_registrations")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })

      if (!fetchError) {
        setPendingRegistrations(data || [])
        setPendingCount(data?.length || 0)
      }

      alert(approve ? "승인이 완료되었습니다." : "거부가 완료되었습니다.")
      
      // 페이지 새로고침으로 업데이트된 내용 반영
      window.location.reload()

    } catch (error) {
      console.error("승인 처리 오류:", error)
      alert("처리 중 오류가 발생했습니다: " + (error as any).message)
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
                      onClick={() => handleApproval(registration.id, true)}
                    >
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-6 px-2 text-xs"
                      onClick={() => handleApproval(registration.id, false)}
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