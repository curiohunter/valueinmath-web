"use client";

import React from "react";
import { Sparkles, Target, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { SelfStudyAnalysis } from "./useStudentAnalysis";

interface SelfStudyAnalysisCardProps {
  data: SelfStudyAnalysis;
}

function getRateColor(rate: number): string {
  if (rate >= 85) return "text-emerald-600";
  if (rate >= 70) return "text-blue-600";
  if (rate >= 50) return "text-amber-600";
  return "text-red-600";
}

export default function SelfStudyAnalysisCard({ data }: SelfStudyAnalysisCardProps) {
  const hasData = data.totalSelfStudy > 0;

  if (!hasData) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h3 className="font-bold text-slate-800">자율학습 분석</h3>
        </div>
        <div className="text-center py-8 text-slate-400">자율학습 기록이 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h3 className="font-bold text-slate-800">자율학습 분석</h3>
        </div>
        <span className="text-xs text-slate-400">총 {data.totalSelfStudy}문제</span>
      </div>

      <div className="p-5 grid grid-cols-2 gap-4">
        {/* AI 추천 챌린지 */}
        <div className="rounded-xl bg-purple-50 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Target className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium text-purple-700">AI 추천 챌린지</span>
          </div>
          <div className="text-2xl font-bold text-slate-800 tabular-nums">
            {data.challengeProblems}<span className="text-sm font-normal text-slate-500 ml-0.5">문제</span>
          </div>
          {data.challengeProblems > 0 && (
            <div className={cn("text-sm font-semibold tabular-nums mt-1", getRateColor(data.challengeCorrectRate))}>
              정답률 {data.challengeCorrectRate}%
            </div>
          )}
        </div>

        {/* 오답 재풀이 */}
        <div className="rounded-xl bg-orange-50 p-4">
          <div className="flex items-center gap-1.5 mb-3">
            <RotateCcw className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-medium text-orange-700">오답 재풀이</span>
          </div>
          <div className="text-2xl font-bold text-slate-800 tabular-nums">
            {data.challengeWrongProblems}<span className="text-sm font-normal text-slate-500 ml-0.5">문제</span>
          </div>
          {data.challengeWrongProblems > 0 && (
            <div className={cn("text-sm font-semibold tabular-nums mt-1", getRateColor(data.challengeWrongCorrectRate))}>
              정답률 {data.challengeWrongCorrectRate}%
            </div>
          )}
        </div>
      </div>

      {/* 피드백 메시지 */}
      {data.challengeWrongProblems > 0 && data.challengeWrongCorrectRate >= 70 && (
        <div className="mx-5 mb-4 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm">
          오답 재풀이 정답률이 우수합니다! 복습 효과가 높습니다.
        </div>
      )}
      {data.challengeWrongProblems > 0 && data.challengeWrongCorrectRate < 50 && (
        <div className="mx-5 mb-4 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm">
          오답 재풀이에서 같은 문제를 반복 틀리고 있습니다. 개념 복습이 필요합니다.
        </div>
      )}
    </div>
  );
}
