"use client";

import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  StudentLearingSummary,
  getCompletionColor,
  getCompletionTextColor,
  getCorrectRateColor,
} from "./types";

interface StudentProgressRowProps {
  student: StudentLearingSummary;
  showWeakConcepts?: boolean;
}

export default function StudentProgressRow({
  student,
  showWeakConcepts = true,
}: StudentProgressRowProps) {
  const hasHomework = student.homeworks.length > 0;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
      {/* 메인 행 */}
      <div className="flex items-center gap-3">
        {/* 학생 이름 */}
        <div className="w-20 font-medium text-slate-800 text-sm">
          {student.studentName}
        </div>

        {/* 숙제 완료율 게이지 */}
        {hasHomework ? (
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${getCompletionColor(student.totalCompletionRate)} transition-all duration-300`}
                style={{ width: `${student.totalCompletionRate}%` }}
              ></div>
            </div>
            <span
              className={`text-sm font-bold w-12 text-right ${getCompletionTextColor(student.totalCompletionRate)}`}
            >
              {student.totalCompletionRate}%
            </span>
          </div>
        ) : (
          <div className="flex-1 flex items-center">
            <span className="text-xs text-slate-400">숙제 없음</span>
          </div>
        )}

        {/* 정답률 */}
        <div className="flex items-center gap-1 w-20 justify-end">
          <span className="text-xs text-slate-400">정답률</span>
          <span
            className={`text-sm font-bold ${getCorrectRateColor(student.totalCorrectRate)}`}
          >
            {student.totalCorrectRate}%
          </span>
        </div>

        {/* 숙제별 상세 */}
        <div className="flex gap-1.5 flex-wrap">
          {student.homeworks.map((hw, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-slate-200 text-xs"
            >
              <span className="text-slate-500 font-mono">
                p.{hw.page || "-"}
              </span>
              <div className="flex items-center gap-0.5 text-emerald-600">
                <CheckCircle2 className="w-3 h-3" />
                <span className="font-semibold">{hw.correct}</span>
              </div>
              <div className="flex items-center gap-0.5 text-red-600">
                <XCircle className="w-3 h-3" />
                <span className="font-semibold">{hw.wrong}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 취약 개념 */}
      {showWeakConcepts && student.weakConcepts.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pl-20">
          {student.weakConcepts.slice(0, 3).map((concept, idx) => (
            <span
              key={idx}
              className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded text-xs border border-red-200"
            >
              {concept}
            </span>
          ))}
          {student.weakConcepts.length > 3 && (
            <span className="text-xs text-slate-400">
              +{student.weakConcepts.length - 3}개
            </span>
          )}
        </div>
      )}
    </div>
  );
}
