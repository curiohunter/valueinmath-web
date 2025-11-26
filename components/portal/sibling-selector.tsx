"use client"

import { Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface Sibling {
  id: string
  name: string
  grade: number | null
  school: string | null
  status: string
}

interface SiblingSelectorProps {
  siblings: Sibling[]
  currentStudentId: string
  onSelect: (studentId: string) => void
}

export function SiblingSelector({
  siblings,
  currentStudentId,
  onSelect,
}: SiblingSelectorProps) {
  // 재원 상태인 자녀만 필터링
  const activeChildren = siblings.filter((s) => s.status === "재원")

  // 재원 자녀가 1명 이하면 선택기 표시 안함
  if (activeChildren.length <= 1) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-5 w-5 text-amber-600" />
        <span className="font-semibold text-amber-800">자녀 선택</span>
        <span className="text-sm text-amber-600">({activeChildren.length}명)</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {activeChildren.map((child) => {
          const isSelected = child.id === currentStudentId

          return (
            <button
              key={child.id}
              onClick={() => onSelect(child.id)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                "border-2 shadow-sm",
                isSelected
                  ? "bg-amber-500 text-white border-amber-600 shadow-md"
                  : "bg-white text-amber-800 border-amber-300 hover:bg-amber-100 hover:border-amber-400"
              )}
            >
              <span>{child.name}</span>
              <span className="ml-1 opacity-75">
                ({child.grade}학년)
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
