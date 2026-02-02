"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import {
  Users,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Target,
  Sparkles,
} from "lucide-react";
import { ClassSummary } from "./types";
import StudentProgressRow from "./StudentProgressRow";
import CommonWrongTable from "./CommonWrongTable";
import ConceptWeaknessCard from "./ConceptWeaknessCard";

interface ClassSummaryCardProps {
  classSummary: ClassSummary;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function ClassSummaryCard({
  classSummary,
  isExpanded,
  onToggle,
}: ClassSummaryCardProps) {
  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      {/* 반 헤더 (클릭 가능) */}
      <button
        onClick={onToggle}
        className="w-full bg-slate-800 px-5 py-3.5 flex items-center justify-between hover:bg-slate-750 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
            <h2 className="text-lg font-bold text-white">
              {classSummary.className}
            </h2>
          </div>
          <div className="flex items-center gap-2.5 text-slate-300 text-sm">
            <Users className="w-4 h-4" />
            <span>{classSummary.totalStudents}명</span>

            {/* 자율학습 통계 */}
            {classSummary.totalSelfStudyProblems > 0 && (
              <>
                <span className="text-slate-500">|</span>
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-purple-300">
                  자율 {classSummary.totalSelfStudyProblems}문제
                </span>
              </>
            )}

            {/* 공통오답 */}
            {classSummary.commonWrongProblems.length > 0 && (
              <>
                <span className="text-slate-500">|</span>
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-amber-300">
                  공통오답 {classSummary.commonWrongProblems.length}개
                </span>
              </>
            )}

            {/* 주요 취약 개념 */}
            {classSummary.topWeakConcepts.length > 0 && (
              <>
                <span className="text-slate-500">|</span>
                <span className="text-red-300 text-xs">
                  취약: {classSummary.topWeakConcepts.slice(0, 2).join(", ")}
                  {classSummary.topWeakConcepts.length > 2 && " ..."}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">완료율</span>
            <span className="text-lg font-bold text-white">
              {classSummary.avgCompletionRate}%
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">정답률</span>
            <span
              className={`text-lg font-bold ${
                classSummary.avgCorrectRate >= 70
                  ? "text-emerald-400"
                  : "text-amber-400"
              }`}
            >
              {classSummary.avgCorrectRate}%
            </span>
          </div>
        </div>
      </button>

      {/* 펼쳐진 내용 */}
      {isExpanded && (
        <div className="p-5">
          {/* 학생별 현황 */}
          <div className="mb-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              학생별 현황
            </h3>
            <div className="space-y-2">
              {classSummary.students.map((student) => (
                <StudentProgressRow
                  key={student.mathflatStudentId}
                  student={student}
                  showWeakConcepts={true}
                />
              ))}
            </div>
          </div>

          {/* 공통 오답 문제 */}
          <CommonWrongTable
            problems={classSummary.commonWrongProblems}
            students={classSummary.students}
            totalStudents={classSummary.totalStudents}
            classId={classSummary.classId}
          />

          {/* 개념별 약점 */}
          <ConceptWeaknessCard
            weaknesses={classSummary.conceptWeaknesses}
            totalStudents={classSummary.totalStudents}
          />
        </div>
      )}
    </Card>
  );
}
