import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LearningHistoryFilterProps {
  datePreset: string;
  setDatePreset: (value: string) => void;
  dateRange: { from: string; to: string };
  setDateRange: (range: { from: string; to: string }) => void;
  classSearch: string;
  setClassSearch: (value: string) => void;
  studentSearch: string;
  setStudentSearch: (value: string) => void;
  classOptions: { id: string; name: string }[];
  studentOptions: { id: string; name: string }[];
  onSearch: () => void;
  onReset: () => void;
}

export function LearningHistoryFilter({
  datePreset,
  setDatePreset,
  dateRange,
  setDateRange,
  classSearch,
  setClassSearch,
  studentSearch,
  setStudentSearch,
  classOptions,
  studentOptions,
  onSearch,
  onReset,
}: LearningHistoryFilterProps) {
  return (
    <div className="bg-white rounded-xl shadow border p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
        {/* 기간 드롭다운 */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-2">기간</label>
          <select
            className="h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={datePreset}
            onChange={e => setDatePreset(e.target.value)}
          >
            <option value="week">최근 일주일</option>
            <option value="month">최근 한달</option>
            <option value="custom">사용자 지정</option>
          </select>
        </div>
        
        {/* 시작일 */}
        {datePreset === "custom" && (
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-2">시작일</label>
            <input
              type="date"
              className="h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={dateRange.from}
              onChange={e => setDateRange({ ...dateRange, from: e.target.value })}
            />
          </div>
        )}
        
        {/* 종료일 */}
        {datePreset === "custom" && (
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-2">종료일</label>
            <input
              type="date"
              className="h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={dateRange.to}
              onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
            />
          </div>
        )}
        
        {/* 반 검색 */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-2">반</label>
          <div className="relative">
            <Input
              value={classSearch}
              onChange={e => setClassSearch(e.target.value)}
              placeholder="반 이름 검색"
              className="h-10"
            />
            {classSearch && (
              <div className="absolute top-full left-0 mt-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {classOptions.filter(c => c.name.toLowerCase().includes(classSearch.toLowerCase())).length}개 결과
              </div>
            )}
          </div>
        </div>
        
        {/* 학생 검색 */}
        <div className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-2">학생</label>
          <div className="relative">
            <Input
              value={studentSearch}
              onChange={e => setStudentSearch(e.target.value)}
              placeholder="학생 이름 검색"
              className="h-10"
            />
            {studentSearch && (
              <div className="absolute top-full left-0 mt-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {studentOptions.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase())).length}개 결과
              </div>
            )}
          </div>
        </div>
        
        {/* 검색 & 초기화 버튼 */}
        <div className="flex gap-2 md:col-span-2 lg:col-span-1">
          <Button onClick={onSearch} className="h-10 flex-1">
            검색
          </Button>
          <Button onClick={onReset} variant="outline" className="h-10 flex-1">
            초기화
          </Button>
        </div>
      </div>
    </div>
  );
}