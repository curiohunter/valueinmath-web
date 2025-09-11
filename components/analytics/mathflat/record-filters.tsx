"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, ChevronDown, Plus } from "lucide-react"

interface RecordFiltersProps {
  searchTerm: string
  setSearchTerm: (value: string) => void
  dateFilter: string
  setDateFilter: (value: string) => void
  categoryFilter: string
  setCategoryFilter: (value: string) => void
  selectedStudents: string[]
  setSelectedStudents: (value: string[]) => void
  selectedClasses: string[]
  setSelectedClasses: (value: string[]) => void
  studentOptions: Array<{id: string, name: string}>
  classOptions: Array<{id: string, name: string}>
  onAddRecord: () => void
}

export function RecordFilters({
  searchTerm,
  setSearchTerm,
  dateFilter,
  setDateFilter,
  categoryFilter,
  setCategoryFilter,
  selectedStudents,
  setSelectedStudents,
  selectedClasses,
  setSelectedClasses,
  studentOptions,
  classOptions,
  onAddRecord
}: RecordFiltersProps) {
  return (
    <div className="mb-4">
      <div className="flex gap-2 flex-wrap">
        {/* 검색 입력 */}
        <div className="w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="학생 이름 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        {/* 기간 선택 */}
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="기간 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">최근 1주</SelectItem>
            <SelectItem value="month">최근 1개월</SelectItem>
            <SelectItem value="all">전체</SelectItem>
          </SelectContent>
        </Select>

        {/* 카테고리 선택 */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="카테고리" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="학습지">학습지</SelectItem>
            <SelectItem value="교재">교재</SelectItem>
            <SelectItem value="오답/심화">오답/심화</SelectItem>
            <SelectItem value="챌린지">챌린지</SelectItem>
          </SelectContent>
        </Select>
        
        {/* 학생 선택 필터 */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-[130px] justify-between text-sm font-normal"
            >
              {selectedStudents.length === 0
                ? "학생 선택"
                : selectedStudents.length === 1
                ? studentOptions.find(s => s.id === selectedStudents[0])?.name || "학생 선택"
                : `${selectedStudents.length}명 선택`
              }
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0">
            <div className="max-h-64 overflow-y-auto">
              <div className="p-2 border-b">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => {
                    if (selectedStudents.length === studentOptions.length) {
                      setSelectedStudents([]);
                    } else {
                      setSelectedStudents(studentOptions.map(s => s.id));
                    }
                  }}
                >
                  {selectedStudents.length === studentOptions.length ? "전체 해제" : "전체 선택"}
                </Button>
              </div>
              <div className="p-2 space-y-1">
                {studentOptions.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center space-x-2 py-1.5 px-2 rounded hover:bg-gray-100"
                  >
                    <Checkbox
                      id={`student-${student.id}`}
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedStudents([...selectedStudents, student.id]);
                        } else {
                          setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                        }
                      }}
                    />
                    <label
                      htmlFor={`student-${student.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      {student.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        {/* 반 선택 필터 */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-[130px] justify-between text-sm font-normal"
            >
              {selectedClasses.length === 0
                ? "반 선택"
                : selectedClasses.length === 1
                ? classOptions.find(c => c.id === selectedClasses[0])?.name || "반 선택"
                : `${selectedClasses.length}개 반 선택`
              }
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0">
            <div className="max-h-64 overflow-y-auto">
              <div className="p-2 border-b">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => {
                    if (selectedClasses.length === classOptions.length) {
                      setSelectedClasses([]);
                    } else {
                      setSelectedClasses(classOptions.map(c => c.id));
                    }
                  }}
                >
                  {selectedClasses.length === classOptions.length ? "전체 해제" : "전체 선택"}
                </Button>
              </div>
              <div className="p-2 space-y-1">
                {classOptions.map((classOption) => (
                  <div
                    key={classOption.id}
                    className="flex items-center space-x-2 py-1.5 px-2 rounded hover:bg-gray-100"
                  >
                    <Checkbox
                      id={`class-${classOption.id}`}
                      checked={selectedClasses.includes(classOption.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedClasses([...selectedClasses, classOption.id]);
                        } else {
                          setSelectedClasses(selectedClasses.filter(id => id !== classOption.id));
                        }
                      }}
                    />
                    <label
                      htmlFor={`class-${classOption.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                    >
                      {classOption.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        {/* 학습기록추가 버튼 - 맨 오른쪽에 배치 */}
        <div className="ml-auto">
          <Button onClick={onAddRecord} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            학습기록추가
          </Button>
        </div>
      </div>
    </div>
  )
}