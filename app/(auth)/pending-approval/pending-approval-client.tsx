"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { toast } from "sonner"

interface PendingApprovalClientProps {
  userId: string
}

export function PendingApprovalClient({ userId }: PendingApprovalClientProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    // 승인 상태 실시간 구독
    const channel = supabase
      .channel("approval_status_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const newStatus = payload.new.approval_status
          
          if (newStatus === "approved") {
            toast.success("🎉 계정이 승인되었습니다! 대시보드로 이동합니다.")
            setTimeout(() => {
              router.push("/dashboard")
            }, 1500)
          } else if (newStatus === "rejected") {
            toast.error("❌ 계정이 거부되었습니다. 관리자에게 문의하세요.")
            setTimeout(() => {
              router.push("/login")
            }, 2000)
          }
        }
      )
      .subscribe()

    // 30초마다 상태 확인 (네트워크 문제 등으로 실시간 업데이트를 놓칠 경우 대비)
    const interval = setInterval(async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("approval_status")
        .eq("id", userId)
        .single()

      if (profile?.approval_status === "approved") {
        toast.success("🎉 계정이 승인되었습니다! 대시보드로 이동합니다.")
        setTimeout(() => {
          router.push("/dashboard")
        }, 1500)
      } else if (profile?.approval_status === "rejected") {
        toast.error("❌ 계정이 거부되었습니다. 관리자에게 문의하세요.")
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      }
    }, 30000) // 30초마다 확인

    // 컴포넌트 언마운트 시 정리
    return () => {
      channel.unsubscribe()
      clearInterval(interval)
    }
  }, [userId, router, supabase])

  return null // UI를 렌더링하지 않는 순수 로직 컴포넌트
}
