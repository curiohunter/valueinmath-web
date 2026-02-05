"use client";

import React, { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Filter } from "lucide-react";
import {
  CommonWrongProblem,
  StudentLearingSummary,
  getWrongCountColor,
} from "./types";

interface CommonWrongTableProps {
  problems: CommonWrongProblem[];
  students: StudentLearingSummary[];
  totalStudents: number;
  classId: string;
}

export default function CommonWrongTable({
  problems,
  students,
  totalStudents,
}: CommonWrongTableProps) {
  const [studentFilter, setStudentFilter] = useState<string>("all");

  // 필터링된 공통오답 목록
  const filteredProblems =
    studentFilter === "all"
      ? problems
      : problems.filter((p) => p.wrongStudents.includes(studentFilter));

  if (problems.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-slate-100 pt-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          공통 오답 (2명 이상)
        </h3>
        {/* 학생 필터 */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <Select value={studentFilter} onValueChange={setStudentFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs bg-white border-slate-200">
              <SelectValue placeholder="학생 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 학생</SelectItem>
              {students.map((s) => (
                <SelectItem key={s.mathflatStudentId} value={s.studentName}>
                  {s.studentName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredProblems.length === 0 ? (
        <div className="text-center py-6 text-slate-400 text-sm">
          선택한 학생의 공통 오답이 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-600">
                <th className="px-3 py-2 text-center font-medium w-20">오답수</th>
                <th className="px-3 py-2 text-left font-medium">교재</th>
                <th className="px-3 py-2 text-left font-medium w-24">페이지</th>
                <th className="px-3 py-2 text-left font-medium">단원/유형</th>
                <th className="px-3 py-2 text-left font-medium w-32">문제번호</th>
                <th className="px-3 py-2 text-left font-medium">틀린 학생</th>
              </tr>
            </thead>
            <tbody>
              {filteredProblems.map((problem, idx) => (
                <tr
                  key={problem.problemId}
                  className={`border-b border-slate-100 ${
                    idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                  }`}
                >
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${getWrongCountColor(
                        problem.wrongCount,
                        totalStudents
                      )}`}
                    >
                      {problem.wrongCount}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-700 font-medium">
                    <div className="flex items-center gap-1.5">
                      {problem.bookType === 'WORKSHEET' && (
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 text-xs font-medium rounded">
                          학습지
                        </span>
                      )}
                      <span>{problem.bookTitle || "-"}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-600">
                    {problem.page ? `p.${problem.page}` : "-"}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">
                    <div className="flex flex-col gap-0.5">
                      <span>{problem.problemTitle || "-"}</span>
                      {problem.conceptName && (
                        <span className="text-xs text-slate-400">
                          {problem.conceptName}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-slate-800">
                    {problem.problemNumber || "-"}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {problem.wrongStudents.map((name) => (
                        <span
                          key={name}
                          className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded text-xs"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
