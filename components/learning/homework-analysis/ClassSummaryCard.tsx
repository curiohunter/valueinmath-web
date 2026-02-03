"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Users,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  AlertTriangle,
  Target,
  Brain,
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

// 섹션 토글 버튼 컴포넌트
function SectionToggle({
  isOpen,
  onToggle,
  icon: Icon,
  title,
  count,
  colorClass = "text-slate-500",
}: {
  isOpen: boolean;
  onToggle: () => void;
  icon: React.ElementType;
  title: string;
  count?: number;
  colorClass?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 py-2 px-1 hover:bg-slate-50 rounded-lg transition-colors group"
    >
      {isOpen ? (
        <ChevronDown className="w-4 h-4 text-slate-400" />
      ) : (
        <ChevronRight className="w-4 h-4 text-slate-400" />
      )}
      <Icon className={`w-3.5 h-3.5 ${colorClass}`} />
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {title}
      </span>
      {count !== undefined && count > 0 && (
        <span className="text-xs text-slate-400 ml-1">({count})</span>
      )}
    </button>
  );
}

export default function ClassSummaryCard({
  classSummary,
  isExpanded,
  onToggle,
}: ClassSummaryCardProps) {
  // 섹션별 토글 상태 (기본값: 접힘)
  const [showProgress, setShowProgress] = useState(false);
  const [showCommonWrong, setShowCommonWrong] = useState(false);
  const [showWeakness, setShowWeakness] = useState(false);

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
        <div className="p-5 space-y-3">
          {/* 학생별 진행률 섹션 */}
          <div>
            <SectionToggle
              isOpen={showProgress}
              onToggle={() => setShowProgress(!showProgress)}
              icon={Target}
              title="학생별 진행률"
              count={classSummary.students.length}
              colorClass="text-blue-500"
            />
            {showProgress && (
              <div className="mt-2 space-y-2 pl-6">
                {classSummary.students.map((student) => (
                  <StudentProgressRow
                    key={student.mathflatStudentId}
                    student={student}
                    showWeakConcepts={true}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 공통 오답 섹션 */}
          {classSummary.commonWrongProblems.length > 0 && (
            <div>
              <SectionToggle
                isOpen={showCommonWrong}
                onToggle={() => setShowCommonWrong(!showCommonWrong)}
                icon={AlertTriangle}
                title="공통 오답"
                count={classSummary.commonWrongProblems.length}
                colorClass="text-amber-500"
              />
              {showCommonWrong && (
                <div className="mt-2 pl-6">
                  <CommonWrongTable
                    problems={classSummary.commonWrongProblems}
                    students={classSummary.students}
                    totalStudents={classSummary.totalStudents}
                    classId={classSummary.classId}
                  />
                </div>
              )}
            </div>
          )}

          {/* 취약 유형 섹션 */}
          {classSummary.conceptWeaknesses.length > 0 && (
            <div>
              <SectionToggle
                isOpen={showWeakness}
                onToggle={() => setShowWeakness(!showWeakness)}
                icon={Brain}
                title="취약 유형"
                count={classSummary.conceptWeaknesses.length}
                colorClass="text-red-500"
              />
              {showWeakness && (
                <div className="mt-2 pl-6">
                  <ConceptWeaknessCard
                    weaknesses={classSummary.conceptWeaknesses}
                    totalStudents={classSummary.totalStudents}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
