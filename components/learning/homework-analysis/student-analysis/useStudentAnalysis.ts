"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChapterSelection, PeriodSelection, calculatePeriodDates } from "../types";

// 분석 결과 타입
export interface AnalysisOverviewData {
  totalProblems: number;
  correctCount: number;
  wrongCount: number;
  correctRate: number;
  weakConceptCount: number;
}

export interface ChapterAnalysisData {
  littleChapter: string;
  middleChapter: string;
  bigChapter: string;
  totalProblems: number;
  correctCount: number;
  correctRate: number;
  status: "good" | "warning" | "critical";
}

export interface WeakConceptData {
  conceptId: string;
  conceptName: string;
  littleChapter: string;
  totalProblems: number;
  correctCount: number;
  correctRate: number;
}

// Phase 3 타입
export interface PatternData {
  byDayOfWeek: Record<string, { total: number; correct: number }>;
  byLevel: Record<number, { total: number; correct: number }>;
  byCategory: Record<string, number>;
}

export interface GrowthDataPoint {
  weekLabel: string;
  startDate: string;
  endDate: string;
  totalProblems: number;
  correctCount: number;
  correctRate: number;
}

export interface StudentAnalysisResult {
  overview: AnalysisOverviewData;
  chapterAnalysis: ChapterAnalysisData[];
  weakConcepts: WeakConceptData[];
  patterns: PatternData;
  growthTrend: GrowthDataPoint[];
  isLoading: boolean;
  error: string | null;
}

interface UseStudentAnalysisParams {
  mathflatStudentId: string | null;
  chapterSelection: ChapterSelection;
  period: PeriodSelection;
}

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

export function useStudentAnalysis({
  mathflatStudentId,
  chapterSelection,
  period,
}: UseStudentAnalysisParams): StudentAnalysisResult {
  const supabase = createClient();

  const [overview, setOverview] = useState<AnalysisOverviewData>({
    totalProblems: 0,
    correctCount: 0,
    wrongCount: 0,
    correctRate: 0,
    weakConceptCount: 0,
  });
  const [chapterAnalysis, setChapterAnalysis] = useState<ChapterAnalysisData[]>([]);
  const [weakConcepts, setWeakConcepts] = useState<WeakConceptData[]>([]);
  const [patterns, setPatterns] = useState<PatternData>({
    byDayOfWeek: {},
    byLevel: {},
    byCategory: {},
  });
  const [growthTrend, setGrowthTrend] = useState<GrowthDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysisData = useCallback(async () => {
    if (
      !mathflatStudentId ||
      !chapterSelection.curriculum ||
      chapterSelection.bigChapters.length === 0
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { startDate, endDate } = calculatePeriodDates(period);

      // 1. 선택된 단원에 해당하는 concept_id 목록 가져오기
      let conceptQuery = supabase
        .from("mathflat_concepts")
        .select("concept_id, concept_name, big_chapter, middle_chapter, little_chapter")
        .eq("curriculum_key", chapterSelection.curriculum)
        .in("big_chapter", chapterSelection.bigChapters);

      if (chapterSelection.middleChapters.length > 0) {
        conceptQuery = conceptQuery.in("middle_chapter", chapterSelection.middleChapters);
      }
      if (chapterSelection.littleChapters.length > 0) {
        conceptQuery = conceptQuery.in("little_chapter", chapterSelection.littleChapters);
      }

      const { data: conceptsData, error: conceptsError } = await conceptQuery;
      if (conceptsError) throw conceptsError;

      if (!conceptsData || conceptsData.length === 0) {
        resetState();
        return;
      }

      const conceptIds = conceptsData.map((c) => c.concept_id.toString());
      const conceptMap = new Map(
        conceptsData.map((c) => [
          c.concept_id.toString(),
          {
            name: c.concept_name,
            bigChapter: c.big_chapter,
            middleChapter: c.middle_chapter,
            littleChapter: c.little_chapter,
          },
        ])
      );

      // 2. 해당 기간의 숙제 데이터 가져오기 (날짜 포함)
      const { data: homeworkData, error: homeworkError } = await supabase
        .from("mathflat_homework")
        .select("id, homework_date")
        .eq("mathflat_student_id", mathflatStudentId)
        .gte("homework_date", startDate)
        .lte("homework_date", endDate);

      if (homeworkError) throw homeworkError;

      if (!homeworkData || homeworkData.length === 0) {
        resetState();
        return;
      }

      const homeworkMap = new Map(homeworkData.map((h) => [h.id, h.homework_date]));
      const homeworkIds = homeworkData.map((h) => h.id);

      // 3. 문제 결과 가져오기 (level 포함)
      const batchSize = 100;
      let allResults: any[] = [];

      for (let i = 0; i < homeworkIds.length; i += batchSize) {
        const batchIds = homeworkIds.slice(i, i + batchSize);
        const { data: resultsData, error: resultsError } = await supabase
          .from("mathflat_problem_results")
          .select("homework_id, concept_id, result, level")
          .in("homework_id", batchIds)
          .in("concept_id", conceptIds)
          .in("result", ["CORRECT", "WRONG"]);

        if (resultsError) throw resultsError;
        if (resultsData) allResults = allResults.concat(resultsData);
      }

      // 4. daily_work 데이터 가져오기 (카테고리 통계용)
      const { data: dailyWorkData } = await supabase
        .from("mathflat_daily_work")
        .select("category, assigned_count")
        .eq("mathflat_student_id", mathflatStudentId)
        .gte("work_date", startDate)
        .lte("work_date", endDate);

      // 5. 통계 계산
      const totalProblems = allResults.length;
      const correctCount = allResults.filter((r) => r.result === "CORRECT").length;
      const wrongCount = allResults.filter((r) => r.result === "WRONG").length;
      const correctRate = totalProblems > 0 ? Math.round((correctCount / totalProblems) * 100) : 0;

      // 개념별 통계
      const conceptStats = new Map<string, { total: number; correct: number; conceptInfo: any }>();
      allResults.forEach((r) => {
        const conceptInfo = conceptMap.get(r.concept_id);
        if (!conceptInfo) return;
        const stats = conceptStats.get(r.concept_id) || { total: 0, correct: 0, conceptInfo };
        stats.total++;
        if (r.result === "CORRECT") stats.correct++;
        conceptStats.set(r.concept_id, stats);
      });

      // 취약 개념
      const weakConceptsList: WeakConceptData[] = [];
      conceptStats.forEach((stats, conceptId) => {
        const rate = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
        if (rate < 50 && stats.total >= 2) {
          weakConceptsList.push({
            conceptId,
            conceptName: stats.conceptInfo.name,
            littleChapter: stats.conceptInfo.littleChapter || "",
            totalProblems: stats.total,
            correctCount: stats.correct,
            correctRate: rate,
          });
        }
      });
      weakConceptsList.sort((a, b) => a.correctRate - b.correctRate);

      // 소단원별 통계
      const chapterStats = new Map<string, { total: number; correct: number; middleChapter: string; bigChapter: string }>();
      allResults.forEach((r) => {
        const conceptInfo = conceptMap.get(r.concept_id);
        if (!conceptInfo || !conceptInfo.littleChapter) return;
        const key = conceptInfo.littleChapter;
        const stats = chapterStats.get(key) || {
          total: 0,
          correct: 0,
          middleChapter: conceptInfo.middleChapter || "",
          bigChapter: conceptInfo.bigChapter || "",
        };
        stats.total++;
        if (r.result === "CORRECT") stats.correct++;
        chapterStats.set(key, stats);
      });

      const chapterAnalysisList: ChapterAnalysisData[] = [];
      chapterStats.forEach((stats, littleChapter) => {
        const rate = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
        let status: "good" | "warning" | "critical" = "good";
        if (rate < 50) status = "critical";
        else if (rate < 70) status = "warning";
        chapterAnalysisList.push({
          littleChapter,
          middleChapter: stats.middleChapter,
          bigChapter: stats.bigChapter,
          totalProblems: stats.total,
          correctCount: stats.correct,
          correctRate: rate,
          status,
        });
      });
      chapterAnalysisList.sort((a, b) => a.correctRate - b.correctRate);

      // === Phase 3: 패턴 분석 ===
      // 요일별 통계
      const byDayOfWeek: Record<string, { total: number; correct: number }> = {};
      DAY_NAMES.forEach((day) => {
        byDayOfWeek[day] = { total: 0, correct: 0 };
      });

      allResults.forEach((r) => {
        const hwDate = homeworkMap.get(r.homework_id);
        if (!hwDate) return;
        const dayIndex = new Date(hwDate).getDay();
        const dayName = DAY_NAMES[dayIndex];
        byDayOfWeek[dayName].total++;
        if (r.result === "CORRECT") byDayOfWeek[dayName].correct++;
      });

      // 난이도별 통계
      const byLevel: Record<number, { total: number; correct: number }> = {};
      for (let lv = 1; lv <= 5; lv++) {
        byLevel[lv] = { total: 0, correct: 0 };
      }

      allResults.forEach((r) => {
        const level = r.level || 3; // 기본 레벨 3
        if (level >= 1 && level <= 5) {
          byLevel[level].total++;
          if (r.result === "CORRECT") byLevel[level].correct++;
        }
      });

      // 카테고리별 통계 (daily_work 기반)
      const byCategory: Record<string, number> = {
        CUSTOM: 0,
        CHALLENGE: 0,
        CHALLENGE_WRONG: 0,
      };

      (dailyWorkData || []).forEach((dw) => {
        const cat = dw.category || "CUSTOM";
        byCategory[cat] = (byCategory[cat] || 0) + (dw.assigned_count || 0);
      });

      // === Phase 3: 성장 추이 (주간) ===
      const growthData: GrowthDataPoint[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      // 주 단위로 그룹화
      const weekMap = new Map<string, { total: number; correct: number; startDate: string; endDate: string }>();

      allResults.forEach((r) => {
        const hwDate = homeworkMap.get(r.homework_id);
        if (!hwDate) return;

        const date = new Date(hwDate);
        // 해당 주의 월요일 찾기
        const dayOfWeek = date.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(date);
        monday.setDate(date.getDate() + mondayOffset);
        const weekKey = monday.toISOString().split("T")[0];

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const weekData = weekMap.get(weekKey) || {
          total: 0,
          correct: 0,
          startDate: weekKey,
          endDate: sunday.toISOString().split("T")[0],
        };
        weekData.total++;
        if (r.result === "CORRECT") weekData.correct++;
        weekMap.set(weekKey, weekData);
      });

      // 주간 데이터 정렬
      const sortedWeeks = Array.from(weekMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-8); // 최근 8주

      sortedWeeks.forEach(([weekKey, data], idx) => {
        const weekStart = new Date(weekKey);
        const month = weekStart.getMonth() + 1;
        const day = weekStart.getDate();

        growthData.push({
          weekLabel: `${month}/${day}`,
          startDate: data.startDate,
          endDate: data.endDate,
          totalProblems: data.total,
          correctCount: data.correct,
          correctRate: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        });
      });

      // 6. 상태 업데이트
      setOverview({
        totalProblems,
        correctCount,
        wrongCount,
        correctRate,
        weakConceptCount: weakConceptsList.length,
      });
      setChapterAnalysis(chapterAnalysisList);
      setWeakConcepts(weakConceptsList.slice(0, 10));
      setPatterns({ byDayOfWeek, byLevel, byCategory });
      setGrowthTrend(growthData);
    } catch (err) {
      console.error("분석 데이터 로드 실패:", err);
      setError("분석 데이터를 불러오는 데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [mathflatStudentId, chapterSelection, period, supabase]);

  const resetState = () => {
    setOverview({
      totalProblems: 0,
      correctCount: 0,
      wrongCount: 0,
      correctRate: 0,
      weakConceptCount: 0,
    });
    setChapterAnalysis([]);
    setWeakConcepts([]);
    setPatterns({ byDayOfWeek: {}, byLevel: {}, byCategory: {} });
    setGrowthTrend([]);
  };

  useEffect(() => {
    fetchAnalysisData();
  }, [fetchAnalysisData]);

  return {
    overview,
    chapterAnalysis,
    weakConcepts,
    patterns,
    growthTrend,
    isLoading,
    error,
  };
}
