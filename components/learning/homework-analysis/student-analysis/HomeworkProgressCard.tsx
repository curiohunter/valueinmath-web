"use client";

import React, { useState } from "react";
import { ClipboardCheck, CheckCircle2, XCircle, ChevronDown } from "lucide-react";
import {
  getCompletionColor,
  getCompletionTextColor,
  getCorrectRateColor,
  getDayOfWeek,
} from "../types";
import { HomeworkProgressItem } from "./useStudentAnalysis";

interface HomeworkProgressCardProps {
  data: HomeworkProgressItem[];
}

const PAGE_SIZE = 4;

export default function HomeworkProgressCard({
  data,
}: HomeworkProgressCardProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardCheck className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-slate-800">숙제 진행률</h3>
        </div>
        <div className="text-center py-8 text-slate-400 text-sm">
          숙제 기록이 없습니다.
        </div>
      </div>
    );
  }

  const visibleData = data.slice(0, visibleCount);
  const hasMore = visibleCount < data.length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <ClipboardCheck className="w-5 h-5 text-indigo-500" />
        <h3 className="font-bold text-slate-800">숙제 진행률</h3>
        <span className="text-xs text-slate-400">{data.length}일</span>
      </div>

      {/* 날짜별 리스트 */}
      <div className="divide-y divide-slate-100">
        {visibleData.map((item) => {
          const dayOfWeek = getDayOfWeek(item.date);
          const dateObj = new Date(item.date);
          const month = dateObj.getMonth() + 1;
          const day = dateObj.getDate();

          return (
            <div
              key={item.date}
              className="px-5 py-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* 날짜 */}
                <div className="w-20 flex-shrink-0">
                  <span className="text-sm font-medium text-slate-800">
                    {month}/{day}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">
                    ({dayOfWeek})
                  </span>
                </div>

                {/* 완료율 게이지 - StudentProgressRow와 동일 */}
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getCompletionColor(item.completionRate)} transition-all duration-300`}
                      style={{
                        width: `${Math.min(item.completionRate, 100)}%`,
                      }}
                    />
                  </div>
                  <span
                    className={`text-sm font-bold w-12 text-right ${getCompletionTextColor(item.completionRate)}`}
                  >
                    {item.completionRate}%
                  </span>
                </div>

                {/* 정답률 */}
                <div className="flex items-center gap-1 w-20 justify-end flex-shrink-0">
                  <span className="text-xs text-slate-400">정답률</span>
                  <span
                    className={`text-sm font-bold ${getCorrectRateColor(item.correctRate)}`}
                  >
                    {item.correctRate}%
                  </span>
                </div>

                {/* 숙제별 상세 배지 - StudentProgressRow와 동일 */}
                <div className="flex gap-1.5 flex-wrap flex-shrink-0">
                  {item.homeworks.map((hw, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                        hw.bookType === "WORKSHEET"
                          ? "bg-purple-50 border border-purple-200"
                          : "bg-white border border-slate-200"
                      }`}
                    >
                      {hw.bookType === "WORKSHEET" && (
                        <span className="text-purple-600 font-medium">
                          학습지
                        </span>
                      )}
                      <span className="text-slate-500 font-mono">
                        {hw.bookType === "WORKSHEET"
                          ? `${hw.solved}/${hw.total}`
                          : `p.${hw.page || "-"}`}
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
            </div>
          );
        })}
      </div>

      {/* 더보기 버튼 */}
      {hasMore && (
        <button
          onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
          className="w-full py-3 flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-t border-slate-100 transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
          <span>더보기 ({data.length - visibleCount}일 남음)</span>
        </button>
      )}
    </div>
  );
}
