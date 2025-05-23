"use client"

import type React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCallback, useEffect, useState } from "react"

export function EmployeesFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState("")

  // Get current filter values from URL
  const search = searchParams.get("search") || ""
  const position = searchParams.get("position") || "all"
  const status = searchParams.get("status") || "재직" // 기본값을 "재직"으로 설정

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

      return params.toString()
    },
    [searchParams],
  )

  // Handle filter changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value)
  }

  // 검색어 입력 후 엔터 키 처리
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      router.push(`${pathname}?${createQueryString("search", searchValue)}`)
    }
  }

  // 검색 버튼 클릭 처리
  const handleSearchClick = () => {
    router.push(`${pathname}?${createQueryString("search", searchValue)}`)
  }

  const handlePositionChange = (value: string) => {
    router.push(`${pathname}?${createQueryString("position", value)}`)
  }

  const handleStatusChange = (value: string) => {
    router.push(`${pathname}?${createQueryString("status", value)}`)
  }

  return (
    <div className="border-b border-t p-4 bg-background">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="이름, 연락처 검색..."
            value={searchValue}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            className="max-w-sm"
          />
          <Button onClick={handleSearchClick} className="shrink-0">
            검색
          </Button>
        </div>
        <div className="flex gap-4">
          <Select value={position} onValueChange={handlePositionChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="직책 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 직책</SelectItem>
              <SelectItem value="원장">원장</SelectItem>
              <SelectItem value="부원장">부원장</SelectItem>
              <SelectItem value="강사">강사</SelectItem>
              <SelectItem value="데스크직원">데스크직원</SelectItem>
              <SelectItem value="데스크보조">데스크보조</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="상태 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 상태</SelectItem>
              <SelectItem value="재직">재직</SelectItem>
              <SelectItem value="퇴직">퇴직</SelectItem>
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
