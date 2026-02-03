"use client";

import React, { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { GrowthDataPoint } from "./useStudentAnalysis";

interface GrowthTrendChartProps {
  data: GrowthDataPoint[];
}

export default function GrowthTrendChart({ data }: GrowthTrendChartProps) {
  // 추세 계산
  const trend = useMemo(() => {
    if (data.length < 2) return { direction: "stable" as const, diff: 0 };

    const recent = data.slice(-2);
    const diff = recent[1].correctRate - recent[0].correctRate;

    if (diff > 3) return { direction: "up" as const, diff };
    if (diff < -3) return { direction: "down" as const, diff };
    return { direction: "stable" as const, diff };
  }, [data]);

  // 차트 계산
  const chartData = useMemo(() => {
    if (data.length === 0) return { maxRate: 100, maxProblems: 1, points: [] };

    const maxRate = Math.max(...data.map((d) => d.correctRate), 50);
    const maxProblems = Math.max(...data.map((d) => d.totalProblems), 1);

    const points = data.map((d, idx) => ({
      ...d,
      rateY: 100 - (d.correctRate / maxRate) * 100,
      problemsY: 100 - (d.totalProblems / maxProblems) * 100,
      x: (idx / Math.max(data.length - 1, 1)) * 100,
    }));

    return { maxRate, maxProblems, points };
  }, [data]);

  // 현재 값
  const currentStats = useMemo(() => {
    if (data.length === 0) return { correctRate: 0, totalProblems: 0 };
    const last = data[data.length - 1];
    return { correctRate: last.correctRate, totalProblems: last.totalProblems };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <h3 className="font-bold text-slate-800">성장 추이</h3>
        </div>
        <div className="text-center py-8 text-slate-400">분석할 데이터가 없습니다.</div>
      </div>
    );
  }

  // SVG 라인 경로 생성
  const rateLinePath = chartData.points
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.rateY}`)
    .join(" ");

  const problemsLinePath = chartData.points
    .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x} ${p.problemsY}`)
    .join(" ");

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* 헤더 */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <h3 className="font-bold text-slate-800">성장 추이</h3>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-emerald-500 rounded" />
            <span className="text-slate-500">정답률</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-blue-400 rounded" />
            <span className="text-slate-500">풀이량</span>
          </div>
        </div>
      </div>

      <div className="p-5">
        {/* 현재 상태 요약 */}
        <div className="flex items-center gap-6 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-emerald-600">{currentStats.correctRate}%</span>
            <span className="text-sm text-slate-500">정답률</span>
            {trend.direction === "up" && (
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            )}
            {trend.direction === "down" && (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            {trend.direction === "stable" && (
              <Minus className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">{currentStats.totalProblems}</span>
            <span className="text-sm text-slate-500">문제/주</span>
          </div>
        </div>

        {/* 차트 */}
        <div className="relative h-40">
          {/* Y축 가이드라인 */}
          <div className="absolute inset-0 flex flex-col justify-between">
            {[0, 25, 50, 75, 100].map((v) => (
              <div
                key={v}
                className="border-t border-slate-100"
                style={{ marginTop: v === 0 ? 0 : undefined }}
              />
            ))}
          </div>

          {/* SVG 차트 */}
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {/* 정답률 라인 */}
            <path
              d={rateLinePath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            {/* 풀이량 라인 */}
            <path
              d={problemsLinePath}
              fill="none"
              stroke="#60a5fa"
              strokeWidth="2"
              strokeDasharray="4 2"
              vectorEffect="non-scaling-stroke"
            />
            {/* 정답률 점 */}
            {chartData.points.map((p, idx) => (
              <circle
                key={`rate-${idx}`}
                cx={p.x}
                cy={p.rateY}
                r="3"
                fill="#10b981"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        </div>

        {/* X축 레이블 */}
        <div className="flex justify-between mt-2">
          {chartData.points.map((p, idx) => (
            <div
              key={idx}
              className="text-xs text-slate-400 text-center"
              style={{ width: `${100 / chartData.points.length}%` }}
            >
              {p.weekLabel}
            </div>
          ))}
        </div>

        {/* 추세 메시지 */}
        {trend.direction !== "stable" && (
          <div
            className={cn(
              "mt-4 px-4 py-2 rounded-lg text-sm",
              trend.direction === "up"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            )}
          >
            {trend.direction === "up"
              ? `최근 정답률이 ${Math.abs(trend.diff)}%p 상승했습니다. 좋은 추세입니다!`
              : `최근 정답률이 ${Math.abs(trend.diff)}%p 하락했습니다. 추가 학습이 필요합니다.`}
          </div>
        )}
      </div>
    </div>
  );
}
