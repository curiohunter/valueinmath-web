"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClassInfo } from "../types";

interface Student {
  student_id: string;
  mathflat_student_id: string;
  student_name: string;
  class_id: string;
  recentCorrectRate?: number;
}

interface ClassGroup {
  classId: string;
  className: string;
  students: Student[];
}

interface StudentAnalysisSidebarProps {
  classes: ClassInfo[];
  studentsByClass: Map<string, Student[]>;
  selectedStudentId: string | null;
  onStudentSelect: (mathflatStudentId: string, classId: string) => void;
  isLoading: boolean;
}

const CLASS_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

function getScoreColor(rate: number): string {
  if (rate >= 80) return "text-emerald-600";
  if (rate >= 60) return "text-blue-600";
  if (rate >= 40) return "text-amber-600";
  return "text-red-600";
}

export default function StudentAnalysisSidebar({
  classes,
  studentsByClass,
  selectedStudentId,
  onStudentSelect,
  isLoading,
}: StudentAnalysisSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClassId, setFilterClassId] = useState<string | null>(null);
  const [collapsedClasses, setCollapsedClasses] = useState<Set<string>>(
    new Set()
  );

  const toggleCollapse = (classId: string) => {
    setCollapsedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  };

  const classGroups = useMemo((): ClassGroup[] => {
    const activeClasses = filterClassId
      ? classes.filter((c) => c.id === filterClassId)
      : classes;

    const query = searchQuery.trim().toLowerCase();

    return activeClasses
      .filter((cls) => {
        const students = studentsByClass.get(cls.id);
        if (!students || students.length === 0) return false;
        if (!query) return true;
        if (cls.name.toLowerCase().includes(query)) return true;
        return students.some((s) =>
          s.student_name.toLowerCase().includes(query)
        );
      })
      .map((cls): ClassGroup => {
        const allStudents = studentsByClass.get(cls.id) ?? [];
        const filteredStudents =
          query && !cls.name.toLowerCase().includes(query)
            ? allStudents.filter((s) =>
                s.student_name.toLowerCase().includes(query)
              )
            : allStudents;
        return {
          classId: cls.id,
          className: cls.name,
          students: filteredStudents,
        };
      });
  }, [classes, filterClassId, studentsByClass, searchQuery]);

  const totalStudents = useMemo(() => {
    let count = 0;
    for (const [, students] of studentsByClass) {
      count += students.length;
    }
    return count;
  }, [studentsByClass]);

  return (
    <div className="w-72 border-r border-slate-200 bg-white flex flex-col h-full">
      {/* 헤더 */}
      <div className="p-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">
          학생 선택
        </h3>

        {/* 반 필터 */}
        <Select
          value={filterClassId ?? "all"}
          onValueChange={(v) => setFilterClassId(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-full h-8 text-xs">
            <SelectValue placeholder="전체 반" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 반</SelectItem>
            {classes
              .filter((c) => (studentsByClass.get(c.id)?.length ?? 0) > 0)
              .map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* 검색 */}
        <div className="relative mt-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="학생 이름 검색"
            className="h-8 text-xs pl-7 pr-7"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 학생 목록 */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">로딩 중...</span>
            </div>
          ) : classGroups.length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-8">
              {searchQuery
                ? "검색 결과가 없습니다"
                : "학생이 등록된 반이 없습니다"}
            </div>
          ) : (
            classGroups.map((group, groupIdx) => {
              const isCollapsed = collapsedClasses.has(group.classId);
              const globalIdx = classes.findIndex(
                (c) => c.id === group.classId
              );
              const color =
                CLASS_COLORS[globalIdx % CLASS_COLORS.length];
              const hasSelected = group.students.some(
                (s) => s.mathflat_student_id === selectedStudentId
              );

              return (
                <div
                  key={group.classId}
                  className={cn(
                    "rounded-md border",
                    hasSelected
                      ? "border-indigo-200 ring-1 ring-indigo-100"
                      : "border-slate-100"
                  )}
                >
                  {/* 반 헤더 */}
                  <button
                    type="button"
                    onClick={() => toggleCollapse(group.classId)}
                    className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 rounded-t-md w-full text-left"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs font-medium text-slate-700 truncate flex-1">
                      {group.className}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1 py-0 h-4 flex-shrink-0"
                    >
                      {group.students.length}명
                    </Badge>
                  </button>

                  {/* 학생 목록 */}
                  {!isCollapsed && (
                    <div className="px-1 py-1 space-y-0.5">
                      {group.students.map((student) => {
                        const isSelected =
                          student.mathflat_student_id === selectedStudentId;

                        return (
                          <button
                            key={student.mathflat_student_id}
                            type="button"
                            onClick={() =>
                              onStudentSelect(
                                student.mathflat_student_id,
                                group.classId
                              )
                            }
                            className={cn(
                              "flex items-center gap-2 px-2 py-1.5 rounded w-full text-left transition-colors",
                              isSelected
                                ? "bg-indigo-50 text-indigo-700"
                                : "hover:bg-slate-50 text-slate-700"
                            )}
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                isSelected
                                  ? "bg-indigo-500"
                                  : "bg-transparent"
                              )}
                            />
                            <span className="text-xs flex-1 truncate">
                              {student.student_name}
                            </span>
                            {student.recentCorrectRate !== undefined && (
                              <span
                                className={cn(
                                  "text-[10px] font-medium flex-shrink-0",
                                  getScoreColor(student.recentCorrectRate)
                                )}
                              >
                                {student.recentCorrectRate}%
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* 하단 요약 */}
      <div className="p-3 border-t border-slate-100 bg-slate-50">
        <div className="text-xs text-slate-500">
          전체:{" "}
          <strong className="text-slate-700">{totalStudents}명</strong>
          <span className="ml-1 text-slate-400">
            ({classes.filter((c) => (studentsByClass.get(c.id)?.length ?? 0) > 0).length}개 반)
          </span>
        </div>
      </div>
    </div>
  );
}
