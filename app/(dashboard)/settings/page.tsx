"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Settings, Construction } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="h-8 w-8" />
          설정
        </h1>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <Construction className="h-24 w-24 text-gray-400 mb-6" />
          <h2 className="text-2xl font-semibold text-gray-700 mb-3">
            페이지 준비중입니다
          </h2>
          <p className="text-gray-500 text-center">
            설정 기능은 현재 개발 중입니다.<br />
            빠른 시일 내에 서비스를 제공할 예정입니다.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}