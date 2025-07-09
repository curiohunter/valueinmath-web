"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { getSupabaseBrowserClient, resetSupabaseBrowserClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      setIsLoading(true)

      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw error
      }

      toast.success("로그아웃되었습니다")
      
      // 싱글턴 클라이언트 리셋
      resetSupabaseBrowserClient()
      
      // 강제 새로고침으로 완전한 로그아웃
      window.location.href = "/login"
    } catch (error) {
      console.error("Logout error:", error)
      toast.error("로그아웃 중 오류가 발생했습니다")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      onClick={handleLogout}
      disabled={isLoading}
      className="flex items-center gap-2"
    >
      <LogOut className="w-4 h-4" />
      {isLoading ? "로그아웃 중..." : "로그아웃"}
    </Button>
  )
}
