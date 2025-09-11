"use client"

import { Calendar } from "lucide-react"
import { Card } from "@/components/ui/card"

interface DateSelectorProps {
  date: string
  onDateChange: (date: string) => void
}

export function DateSelector({ date, onDateChange }: DateSelectorProps) {
  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-gray-700">날짜 선택</span>
        </div>
        <input
          type="date"
          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          value={date}
          onChange={e => onDateChange(e.target.value)}
        />
        <div className="mt-2 text-xs text-blue-600 font-medium">
          {new Date(date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>
    </Card>
  )
}