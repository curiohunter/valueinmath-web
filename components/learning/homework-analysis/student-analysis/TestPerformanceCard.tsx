"use client";

import React, { useState, useEffect } from "react";
import { ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  SOURCE_TYPE_LABELS,
  SOURCE_TYPE_COLORS,
  type SourceType,
} from "@/types/test-log-import";
import {
  type PeriodSelection,
  calculatePeriodDates,
} from "../types";

interface TestPerformanceCardProps {
  studentId: string;
  period: PeriodSelection;
}

interface TestLog {
  id: string;
  date: string;
  test: string | null;
  test_type: string | null;
  test_score: number | null;
  source_type: SourceType;
  source_id: string | null;
  class_name_snapshot: string | null;
}

function getScoreColor(score: number): string {
  if (score >= 90) return "text-emerald-600";
  if (score >= 80) return "text-blue-600";
  if (score >= 70) return "text-amber-600";
  return "text-red-600";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

const MAX_ITEMS = 10;

export default function TestPerformanceCard({
  studentId,
  period,
}: TestPerformanceCardProps) {
  const [logs, setLogs] = useState<TestLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!studentId) return;

    const supabase = createClient();
    const { startDate, endDate } = calculatePeriodDates(period);

    setIsLoading(true);
    supabase
      .from("test_logs")
      .select(
        "id, date, test, test_type, test_score, source_type, source_id, class_name_snapshot"
      )
      .eq("student_id", studentId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("테스트 로그 로드 실패:", error);
          setLogs([]);
        } else {
          setLogs((data as TestLog[]) || []);
        }
        setIsLoading(false);
      });
  }, [studentId, period]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-teal-500" />
          <h3 className="font-bold text-slate-800">테스트 성적</h3>
        </div>
        <div className="py-8 text-center text-slate-400 text-sm">
          로딩 중...
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-teal-500" />
          <h3 className="font-bold text-slate-800">테스트 성적</h3>
        </div>
        <div className="py-8 text-center text-slate-400 text-sm">
          선택한 기간에 테스트 기록이 없습니다
        </div>
      </div>
    );
  }

  const displayLogs = logs.slice(0, MAX_ITEMS);
  const remainingCount = logs.length - MAX_ITEMS;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-teal-500" />
          <h3 className="font-bold text-slate-800">테스트 성적</h3>
        </div>
        <span className="text-xs text-slate-400">{logs.length}건</span>
      </div>
      <div className="divide-y divide-slate-50">
        {displayLogs.map((log) => (
          <div
            key={log.id}
            className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 flex-shrink-0 tabular-nums w-8">
                  {formatDate(log.date)}
                </span>
                <span className="text-sm font-medium text-slate-800 truncate">
                  {log.test || "제목 없음"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 ml-10">
                {log.test_type && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {log.test_type}
                  </span>
                )}
                {log.source_type && log.source_type !== "manual" && (
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full",
                      SOURCE_TYPE_COLORS[log.source_type]
                    )}
                  >
                    {SOURCE_TYPE_LABELS[log.source_type]}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 ml-3">
              {log.test_score != null ? (
                <span
                  className={cn(
                    "text-sm font-bold tabular-nums",
                    getScoreColor(log.test_score)
                  )}
                >
                  {log.test_score}점
                </span>
              ) : (
                <span className="text-sm text-slate-300">-</span>
              )}
            </div>
          </div>
        ))}
      </div>
      {remainingCount > 0 && (
        <div className="px-5 py-2 text-center text-xs text-slate-400 border-t border-slate-100">
          외 {remainingCount}개 테스트
        </div>
      )}
    </div>
  );
}
