"use client"

import { Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface Sibling {
  id: string
  name: string
  grade: number | null
  school: string | null
  school_type: string | null
  status: string
}

interface SiblingSelectorProps {
  siblings: Sibling[]
  currentStudentId: string
  onSelect: (studentId: string) => void
}

// school_type을 약어로 변환 (고등학교 -> 고, 중학교 -> 중, 초등학교 -> 초)
function getSchoolTypeAbbr(schoolType: string | null): string {
  if (!schoolType) return ""
  if (schoolType.includes("고등") || schoolType === "고등학교") return "고"
  if (schoolType.includes("중") || schoolType === "중학교") return "중"
  if (schoolType.includes("초등") || schoolType === "초등학교") return "초"
  return ""
}

// school_type 정렬 우선순위 (고 > 중 > 초)
function getSchoolTypeOrder(schoolType: string | null): number {
  if (!schoolType) return 99
  if (schoolType.includes("고등") || schoolType === "고등학교") return 1
  if (schoolType.includes("중") || schoolType === "중학교") return 2
  if (schoolType.includes("초등") || schoolType === "초등학교") return 3
  return 99
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

  // 고 > 중 > 초 순으로 정렬, 같은 school_type 내에서는 학년 내림차순
  const sortedChildren = [...activeChildren].sort((a, b) => {
    const orderA = getSchoolTypeOrder(a.school_type)
    const orderB = getSchoolTypeOrder(b.school_type)
    if (orderA !== orderB) return orderA - orderB
    // 같은 school_type이면 학년 내림차순 (고3 > 고2 > 고1)
    return (b.grade || 0) - (a.grade || 0)
  })

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-5 w-5 text-amber-600" />
        <span className="font-semibold text-amber-800">자녀 선택</span>
        <span className="text-sm text-amber-600">({sortedChildren.length}명)</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {sortedChildren.map((child) => {
          const isSelected = child.id === currentStudentId
          const schoolAbbr = getSchoolTypeAbbr(child.school_type)
          const gradeDisplay = schoolAbbr && child.grade
            ? `${schoolAbbr}${child.grade}`
            : child.grade
            ? `${child.grade}학년`
            : ""

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
              {gradeDisplay && (
                <span className="ml-1 opacity-75">
                  ({gradeDisplay})
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
