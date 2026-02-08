"use client";

import React, { useState } from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronRight, BookOpen, FileText } from "lucide-react";
import {
  StudentLearingSummary,
  StudentWrongProblem,
  getCompletionColor,
  getCompletionTextColor,
  getCorrectRateColor,
} from "./types";

interface StudentProgressRowProps {
  student: StudentLearingSummary;
}

export default function StudentProgressRow({
  student,
}: StudentProgressRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasHomework = student.homeworks.length > 0;
  const hasWrongProblems = student.wrongProblems && student.wrongProblems.length > 0;

  // 오답을 WORKBOOK/WORKSHEET로 그룹화
  const workbookWrongProblems = student.wrongProblems?.filter(p => p.bookType === 'WORKBOOK') || [];
  const worksheetWrongProblems = student.wrongProblems?.filter(p => p.bookType === 'WORKSHEET') || [];

  // WORKBOOK을 bookTitle별로 그룹화
  const workbookByTitle = workbookWrongProblems.reduce((acc, p) => {
    const title = p.bookTitle || '기타';
    if (!acc[title]) acc[title] = [];
    acc[title].push(p);
    return acc;
  }, {} as Record<string, StudentWrongProblem[]>);

  // WORKSHEET를 bookTitle별로 그룹화
  const worksheetByTitle = worksheetWrongProblems.reduce((acc, p) => {
    const title = p.bookTitle || '기타';
    if (!acc[title]) acc[title] = [];
    acc[title].push(p);
    return acc;
  }, {} as Record<string, StudentWrongProblem[]>);

  return (
    <div className="rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors overflow-hidden">
      {/* 메인 행 (클릭 가능) */}
      <button
        onClick={() => hasWrongProblems && setIsExpanded(!isExpanded)}
        className={`w-full flex flex-col gap-2 p-3 text-left ${hasWrongProblems ? 'cursor-pointer' : 'cursor-default'}`}
        disabled={!hasWrongProblems}
      >
        <div className="flex items-center gap-3">
          {/* 펼침 아이콘 */}
          <div className="w-4 flex-shrink-0">
            {hasWrongProblems ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )
            ) : (
              <div className="w-4" />
            )}
          </div>

          {/* 학생 이름 */}
          <div className="w-16 font-medium text-slate-800 text-sm flex-shrink-0">
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
          <div className="flex items-center gap-1 w-20 justify-end flex-shrink-0">
            <span className="text-xs text-slate-400">정답률</span>
            <span
              className={`text-sm font-bold ${getCorrectRateColor(student.totalCorrectRate)}`}
            >
              {student.totalCorrectRate}%
            </span>
          </div>

          {/* 숙제별 상세 */}
          <div className="flex gap-1.5 flex-wrap flex-shrink-0">
            {student.homeworks.map((hw, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                  hw.bookType === 'WORKSHEET'
                    ? 'bg-purple-50 border border-purple-200'
                    : 'bg-white border border-slate-200'
                }`}
              >
                {hw.bookType === 'WORKSHEET' && (
                  <span className="text-purple-600 font-medium">학습지</span>
                )}
                <span className="text-slate-500 font-mono">
                  {hw.bookType === 'WORKSHEET' ? `${hw.solved}/${hw.total}` : `p.${hw.page || "-"}`}
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

      </button>

      {/* 상세 오답 섹션 */}
      {isExpanded && hasWrongProblems && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-200 bg-white">
          <div className="space-y-4">
            {/* WORKBOOK 오답 */}
            {workbookWrongProblems.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-semibold text-slate-700">
                    교재 오답 ({workbookWrongProblems.length}개)
                  </span>
                </div>
                <div className="space-y-3 pl-6">
                  {Object.entries(workbookByTitle).map(([title, problems]) => {
                    // 페이지 범위 (숙제 단위이므로 중복 제거)
                    const pages = [...new Set(problems.map(p => p.page).filter(Boolean))];
                    const pageRange = pages.length > 0 ? pages.join(', ') : null;

                    return (
                      <div key={title} className="space-y-1.5">
                        <div className="text-xs font-medium text-slate-700">
                          {title}
                          {pageRange && (
                            <span className="text-slate-500 font-mono ml-1.5">(p.{pageRange})</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {problems.map((p, idx) => (
                            <div
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-xs"
                            >
                              <span className="text-slate-600">
                                {p.problemTitle && p.problemNumber
                                  ? `${p.problemTitle} > ${p.problemNumber}`
                                  : p.problemNumber || p.problemTitle || '-'}
                              </span>
                              {p.conceptName && (
                                <span className="text-red-600 text-[10px]">[{p.conceptName}]</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* WORKSHEET 오답 */}
            {worksheetWrongProblems.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-semibold text-slate-700">
                    학습지 오답 ({worksheetWrongProblems.length}개)
                  </span>
                </div>
                <div className="space-y-2 pl-6">
                  {Object.entries(worksheetByTitle).map(([title, problems]) => (
                    <div key={title} className="space-y-1">
                      <div className="text-xs font-medium text-purple-600">{title}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {problems.map((p, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-50 border border-purple-200 rounded text-xs"
                          >
                            {p.problemNumber && (
                              <span className="text-purple-700 font-medium">{p.problemNumber}</span>
                            )}
                            {p.conceptName && (
                              <span className="text-red-600 text-[10px]">[{p.conceptName}]</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
