"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { User } from "lucide-react"

interface NameInputProps {
  userId: string
  currentName?: string
  onNameUpdated: () => void
}

export function NameInput({ userId, currentName, onNameUpdated }: NameInputProps) {
  const [name, setName] = useState(currentName || "")
  const [isLoading, setIsLoading] = useState(false)
  const supabase = getSupabaseBrowserClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      toast.error("이름을 입력해주세요")
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          name: name.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("id", userId)

      if (error) throw error

      toast.success("이름이 저장되었습니다!")
      onNameUpdated()
    } catch (error) {
      console.error("Error updating name:", error)
      toast.error("이름 저장 중 오류가 발생했습니다")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="w-5 h-5" />
          이름 입력
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder="실명을 입력해주세요 (예: 홍길동)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              className="text-center text-lg"
              maxLength={20}
            />
            <p className="text-sm text-muted-foreground mt-2 text-center">
              관리자가 어떤 직원인지 식별할 수 있도록 실명을 입력해주세요
            </p>
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !name.trim()}
          >
            {isLoading ? "저장 중..." : "이름 저장"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
