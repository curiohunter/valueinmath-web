"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { BarChart3, Loader2, Layers, Users, BookOpen, Target, TrendingUp, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ChapterTreeSelector from "./ChapterTreeSelector";
import StudentSelector from "./StudentSelector";
import PeriodSelector from "./PeriodSelector";
import MaterialPerformanceCard from "./MaterialPerformanceCard";
import SelfStudyAnalysisCard from "./SelfStudyAnalysisCard";
import DifficultyBreakdownChart from "./DifficultyBreakdownChart";
import ChapterAnalysisChart from "./ChapterAnalysisChart";
import WeakConceptList from "./WeakConceptList";
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
  student_id: string;
  mathflat_student_id: string;
  student_name: string;
  school_id?: string | null;
  grade?: number | null;
  recentCorrectRate?: number;
  recentTrend?: "up" | "down" | "stable";
}

export default function StudentAnalysisTab() {
  const supabase = createClient();

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

  // 학생 목록 로드
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

        const filteredStudents = (classStudentsData || [])
          .filter((cs: any) =>
            cs.students?.status === "재원" &&
            cs.students?.mathflat_student_id
          );

        const studentIds = filteredStudents.map((cs: any) => cs.students.id);
        let schoolInfoMap = new Map<string, { school_id: string | null; grade: number | null }>();

        if (studentIds.length > 0) {
          const { data: schoolData } = await supabase
            .from("student_schools")
            .select("student_id, school_id, grade")
            .in("student_id", studentIds)
            .eq("is_current", true);

          if (schoolData) {
            schoolData.forEach((ss: any) => {
              schoolInfoMap.set(ss.student_id, {
                school_id: ss.school_id,
                grade: ss.grade,
              });
            });
          }
        }

        const studentList: Student[] = filteredStudents
          .map((cs: any) => {
            const schoolInfo = schoolInfoMap.get(cs.students.id);
            return {
              student_id: cs.students.id,
              mathflat_student_id: cs.students.mathflat_student_id,
              student_name: cs.students.name,
              school_id: schoolInfo?.school_id || null,
              grade: schoolInfo?.grade || null,
            };
          })
          .sort((a, b) => a.student_name.localeCompare(b.student_name, "ko"));

        if (studentList.length > 0 && studentList.length <= 20) {
          const mathflatIds = studentList.map((s) => s.mathflat_student_id);
          const { data: dailyWorkData } = await supabase
            .from("mathflat_daily_work")
            .select("mathflat_student_id, correct_count, assigned_count")
            .in("mathflat_student_id", mathflatIds)
            .gte("work_date", thirtyDaysAgo.toISOString().split("T")[0]);

          if (dailyWorkData) {
            const statsMap = new Map<string, { correct: number; total: number }>();
            dailyWorkData.forEach((dw) => {
              const stats = statsMap.get(dw.mathflat_student_id) || { correct: 0, total: 0 };
              stats.correct += dw.correct_count || 0;
              stats.total += dw.assigned_count || 0;
              statsMap.set(dw.mathflat_student_id, stats);
            });

            studentList.forEach((student) => {
              const stats = statsMap.get(student.mathflat_student_id);
              if (stats && stats.total > 0) {
                student.recentCorrectRate = Math.round((stats.correct / stats.total) * 100);
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

  // 기본 선택 완료 여부 (반 + 학생만)
  const isBasicSelectionComplete = useMemo(() => {
    return selectedClassId !== null && selectedStudentId !== null;
  }, [selectedClassId, selectedStudentId]);

  const selectedStudent = useMemo(() => {
    return students.find((s) => s.mathflat_student_id === selectedStudentId);
  }, [students, selectedStudentId]);

  // 분석 데이터 훅
  const {
    activitySummary,
    materialPerformance,
    selfStudyAnalysis,
    growthTrend,
    difficultyBreakdown,
    weakConcepts,
    chapterAnalysis,
    isLoading: isLoadingAnalysis,
    error: analysisError,
    hasChapterAnalysis,
  } = useStudentAnalysis({
    mathflatStudentId: isBasicSelectionComplete ? selectedStudentId : null,
    chapterSelection,
    period,
  });

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
        {/* 왼쪽: 분석 대상 + 기간 */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-white" />
              <h3 className="font-semibold text-white">분석 대상</h3>
            </div>
          </div>
          <div className="p-4 space-y-5">
            <StudentSelector
              classes={classes}
              selectedClassId={selectedClassId}
              onClassChange={setSelectedClassId}
              students={students}
              selectedStudentId={selectedStudentId}
              onStudentChange={setSelectedStudentId}
              isLoading={isLoadingStudents}
            />
            <div className="border-t border-slate-100" />
            <PeriodSelector period={period} onPeriodChange={setPeriod} />
          </div>
        </Card>

        {/* 오른쪽: 단원 범위 (선택사항) */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-white" />
                <h3 className="font-semibold text-white">심화 분석 범위</h3>
                <span className="text-xs text-white/60">(선택사항)</span>
              </div>
              <SavedRangesSelector
                selection={chapterSelection}
                onSelectionChange={setChapterSelection}
                disabled={isRangeLocked}
                studentSchoolId={selectedStudent?.school_id}
                studentGrade={selectedStudent?.grade}
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
      </div>

      {/* 분석 결과 */}
      {isBasicSelectionComplete ? (
        <div className="space-y-4">
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
          ) : activitySummary.totalProblems === 0 ? (
            <Card className="border-0 shadow-lg p-8 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <CalendarDays className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-2">
                학습 기록이 없습니다
              </h3>
              <p className="text-slate-500 text-sm">
                선택한 기간에 매쓰플랫 학습 기록이 없습니다. 기간을 넓혀보세요.
              </p>
            </Card>
          ) : (
            <>
              {/* 상단: 학습 활동 요약 (전체 폭) */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4">
                  <h3 className="font-bold text-white text-lg">
                    {selectedStudent?.student_name} 학습 분석
                  </h3>
                  <p className="text-slate-300 text-sm mt-0.5">{periodLabel}</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-5 divide-x divide-y lg:divide-y-0 divide-slate-100">
                  <StatCell
                    icon={BookOpen}
                    label="총 풀이"
                    value={`${activitySummary.totalProblems}문제`}
                    color="text-blue-600"
                    bgColor="bg-blue-50"
                  />
                  <StatCell
                    icon={Target}
                    label="정답률"
                    value={`${activitySummary.overallCorrectRate}%`}
                    color={activitySummary.overallCorrectRate >= 70 ? "text-emerald-600" : activitySummary.overallCorrectRate >= 50 ? "text-amber-600" : "text-red-600"}
                    bgColor={activitySummary.overallCorrectRate >= 70 ? "bg-emerald-50" : activitySummary.overallCorrectRate >= 50 ? "bg-amber-50" : "bg-red-50"}
                  />
                  <StatCell
                    icon={CalendarDays}
                    label="학습일"
                    value={`${activitySummary.totalDays}일`}
                    color="text-violet-600"
                    bgColor="bg-violet-50"
                  />
                  <StatCell
                    icon={TrendingUp}
                    label="일평균"
                    value={`${activitySummary.dailyAverage}문제`}
                    color="text-indigo-600"
                    bgColor="bg-indigo-50"
                  />
                  <StatCell
                    icon={BookOpen}
                    label="숙제/자율"
                    value={`${activitySummary.homeworkRatio}% / ${100 - activitySummary.homeworkRatio}%`}
                    color="text-slate-600"
                    bgColor="bg-slate-50"
                  />
                </div>
              </div>

              {/* 중단: 교재/학습지 성적 + 자율학습 분석 */}
              <MaterialPerformanceCard data={materialPerformance} />
              <SelfStudyAnalysisCard data={selfStudyAnalysis} />

              {/* 하단: 심화 분석 (단원 선택시만) */}
              {hasChapterAnalysis && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <DifficultyBreakdownChart data={difficultyBreakdown} />
                  <WeakConceptList data={weakConcepts} />
                </div>
              )}

              {hasChapterAnalysis && chapterAnalysis.length > 0 && (
                <ChapterAnalysisChart data={chapterAnalysis} />
              )}

              {/* 최하단: 성장 추이 (전체 폭) */}
              <GrowthTrendChart data={growthTrend} />
            </>
          )}
        </div>
      ) : (
        <Card className="border-0 shadow-lg p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <BarChart3 className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">
            분석 대상을 선택하세요
          </h3>
          <p className="text-slate-500 text-sm mb-4">
            반과 학생을 선택하면 학습 분석 결과가 표시됩니다
          </p>
          <div className="flex justify-center gap-6 text-sm">
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

// 통계 셀 컴포넌트
function StatCell({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgColor}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <div className={`text-xl font-bold ${color}`}>{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}
