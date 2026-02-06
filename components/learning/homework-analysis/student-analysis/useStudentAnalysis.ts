"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ChapterSelection, PeriodSelection, calculatePeriodDates } from "../types";

// ==========================================
// 기본 분석 (daily_work 기반, 항상 표시)
// ==========================================

export interface ActivitySummary {
  totalProblems: number;
  totalDays: number;
  dailyAverage: number;
  homeworkProblems: number;   // CUSTOM
  selfStudyProblems: number;  // CHALLENGE + CHALLENGE_WRONG
  homeworkRatio: number;      // 숙제 비율 (%)
  overallCorrectRate: number;
}

export interface MaterialPerformance {
  title: string;
  workType: string;
  category: string;
  totalProblems: number;
  correctCount: number;
  correctRate: number;
  isHomework: boolean;
}

export interface SelfStudyAnalysis {
  challengeProblems: number;
  challengeCorrectRate: number;
  challengeWrongProblems: number;
  challengeWrongCorrectRate: number;
  totalSelfStudy: number;
}

export interface GrowthDataPoint {
  weekLabel: string;
  startDate: string;
  endDate: string;
  totalProblems: number;
  correctCount: number;
  correctRate: number;
}

// ==========================================
// 심화 분석 (problem_results 기반, 단원 선택시)
// ==========================================

export interface DifficultyBreakdown {
  level: number;
  label: string;
  total: number;
  correct: number;
  correctRate: number;
}

export interface WeakConceptData {
  conceptId: string;
  conceptName: string;
  littleChapter: string;
  totalProblems: number;
  correctCount: number;
  correctRate: number;
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

// ==========================================
// 통합 결과
// ==========================================

export interface StudentAnalysisResult {
  // 기본 분석 (항상)
  activitySummary: ActivitySummary;
  materialPerformance: MaterialPerformance[];
  selfStudyAnalysis: SelfStudyAnalysis;
  growthTrend: GrowthDataPoint[];

  // 심화 분석 (단원 선택시)
  difficultyBreakdown: DifficultyBreakdown[];
  weakConcepts: WeakConceptData[];
  chapterAnalysis: ChapterAnalysisData[];

  // 상태
  isLoading: boolean;
  error: string | null;
  hasChapterAnalysis: boolean;
}

// 하위 호환을 위한 legacy 타입 export
export interface AnalysisOverviewData {
  totalProblems: number;
  correctCount: number;
  wrongCount: number;
  correctRate: number;
  weakConceptCount: number;
}

export interface PatternData {
  byDayOfWeek: Record<string, { total: number; correct: number }>;
  byLevel: Record<number, { total: number; correct: number }>;
  byCategory: Record<string, number>;
}

interface UseStudentAnalysisParams {
  mathflatStudentId: string | null;
  chapterSelection: ChapterSelection;
  period: PeriodSelection;
}

const LEVEL_LABELS: Record<number, string> = {
  1: "Lv1 기본",
  2: "Lv2 표준",
  3: "Lv3 발전",
  4: "Lv4 심화",
  5: "Lv5 최고",
};

export function useStudentAnalysis({
  mathflatStudentId,
  chapterSelection,
  period,
}: UseStudentAnalysisParams): StudentAnalysisResult {
  const supabase = createClient();

  const [activitySummary, setActivitySummary] = useState<ActivitySummary>({
    totalProblems: 0,
    totalDays: 0,
    dailyAverage: 0,
    homeworkProblems: 0,
    selfStudyProblems: 0,
    homeworkRatio: 0,
    overallCorrectRate: 0,
  });
  const [materialPerformance, setMaterialPerformance] = useState<MaterialPerformance[]>([]);
  const [selfStudyAnalysis, setSelfStudyAnalysis] = useState<SelfStudyAnalysis>({
    challengeProblems: 0,
    challengeCorrectRate: 0,
    challengeWrongProblems: 0,
    challengeWrongCorrectRate: 0,
    totalSelfStudy: 0,
  });
  const [growthTrend, setGrowthTrend] = useState<GrowthDataPoint[]>([]);
  const [difficultyBreakdown, setDifficultyBreakdown] = useState<DifficultyBreakdown[]>([]);
  const [weakConcepts, setWeakConcepts] = useState<WeakConceptData[]>([]);
  const [chapterAnalysis, setChapterAnalysis] = useState<ChapterAnalysisData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChapterSelection =
    chapterSelection.curriculum !== null &&
    chapterSelection.bigChapters.length > 0;

  // Step 1: 기본 분석 (daily_work 기반)
  const fetchBasicAnalysis = useCallback(async () => {
    if (!mathflatStudentId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { startDate, endDate } = calculatePeriodDates(period);

      const { data: dailyWorkData, error: dwError } = await supabase
        .from("mathflat_daily_work")
        .select("id, work_date, work_type, category, title, assigned_count, correct_count, wrong_count, correct_rate")
        .eq("mathflat_student_id", mathflatStudentId)
        .gte("work_date", startDate)
        .lte("work_date", endDate)
        .order("work_date", { ascending: false });

      if (dwError) throw dwError;
      if (!dailyWorkData || dailyWorkData.length === 0) {
        resetState();
        return;
      }

      // 학습 활동 요약
      const totalProblems = dailyWorkData.reduce((sum, dw) => sum + (dw.assigned_count || 0), 0);
      const totalCorrect = dailyWorkData.reduce((sum, dw) => sum + (dw.correct_count || 0), 0);
      const uniqueDays = new Set(dailyWorkData.map((dw) => dw.work_date)).size;
      const homeworkProblems = dailyWorkData
        .filter((dw) => dw.category === "CUSTOM")
        .reduce((sum, dw) => sum + (dw.assigned_count || 0), 0);
      const selfStudyProblems = dailyWorkData
        .filter((dw) => dw.category === "CHALLENGE" || dw.category === "CHALLENGE_WRONG")
        .reduce((sum, dw) => sum + (dw.assigned_count || 0), 0);

      setActivitySummary({
        totalProblems,
        totalDays: uniqueDays,
        dailyAverage: uniqueDays > 0 ? Math.round(totalProblems / uniqueDays) : 0,
        homeworkProblems,
        selfStudyProblems,
        homeworkRatio: totalProblems > 0 ? Math.round((homeworkProblems / totalProblems) * 100) : 0,
        overallCorrectRate: totalProblems > 0 ? Math.round((totalCorrect / totalProblems) * 100) : 0,
      });

      // 숙제 매핑 조회 (실제 숙제인 daily_work 판별)
      const dailyWorkIds = dailyWorkData.map((dw) => dw.id);
      const homeworkLinkedIds = new Set<string>();

      if (dailyWorkIds.length > 0) {
        const batchSize = 200;
        for (let i = 0; i < dailyWorkIds.length; i += batchSize) {
          const batch = dailyWorkIds.slice(i, i + batchSize);
          const { data: hwMappings } = await supabase
            .from("mathflat_daily_work_homework")
            .select("daily_work_id")
            .in("daily_work_id", batch);
          if (hwMappings) {
            hwMappings.forEach((m) => homeworkLinkedIds.add(m.daily_work_id));
          }
        }
      }

      // 교재/학습지 성적 (CHALLENGE, CHALLENGE_WRONG 제외 → 자율학습 카드에서 표시)
      const customWork = dailyWorkData.filter((dw) => dw.category === "CUSTOM");
      const titleMap = new Map<string, { workType: string; category: string; total: number; correct: number; isHomework: boolean }>();
      customWork.forEach((dw) => {
        const key = dw.title || "(제목 없음)";
        const existing = titleMap.get(key) || {
          workType: dw.work_type,
          category: dw.category,
          total: 0,
          correct: 0,
          isHomework: false,
        };
        existing.total += dw.assigned_count || 0;
        existing.correct += dw.correct_count || 0;
        if (homeworkLinkedIds.has(dw.id)) {
          existing.isHomework = true;
        }
        titleMap.set(key, existing);
      });

      const materialList: MaterialPerformance[] = Array.from(titleMap.entries())
        .map(([title, stats]) => ({
          title,
          workType: stats.workType,
          category: stats.category,
          totalProblems: stats.total,
          correctCount: stats.correct,
          correctRate: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
          isHomework: stats.isHomework,
        }))
        .sort((a, b) => b.totalProblems - a.totalProblems);
      setMaterialPerformance(materialList);

      // 자율학습 분석
      const challengeItems = dailyWorkData.filter((dw) => dw.category === "CHALLENGE");
      const challengeWrongItems = dailyWorkData.filter((dw) => dw.category === "CHALLENGE_WRONG");

      const challengeTotal = challengeItems.reduce((sum, dw) => sum + (dw.assigned_count || 0), 0);
      const challengeCorrect = challengeItems.reduce((sum, dw) => sum + (dw.correct_count || 0), 0);
      const cwTotal = challengeWrongItems.reduce((sum, dw) => sum + (dw.assigned_count || 0), 0);
      const cwCorrect = challengeWrongItems.reduce((sum, dw) => sum + (dw.correct_count || 0), 0);

      setSelfStudyAnalysis({
        challengeProblems: challengeTotal,
        challengeCorrectRate: challengeTotal > 0 ? Math.round((challengeCorrect / challengeTotal) * 100) : 0,
        challengeWrongProblems: cwTotal,
        challengeWrongCorrectRate: cwTotal > 0 ? Math.round((cwCorrect / cwTotal) * 100) : 0,
        totalSelfStudy: challengeTotal + cwTotal,
      });

      // 성장 추이 (주간)
      const weekMap = new Map<string, { total: number; correct: number; startDate: string; endDate: string }>();

      dailyWorkData.forEach((dw) => {
        const date = new Date(dw.work_date);
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
        weekData.total += dw.assigned_count || 0;
        weekData.correct += dw.correct_count || 0;
        weekMap.set(weekKey, weekData);
      });

      const sortedWeeks = Array.from(weekMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-8);

      const growthData: GrowthDataPoint[] = sortedWeeks.map(([weekKey, data]) => {
        const weekStart = new Date(weekKey);
        const month = weekStart.getMonth() + 1;
        const day = weekStart.getDate();
        return {
          weekLabel: `${month}/${day}`,
          startDate: data.startDate,
          endDate: data.endDate,
          totalProblems: data.total,
          correctCount: data.correct,
          correctRate: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        };
      });
      setGrowthTrend(growthData);
    } catch (err) {
      console.error("기본 분석 데이터 로드 실패:", err);
      setError("분석 데이터를 불러오는 데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mathflatStudentId, period]);

  // Step 2: 심화 분석 (problem_results + concepts, 단원 선택시)
  const fetchChapterAnalysis = useCallback(async () => {
    if (!mathflatStudentId || !hasChapterSelection) {
      setDifficultyBreakdown([]);
      setWeakConcepts([]);
      setChapterAnalysis([]);
      return;
    }

    try {
      const { startDate, endDate } = calculatePeriodDates(period);

      // 1. 선택된 단원 concept_id 목록
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
        setDifficultyBreakdown([]);
        setWeakConcepts([]);
        setChapterAnalysis([]);
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

      // 2. 해당 기간의 daily_work ID 목록
      const { data: dailyWorkIds, error: dwError } = await supabase
        .from("mathflat_daily_work")
        .select("id")
        .eq("mathflat_student_id", mathflatStudentId)
        .gte("work_date", startDate)
        .lte("work_date", endDate);

      if (dwError) throw dwError;
      if (!dailyWorkIds || dailyWorkIds.length === 0) {
        setDifficultyBreakdown([]);
        setWeakConcepts([]);
        setChapterAnalysis([]);
        return;
      }

      const dwIds = dailyWorkIds.map((d) => d.id);

      // 3. 문제 결과 (daily_work_id 기반 - bug fix: was homework_id)
      const batchSize = 100;
      let allResults: Array<{ daily_work_id: string; concept_id: string; result: string; level: number | null }> = [];

      for (let i = 0; i < dwIds.length; i += batchSize) {
        const batchIds = dwIds.slice(i, i + batchSize);
        const { data: resultsData, error: resultsError } = await supabase
          .from("mathflat_problem_results")
          .select("daily_work_id, concept_id, result, level")
          .in("daily_work_id", batchIds)
          .in("concept_id", conceptIds)
          .in("result", ["CORRECT", "WRONG"]);

        if (resultsError) throw resultsError;
        if (resultsData) allResults = [...allResults, ...resultsData];
      }

      // 4. 난이도별 정답률
      const levelStats: Record<number, { total: number; correct: number }> = {};
      for (let lv = 1; lv <= 5; lv++) {
        levelStats[lv] = { total: 0, correct: 0 };
      }

      allResults.forEach((r) => {
        const level = r.level || 3;
        if (level >= 1 && level <= 5) {
          levelStats[level].total++;
          if (r.result === "CORRECT") levelStats[level].correct++;
        }
      });

      const diffBreakdown: DifficultyBreakdown[] = [1, 2, 3, 4, 5].map((level) => ({
        level,
        label: LEVEL_LABELS[level],
        total: levelStats[level].total,
        correct: levelStats[level].correct,
        correctRate: levelStats[level].total > 0
          ? Math.round((levelStats[level].correct / levelStats[level].total) * 100)
          : 0,
      }));
      setDifficultyBreakdown(diffBreakdown);

      // 5. 개념별 통계 → 취약 개념
      const conceptStats = new Map<string, { total: number; correct: number; info: { name: string; bigChapter: string | null; middleChapter: string | null; littleChapter: string | null } }>();
      allResults.forEach((r) => {
        const info = conceptMap.get(r.concept_id);
        if (!info) return;
        const stats = conceptStats.get(r.concept_id) || { total: 0, correct: 0, info };
        stats.total++;
        if (r.result === "CORRECT") stats.correct++;
        conceptStats.set(r.concept_id, stats);
      });

      const weakList: WeakConceptData[] = [];
      conceptStats.forEach((stats, conceptId) => {
        const rate = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
        if (rate < 50 && stats.total >= 2) {
          weakList.push({
            conceptId,
            conceptName: stats.info.name,
            littleChapter: stats.info.littleChapter || "",
            totalProblems: stats.total,
            correctCount: stats.correct,
            correctRate: rate,
          });
        }
      });
      weakList.sort((a, b) => a.correctRate - b.correctRate);
      setWeakConcepts(weakList.slice(0, 10));

      // 6. 소단원별 통계
      const chapterStats = new Map<string, { total: number; correct: number; middleChapter: string; bigChapter: string }>();
      allResults.forEach((r) => {
        const info = conceptMap.get(r.concept_id);
        if (!info || !info.littleChapter) return;
        const key = info.littleChapter;
        const stats = chapterStats.get(key) || {
          total: 0,
          correct: 0,
          middleChapter: info.middleChapter || "",
          bigChapter: info.bigChapter || "",
        };
        stats.total++;
        if (r.result === "CORRECT") stats.correct++;
        chapterStats.set(key, stats);
      });

      const chapterList: ChapterAnalysisData[] = [];
      chapterStats.forEach((stats, littleChapter) => {
        const rate = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
        let status: "good" | "warning" | "critical" = "good";
        if (rate < 50) status = "critical";
        else if (rate < 70) status = "warning";
        chapterList.push({
          littleChapter,
          middleChapter: stats.middleChapter,
          bigChapter: stats.bigChapter,
          totalProblems: stats.total,
          correctCount: stats.correct,
          correctRate: rate,
          status,
        });
      });
      chapterList.sort((a, b) => a.correctRate - b.correctRate);
      setChapterAnalysis(chapterList);
    } catch (err) {
      console.error("심화 분석 데이터 로드 실패:", err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mathflatStudentId, chapterSelection, period]);

  const resetState = () => {
    setActivitySummary({
      totalProblems: 0,
      totalDays: 0,
      dailyAverage: 0,
      homeworkProblems: 0,
      selfStudyProblems: 0,
      homeworkRatio: 0,
      overallCorrectRate: 0,
    });
    setMaterialPerformance([]);
    setSelfStudyAnalysis({
      challengeProblems: 0,
      challengeCorrectRate: 0,
      challengeWrongProblems: 0,
      challengeWrongCorrectRate: 0,
      totalSelfStudy: 0,
    });
    setGrowthTrend([]);
    setDifficultyBreakdown([]);
    setWeakConcepts([]);
    setChapterAnalysis([]);
  };

  useEffect(() => {
    fetchBasicAnalysis();
  }, [fetchBasicAnalysis]);

  useEffect(() => {
    fetchChapterAnalysis();
  }, [fetchChapterAnalysis]);

  return {
    activitySummary,
    materialPerformance,
    selfStudyAnalysis,
    growthTrend,
    difficultyBreakdown,
    weakConcepts,
    chapterAnalysis,
    isLoading,
    error,
    hasChapterAnalysis: hasChapterSelection,
  };
}
