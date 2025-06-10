"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { testProfileUpdate } from "@/actions/test-actions"
import { toast } from "@/components/ui/use-toast"

export function TestButton() {
  const [isLoading, setIsLoading] = useState(false)
  
  const handleTest = async () => {
    setIsLoading(true)
    try {
      const result = await testProfileUpdate("d04e418a-22fa-4458-889f-df1c95f8c6e7", "박민아")
      
      if (result.success) {
        toast({
          title: "✅ 테스트 성공",
          description: "프로필 업데이트가 성공했습니다!",
        })
      } else {
        toast({
          title: "❌ 테스트 실패", 
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "❌ 테스트 오류",
        description: "예상치 못한 오류가 발생했습니다",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <Button onClick={handleTest} disabled={isLoading} variant="outline">
      {isLoading ? "테스트 중..." : "🧪 프로필 업데이트 테스트"}
    </Button>
  )
}
