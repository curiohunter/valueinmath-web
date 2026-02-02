"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Brain } from "lucide-react";
import { ConceptWeakness } from "./types";

interface ConceptWeaknessCardProps {
  weaknesses: ConceptWeakness[];
  totalStudents: number;
}

export default function ConceptWeaknessCard({
  weaknesses,
  totalStudents,
}: ConceptWeaknessCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (weaknesses.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-slate-100 pt-4 mt-4">
      {/* 토글 헤더 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left hover:bg-slate-50 rounded-lg p-2 -mx-2 transition-colors"
      >
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Brain className="w-3.5 h-3.5 text-purple-500" />
          개념별 약점 분석 ({weaknesses.length}개)
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {isExpanded ? "접기" : "펼치기"}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* 펼쳐진 내용 */}
      {isExpanded && (
        <div className="mt-3 space-y-2">
          {weaknesses.map((weakness, idx) => {
            const ratio = totalStudents > 0
              ? Math.round((weakness.wrongCount / totalStudents) * 100)
              : 0;

            return (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg bg-purple-50/50 border border-purple-100"
              >
                {/* 오답 수 */}
                <div className="flex-shrink-0">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                      ratio >= 50
                        ? "bg-purple-600 text-white"
                        : "bg-purple-200 text-purple-700"
                    }`}
                  >
                    {weakness.wrongCount}명
                  </div>
                </div>

                {/* 개념 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 text-sm">
                    {weakness.conceptName}
                  </div>

                  {/* 틀린 학생 */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {weakness.wrongStudents.map((name) => (
                      <span
                        key={name}
                        className="px-1.5 py-0.5 bg-white text-slate-600 rounded text-xs border border-slate-200"
                      >
                        {name}
                      </span>
                    ))}
                  </div>

                  {/* 관련 문제 */}
                  {weakness.relatedProblems.length > 0 && (
                    <div className="mt-2 text-xs text-slate-500">
                      <span className="font-medium">관련 문제:</span>{" "}
                      {weakness.relatedProblems
                        .slice(0, 5)
                        .map((p, i) => (
                          <span key={i}>
                            {i > 0 && ", "}
                            {p.page ? `p.${p.page}` : ""} {p.problemNumber || ""}
                          </span>
                        ))}
                      {weakness.relatedProblems.length > 5 && (
                        <span> 외 {weakness.relatedProblems.length - 5}개</span>
                      )}
                    </div>
                  )}
                </div>

                {/* 비율 표시 */}
                <div className="flex-shrink-0 text-right">
                  <div className="text-sm font-bold text-purple-700">
                    {ratio}%
                  </div>
                  <div className="text-xs text-slate-400">
                    오답률
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
