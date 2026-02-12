"use client"

import type React from "react"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCallback, useEffect, useRef, useState } from "react"

export function StudentsFilters({ onNewStudent }: { onNewStudent: () => void }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState("")

  // Get current filter values from URL
  const search = searchParams.get("search") || ""
  const department = searchParams.get("department") || "all"
  const status = searchParams.get("status") || "재원" // 기본값을 "재원"으로 변경
  const school_type = searchParams.get("school_type") || "all"
  const grade = searchParams.get("grade") || "all"

  // 컴포넌트 마운트 시 검색어 상태 초기화
  useEffect(() => {
    setSearchValue(search)
  }, [search])

  // Create a new URLSearchParams and update the router
  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(name, value)
      } else {
        params.delete(name)
      }
      // 필터 변경 시 항상 페이지를 1로 리셋
      params.set("page", "1")

      return params.toString()
    },
    [searchParams],
  )

  // 검색 디바운스 (300ms)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchValue(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      router.push(`${pathname}?${createQueryString("search", value)}`)
    }, 300)
  }
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const handleDepartmentChange = (value: string) => {
    router.push(`${pathname}?${createQueryString("department", value)}`)
  }

  const handleStatusChange = (value: string) => {
    router.push(`${pathname}?${createQueryString("status", value)}`)
  }

  const handleSchoolTypeChange = (value: string) => {
    router.push(`${pathname}?${createQueryString("school_type", value)}`)
  }

  const handleGradeChange = (value: string) => {
    router.push(`${pathname}?${createQueryString("grade", value)}`)
  }

  return (
    <div className="border-b border-t p-4 bg-background">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="이름, 학교, 연락처 검색..."
            value={searchValue}
            onChange={handleSearchChange}
            className="max-w-sm"
          />
          <Button onClick={onNewStudent} className="shrink-0 bg-primary text-primary-foreground">
            + 신규 학생 등록
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={department} onValueChange={handleDepartmentChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="담당관" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 담당관</SelectItem>
              <SelectItem value="영재관">영재관</SelectItem>
              <SelectItem value="중등관">중등관</SelectItem>
              <SelectItem value="고등관">고등관</SelectItem>
            </SelectContent>
          </Select>

          <Select value={school_type} onValueChange={handleSchoolTypeChange}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="학교" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 학교</SelectItem>
              <SelectItem value="초등학교">초등학교</SelectItem>
              <SelectItem value="중학교">중학교</SelectItem>
              <SelectItem value="고등학교">고등학교</SelectItem>
            </SelectContent>
          </Select>

          <Select value={grade} onValueChange={handleGradeChange}>
            <SelectTrigger className="w-[80px]">
              <SelectValue placeholder="학년" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전학년</SelectItem>
              <SelectItem value="1">1학년</SelectItem>
              <SelectItem value="2">2학년</SelectItem>
              <SelectItem value="3">3학년</SelectItem>
              <SelectItem value="4">4학년</SelectItem>
              <SelectItem value="5">5학년</SelectItem>
              <SelectItem value="6">6학년</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 상태</SelectItem>
              <SelectItem value="재원">재원</SelectItem>
              <SelectItem value="퇴원">퇴원</SelectItem>
              <SelectItem value="휴원">휴원</SelectItem>
              <SelectItem value="미등록">미등록</SelectItem>
              <SelectItem value="신규상담">신규상담</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

// Button 컴포넌트 추가
function Button({
  children,
  onClick,
  className = "",
}: { children: React.ReactNode; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 ${className}`}
    >
      {children}
    </button>
  )
}
