"use client"

import Link from "next/link"
import {
  Users,
  DollarSign,
  MessageSquare,
  BookOpen,
  ClipboardCheck,
  Calendar,
  Megaphone,
  Zap
} from "lucide-react"
import { cn } from "@/lib/utils"

interface QuickAccessItem {
  title: string
  href: string
  icon: React.ElementType
  description: string
  color: string
}

const quickAccessItems: QuickAccessItem[] = [
  {
    title: "학생 관리",
    href: "/students",
    icon: Users,
    description: "학생 정보 조회 및 관리",
    color: "bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400"
  },
  {
    title: "학원비 이력",
    href: "/students/tuition-history",
    icon: DollarSign,
    description: "납부 현황 및 이력 관리",
    color: "bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400"
  },
  {
    title: "상담 관리",
    href: "/consultations",
    icon: MessageSquare,
    description: "상담 일정 및 기록 관리",
    color: "bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400"
  },
  {
    title: "학습 현황",
    href: "/learning",
    icon: BookOpen,
    description: "진도 및 학습 관리",
    color: "bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400"
  },
  {
    title: "테스트 기록",
    href: "/learning/test-logs",
    icon: ClipboardCheck,
    description: "시험 결과 및 기록",
    color: "bg-pink-500/10 hover:bg-pink-500/20 text-pink-600 dark:text-pink-400"
  },
  {
    title: "보강 관리",
    href: "/learning/makeup-classes",
    icon: Calendar,
    description: "보강 일정 관리",
    color: "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
  },
  {
    title: "마케팅 관리",
    href: "/students/marketing",
    icon: Megaphone,
    description: "캠페인 및 이벤트 관리",
    color: "bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400"
  },
  {
    title: "액션센터",
    href: "/analytics/funnel-v2",
    icon: Zap,
    description: "퍼널 분석 및 액션",
    color: "bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
  }
]

export function QuickAccessSection() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">바로가기</h2>
        <p className="text-sm text-muted-foreground">자주 사용하는 메뉴로 빠르게 이동</p>
      </div>
      
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {quickAccessItems.map((item, index) => {
          const Icon = item.icon
          const isDisabled = item.href === "#"
          
          const content = (
            <div
              className={cn(
                "group relative flex flex-col items-center justify-center p-4 rounded-lg border transition-all duration-200",
                item.color,
                !isDisabled && "hover:scale-105 hover:shadow-md cursor-pointer",
                isDisabled && "pointer-events-none"
              )}
            >
              <Icon className="h-8 w-8 mb-2 transition-transform group-hover:scale-110" />
              <h3 className="font-medium text-sm">{item.title}</h3>
              <p className="text-xs text-center mt-1 opacity-80">{item.description}</p>
            </div>
          )
          
          if (isDisabled) {
            return <div key={index}>{content}</div>
          }
          
          return (
            <Link key={index} href={item.href}>
              {content}
            </Link>
          )
        })}
      </div>
    </div>
  )
}