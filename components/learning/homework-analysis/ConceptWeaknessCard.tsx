"use client";

import React from "react";
import { ConceptWeakness } from "./types";

interface ConceptWeaknessCardProps {
  weaknesses: ConceptWeakness[];
  totalStudents: number;
}

export default function ConceptWeaknessCard({
  weaknesses,
  totalStudents,
}: ConceptWeaknessCardProps) {
  if (weaknesses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
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
  );
}
