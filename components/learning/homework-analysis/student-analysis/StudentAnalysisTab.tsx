"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { BarChart3, Loader2, Layers, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ChapterTreeSelector from "./ChapterTreeSelector";
import StudentSelector from "./StudentSelector";
import PeriodSelector from "./PeriodSelector";
import AnalysisOverview from "./AnalysisOverview";
import ChapterAnalysisChart from "./ChapterAnalysisChart";
import WeakConceptList from "./WeakConceptList";
import LearningPatternCard from "./LearningPatternCard";
import GrowthTrendChart from "./GrowthTrendChart";
import SavedRangesSelector from "./SavedRangesSelector";
import { useStudentAnalysis } from "./useStudentAnalysis";
import {
  ConceptData,
  ChapterSelection,
  PeriodSelection,
  ClassInfo,
  INITIAL_STUDENT_ANALYSIS_STATE,
} from "../types";

interface Student {
  mathflat_student_id: string;
  student_name: string;
  recentCorrectRate?: number;
  recentTrend?: "up" | "down" | "stable";
}

export default function StudentAnalysisTab() {
  const supabase = createClient();

  // 상태
  const [concepts, setConcepts] = useState<ConceptData[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [chapterSelection, setChapterSelection] = useState<ChapterSelection>(
    INITIAL_STUDENT_ANALYSIS_STATE.chapterSelection
  );
  const [isRangeLocked, setIsRangeLocked] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodSelection>(
    INITIAL_STUDENT_ANALYSIS_STATE.period
  );

  const [isLoadingConcepts, setIsLoadingConcepts] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  // 개념 데이터 로드
  useEffect(() => {
    async function loadConcepts() {
      setIsLoadingConcepts(true);
      try {
        const { data, error } = await supabase
          .from("mathflat_concepts")
          .select("*")
          .order("priority", { ascending: true });

        if (error) throw error;
        setConcepts((data as ConceptData[]) || []);
      } catch (error) {
        console.error("개념 데이터 로드 실패:", error);
      } finally {
        setIsLoadingConcepts(false);
      }
    }
    loadConcepts();
  }, []);

  // 반 목록 로드
  useEffect(() => {
    async function loadClasses() {
      try {
        const { data, error } = await supabase
          .from("classes")
          .select("id, name, mathflat_class_id, teacher_id")
          .eq("is_active", true)
          .not("mathflat_class_id", "is", null)
          .order("name");

        if (error) throw error;
        setClasses((data as ClassInfo[]) || []);
      } catch (error) {
        console.error("반 목록 로드 실패:", error);
      }
    }
    loadClasses();
  }, []);

  // 학생 목록 로드 (반 선택 시) - 해당 반의 재원생 전체
  useEffect(() => {
    async function loadStudents() {
      if (!selectedClassId) {
        setStudents([]);
        setSelectedStudentId(null);
        return;
      }

      setIsLoadingStudents(true);
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 1. 해당 반의 재원생 목록 가져오기 (class_students + students 조인)
        const { data: classStudentsData, error } = await supabase
          .from("class_students")
          .select(`
            student_id,
            students!inner (
              id,
              name,
              status,
              mathflat_student_id
            )
          `)
          .eq("class_id", selectedClassId);

        if (error) throw error;

        // 2. 재원생만 필터링 (mathflat_student_id가 있는 학생)
        const studentList: Student[] = (classStudentsData || [])
          .filter((cs: any) =>
            cs.students?.status === "재원" &&
            cs.students?.mathflat_student_id
          )
          .map((cs: any) => ({
            mathflat_student_id: cs.students.mathflat_student_id,
            student_name: cs.students.name,
          }))
          .sort((a, b) => a.student_name.localeCompare(b.student_name, "ko"));

        if (studentList.length > 0 && studentList.length <= 20) {
          const studentIds = studentList.map((s) => s.mathflat_student_id);
          const { data: dailyWorkData } = await supabase
            .from("mathflat_daily_work")
            .select("mathflat_student_id, correct_count, assigned_count")
            .in("mathflat_student_id", studentIds)
            .gte("work_date", thirtyDaysAgo.toISOString().split("T")[0]);

          if (dailyWorkData) {
            const statsMap = new Map<string, { correct: number; total: number }>();
            dailyWorkData.forEach((dw) => {
              const stats = statsMap.get(dw.mathflat_student_id) || {
                correct: 0,
                total: 0,
              };
              stats.correct += dw.correct_count || 0;
              stats.total += dw.assigned_count || 0;
              statsMap.set(dw.mathflat_student_id, stats);
            });

            studentList.forEach((student) => {
              const stats = statsMap.get(student.mathflat_student_id);
              if (stats && stats.total > 0) {
                student.recentCorrectRate = Math.round(
                  (stats.correct / stats.total) * 100
                );
              }
            });
          }
        }

        setStudents(studentList);

        if (studentList.length > 0) {
          setSelectedStudentId(studentList[0].mathflat_student_id);
        } else {
          setSelectedStudentId(null);
        }
      } catch (error) {
        console.error("학생 목록 로드 실패:", error);
      } finally {
        setIsLoadingStudents(false);
      }
    }

    loadStudents();
  }, [selectedClassId]);

  // 선택 완료 여부
  const isSelectionComplete = useMemo(() => {
    return (
      chapterSelection.curriculum !== null &&
      chapterSelection.bigChapters.length > 0 &&
      selectedClassId !== null &&
      selectedStudentId !== null
    );
  }, [chapterSelection, selectedClassId, selectedStudentId]);

  // 선택된 학생 정보
  const selectedStudent = useMemo(() => {
    return students.find((s) => s.mathflat_student_id === selectedStudentId);
  }, [students, selectedStudentId]);

  // 분석 데이터 훅
  const {
    overview,
    chapterAnalysis,
    weakConcepts,
    patterns,
    growthTrend,
    isLoading: isLoadingAnalysis,
    error: analysisError,
  } = useStudentAnalysis({
    mathflatStudentId: isSelectionComplete ? selectedStudentId : null,
    chapterSelection,
    period,
  });

  // 기간 라벨
  const periodLabel = useMemo(() => {
    if (period.type === "custom" && period.customStart && period.customEnd) {
      return `${period.customStart} ~ ${period.customEnd}`;
    }
    if (period.preset === "all") return "전체 기간";
    return `최근 ${period.preset}일`;
  }, [period]);

  return (
    <div className="space-y-4">
      {/* 상단: 좌우 분할 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 왼쪽: 분석 범위 */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-white" />
                <h3 className="font-semibold text-white">분석 범위</h3>
              </div>
              <SavedRangesSelector
                selection={chapterSelection}
                onSelectionChange={setChapterSelection}
                disabled={isRangeLocked}
              />
            </div>
          </div>
          <div className="p-4">
            {isLoadingConcepts ? (
              <div className="py-12 flex items-center justify-center">
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">단원 정보 로드 중...</span>
                </div>
              </div>
            ) : (
              <ChapterTreeSelector
                concepts={concepts}
                selection={chapterSelection}
                onSelectionChange={setChapterSelection}
                isLocked={isRangeLocked}
                onLockToggle={() => setIsRangeLocked(!isRangeLocked)}
              />
            )}
          </div>
        </Card>

        {/* 오른쪽: 분석 대상 + 기간 */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-white" />
              <h3 className="font-semibold text-white">분석 대상</h3>
            </div>
          </div>
          <div className="p-4 space-y-5">
            {/* 반/학생 선택 */}
            <StudentSelector
              classes={classes}
              selectedClassId={selectedClassId}
              onClassChange={setSelectedClassId}
              students={students}
              selectedStudentId={selectedStudentId}
              onStudentChange={setSelectedStudentId}
              isLoading={isLoadingStudents}
            />

            {/* 구분선 */}
            <div className="border-t border-slate-100" />

            {/* 기간 선택 */}
            <PeriodSelector period={period} onPeriodChange={setPeriod} />
          </div>
        </Card>
      </div>

      {/* 하단: 분석 결과 */}
      {isSelectionComplete ? (
        <div className="space-y-4">
          {/* 로딩 상태 */}
          {isLoadingAnalysis ? (
            <Card className="border-0 shadow-lg p-12">
              <div className="flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-slate-500">분석 데이터를 불러오는 중...</p>
              </div>
            </Card>
          ) : analysisError ? (
            <Card className="border-0 shadow-lg p-8 text-center">
              <div className="text-red-500 mb-2">오류가 발생했습니다</div>
              <p className="text-slate-500 text-sm">{analysisError}</p>
            </Card>
          ) : (
            <>
              {/* Overview 카드 */}
              <AnalysisOverview
                data={overview}
                studentName={selectedStudent?.student_name || ""}
                curriculum={chapterSelection.curriculum || ""}
                periodLabel={periodLabel}
              />

              {/* 소단원별 정답률 + 취약 개념 (2열 그리드) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChapterAnalysisChart data={chapterAnalysis} />
                <WeakConceptList data={weakConcepts} />
              </div>

              {/* Phase 3: 학습 패턴 + 성장 추이 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <LearningPatternCard data={patterns} />
                <GrowthTrendChart data={growthTrend} />
              </div>
            </>
          )}
        </div>
      ) : (
        <Card className="border-0 shadow-lg p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <BarChart3 className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">
            분석 조건을 선택하세요
          </h3>
          <p className="text-slate-500 text-sm mb-4">
            단원 범위, 반, 학생을 선택하면 학습 분석 결과가 표시됩니다
          </p>

          {/* 선택 상태 체크 */}
          <div className="flex justify-center gap-6 text-sm">
            <div
              className={
                chapterSelection.curriculum && chapterSelection.bigChapters.length > 0
                  ? "text-emerald-600"
                  : "text-slate-400"
              }
            >
              {chapterSelection.curriculum && chapterSelection.bigChapters.length > 0
                ? "✓"
                : "○"}{" "}
              단원
            </div>
            <div className={selectedClassId ? "text-emerald-600" : "text-slate-400"}>
              {selectedClassId ? "✓" : "○"} 반
            </div>
            <div className={selectedStudentId ? "text-emerald-600" : "text-slate-400"}>
              {selectedStudentId ? "✓" : "○"} 학생
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
