"use client"

import { useState, useEffect, useCallback } from "react"
import { Check, ChevronsUpDown, Search, School, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface School {
  id: string
  name: string
  school_type: string
  province: string
  district: string | null
}

interface SchoolSelectorProps {
  value?: string | null // school_id
  onSelect: (school: School | null) => void
  defaultProvince?: string
  defaultDistrict?: string
  className?: string
}

/**
 * 학교 선택 컴포넌트
 * - 학교명 검색 (Autocomplete)
 * - 시/도 → 시/군/구 필터링
 */
export function SchoolSelector({
  value,
  onSelect,
  defaultProvince = "서울특별시",
  defaultDistrict = "광진구",
  className,
}: SchoolSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [schools, setSchools] = useState<School[]>([])
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 필터 상태
  const [provinces, setProvinces] = useState<string[]>([])
  const [districts, setDistricts] = useState<string[]>([])
  const [selectedProvince, setSelectedProvince] = useState(defaultProvince)
  const [selectedDistrict, setSelectedDistrict] = useState(defaultDistrict)

  // 시/도 목록 로드
  useEffect(() => {
    async function loadProvinces() {
      try {
        const res = await fetch('/api/schools/districts')
        const data = await res.json()
        if (data.provinces) {
          setProvinces(data.provinces)
        }
      } catch (error) {
        console.error('시도 목록 로드 실패:', error)
      }
    }
    loadProvinces()
  }, [])

  // 시/군/구 목록 로드 (시/도 변경시)
  useEffect(() => {
    async function loadDistricts() {
      if (!selectedProvince) {
        setDistricts([])
        return
      }
      try {
        const res = await fetch(`/api/schools/districts?province=${encodeURIComponent(selectedProvince)}`)
        const data = await res.json()
        if (data.districts) {
          setDistricts(data.districts)
          // 기존 시군구가 목록에 없으면 초기화
          if (!data.districts.includes(selectedDistrict)) {
            setSelectedDistrict('')
          }
        }
      } catch (error) {
        console.error('시군구 목록 로드 실패:', error)
      }
    }
    loadDistricts()
  }, [selectedProvince])

  // 학교 검색
  const searchSchools = useCallback(async (query: string) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (selectedProvince) params.set('province', selectedProvince)
      if (selectedDistrict) params.set('district', selectedDistrict)
      params.set('limit', '30')

      const res = await fetch(`/api/schools?${params}`)
      const data = await res.json()
      if (data.schools) {
        setSchools(data.schools)
      }
    } catch (error) {
      console.error('학교 검색 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedProvince, selectedDistrict])

  // 검색어 또는 필터 변경시 검색
  useEffect(() => {
    const debounce = setTimeout(() => {
      searchSchools(searchQuery)
    }, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery, searchSchools])

  // 초기 value로 학교 정보 로드
  useEffect(() => {
    if (value && !selectedSchool) {
      // TODO: ID로 학교 정보 조회
    }
  }, [value, selectedSchool])

  const handleSelect = (school: School) => {
    setSelectedSchool(school)
    onSelect(school)
    setOpen(false)
  }

  const handleClear = () => {
    setSelectedSchool(null)
    onSelect(null)
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* 지역 필터 */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground mb-1 block">시/도</Label>
          <Select value={selectedProvince} onValueChange={setSelectedProvince}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="시/도 선택" />
            </SelectTrigger>
            <SelectContent>
              {provinces.map((province) => (
                <SelectItem key={province} value={province}>
                  {province}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground mb-1 block">시/군/구</Label>
          <Select
            value={selectedDistrict}
            onValueChange={setSelectedDistrict}
            disabled={!selectedProvince}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="시/군/구 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">전체</SelectItem>
              {districts.map((district) => (
                <SelectItem key={district} value={district}>
                  {district}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 학교 선택 */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-10"
          >
            {selectedSchool ? (
              <div className="flex items-center gap-2 truncate">
                <School className="h-4 w-4 shrink-0" />
                <span className="truncate">{selectedSchool.name}</span>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {selectedSchool.school_type}
                </Badge>
              </div>
            ) : (
              <span className="text-muted-foreground">학교를 검색하세요...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="학교명을 입력하세요..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <CommandList>
              {isLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  검색 중...
                </div>
              ) : schools.length === 0 ? (
                <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {schools.map((school) => (
                    <CommandItem
                      key={school.id}
                      value={school.id}
                      onSelect={() => handleSelect(school)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedSchool?.id === school.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="truncate font-medium">{school.name}</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {school.province} {school.district}
                        </span>
                      </div>
                      <Badge variant="outline" className="ml-2 text-xs shrink-0">
                        {school.school_type}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* 선택된 학교 정보 (선택 시 표시) */}
      {selectedSchool && (
        <div className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
          <div>
            <span className="font-medium">{selectedSchool.name}</span>
            <span className="text-muted-foreground ml-2">
              ({selectedSchool.province} {selectedSchool.district})
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
