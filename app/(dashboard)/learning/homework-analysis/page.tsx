"use client";

import React, { useState, useEffect, useMemo } from "react";
import LearningTabs from "@/components/learning/LearningTabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  BookOpen,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  AlertTriangle,
  Clock,
  Target,
  Filter,
} from "lucide-react";

interface TeacherInfo {
  id: string;
  name: string;
  position: string;
}

interface ClassInfo {
  id: string;
  name: string;
  mathflat_class_id: string | null;
  teacher_id: string | null;
}

interface ClassSchedule {
  class_id: string;
  day_of_week: string;
}

interface HomeworkData {
  id: string;
  student_name: string;
  mathflat_student_id: string;
  homework_date: string;
  book_type: string;
  title: string;
  page: string | null;
  completed: boolean;
  score: number | null;
  class_id: string;
}

interface ProblemResult {
  id: string;
  homework_id: string;
  problem_id: string;
  workbook_problem_id: string | null;
  problem_title: string | null;
  problem_number: string | null;
  level: number | null;
  type: string | null;
  correct_answer: string | null;
  result: "CORRECT" | "WRONG" | "NONE" | null;
}

interface StudentHomeworkSummary {
  student_name: string;
  mathflat_student_id: string;
  homeworks: Array<{
    title: string;
    page: string | null;
    total: number;
    solved: number;
    correct: number;
    wrong: number;
    notSolved: number;
    completionRate: number;
    correctRate: number;
  }>;
  totalCompletionRate: number;
  totalCorrectRate: number;
}

interface CommonWrongProblem {
  problem_id: string;
  book_title: string | null;
  page: string | null;
  problem_title: string | null;
  problem_number: string | null;
  level: number | null;
  wrong_count: number;
  wrong_students: string[];
}

interface ClassSummary {
  classId: string;
  className: string;
  students: StudentHomeworkSummary[];
  commonWrongProblems: CommonWrongProblem[];
  avgCompletionRate: number;
  avgCorrectRate: number;
  totalStudents: number;
}

// 페이지 범위에서 첫 번째 숫자 추출 (정렬용)
function extractFirstPage(page: string | null): number {
  if (!page) return 999999;
  const match = page.match(/\d+/);
  return match ? parseInt(match[0], 10) : 999999;
}

// 문제 번호에서 숫자 추출 (정렬용)
function extractProblemNumber(problemNumber: string | null): number {
  if (!problemNumber) return 999999;
  // "유제 2-1", "대표 문제 3", "1번" 등에서 숫자 추출
  const numbers = problemNumber.match(/\d+/g);
  if (!numbers || numbers.length === 0) return 999999;
  // 첫 번째 숫자를 주 정렬, 두 번째 숫자를 부 정렬 (2-1 → 2.1)
  if (numbers.length >= 2) {
    return parseFloat(`${numbers[0]}.${numbers[1]}`);
  }
  return parseInt(numbers[0], 10);
}

export default function HomeworkAnalysisPage() {
  const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("all");
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [classSchedules, setClassSchedules] = useState<ClassSchedule[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [rawHomeworks, setRawHomeworks] = useState<HomeworkData[]>([]);
  const [rawProblems, setRawProblems] = useState<ProblemResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 반별 접기/펼치기 상태
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  // 공통오답 학생 필터
  const [wrongProblemStudentFilter, setWrongProblemStudentFilter] = useState<Map<string, string>>(new Map());

  const supabase = createClient();

  // 반 토글
  const toggleClass = (classId: string) => {
    setExpandedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  };

  // 모든 반 펼치기
  const expandAllClasses = (classIds: string[]) => {
    setExpandedClasses(new Set(classIds));
  };

  // 선생님 목록 로드
  useEffect(() => {
    async function loadTeachers() {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, position")
        .in("position", ["원장", "강사", "부원장"])
        .eq("status", "재직")
        .order("name");

      if (!error && data) {
        setTeachers(data as TeacherInfo[]);
        // 기본값: 박석돈 선생님 선택
        const defaultTeacher = data.find((t: any) => t.name === "박석돈");
        if (defaultTeacher) {
          setSelectedTeacherId(defaultTeacher.id);
        }
      }
    }
    loadTeachers();
  }, []);

  // 반 목록 및 스케줄 로드
  useEffect(() => {
    async function loadClassesAndSchedules() {
      const [classesRes, schedulesRes] = await Promise.all([
        supabase
          .from("classes")
          .select("id, name, mathflat_class_id, teacher_id")
          .eq("is_active", true)
          .not("mathflat_class_id", "is", null)
          .order("name"),
        supabase.from("class_schedules").select("class_id, day_of_week"),
      ]);

      if (!classesRes.error && classesRes.data) {
        setClasses(classesRes.data as unknown as ClassInfo[]);
      }
      if (!schedulesRes.error && schedulesRes.data) {
        setClassSchedules(schedulesRes.data as ClassSchedule[]);
      }
    }
    loadClassesAndSchedules();
  }, []);

  // 선택한 날짜의 요일에 수업이 있는 반 필터링
  const todayClasses = useMemo(() => {
    const date = new Date(selectedDate);
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    const dayOfWeek = days[date.getDay()];

    // 해당 요일에 수업이 있는 class_id 목록
    const classIdsWithSchedule = classSchedules
      .filter((s) => s.day_of_week === dayOfWeek)
      .map((s) => s.class_id);

    // 필터링: 선생님 선택 시 해당 선생님 반만
    return classes.filter((c) => {
      const hasSchedule = classIdsWithSchedule.includes(c.id);
      const teacherMatch = selectedTeacherId === "all" || c.teacher_id === selectedTeacherId;
      return hasSchedule && teacherMatch;
    });
  }, [selectedDate, classSchedules, classes, selectedTeacherId]);

  // 숙제 데이터 로드
  useEffect(() => {
    async function loadHomeworkData() {
      if (!selectedDate || todayClasses.length === 0) {
        setRawHomeworks([]);
        setRawProblems([]);
        return;
      }

      setIsLoading(true);

      try {
        const classIds = todayClasses.map((c) => c.id);

        // 선택한 날짜 + 해당 반들의 숙제 조회
        const { data: homeworks, error: hwError } = await (supabase as any)
          .from("mathflat_homework")
          .select("*")
          .eq("homework_date", selectedDate)
          .in("class_id", classIds);

        if (hwError) throw hwError;

        if (!homeworks || homeworks.length === 0) {
          setRawHomeworks([]);
          setRawProblems([]);
          setIsLoading(false);
          return;
        }

        setRawHomeworks(homeworks);

        // 각 숙제의 문제 결과 조회
        const homeworkIds = homeworks.map((h: any) => h.id);
        const { data: problems, error: probError } = await (supabase as any)
          .from("mathflat_problem_results")
          .select("*")
          .in("homework_id", homeworkIds);

        if (probError) throw probError;

        setRawProblems(problems || []);

        // 데이터 로드 후 모든 반 펼치기
        expandAllClasses(classIds);
      } catch (error) {
        console.error("숙제 데이터 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadHomeworkData();
  }, [selectedDate, todayClasses]);

  // 반별로 데이터 그룹화
  const classSummaries = useMemo((): ClassSummary[] => {
    if (rawHomeworks.length === 0) return [];

    // 반별로 그룹화
    const classMap = new Map<string, HomeworkData[]>();
    rawHomeworks.forEach((hw) => {
      const list = classMap.get(hw.class_id) || [];
      list.push(hw);
      classMap.set(hw.class_id, list);
    });

    const summaries: ClassSummary[] = [];

    classMap.forEach((homeworks, classId) => {
      const classInfo = classes.find((c) => c.id === classId);
      if (!classInfo) return;

      // 학생별로 그룹화
      const studentMap = new Map<string, StudentHomeworkSummary>();

      homeworks.forEach((hw) => {
        const hwProblems = rawProblems.filter((p) => p.homework_id === hw.id);
        const correct = hwProblems.filter((p) => p.result === "CORRECT").length;
        const wrong = hwProblems.filter((p) => p.result === "WRONG").length;
        const notSolved = hwProblems.filter((p) => p.result === "NONE" || !p.result).length;
        const total = hwProblems.length;
        const solved = correct + wrong;
        const completionRate = total > 0 ? Math.round((solved / total) * 100) : 0;
        const correctRate = solved > 0 ? Math.round((correct / solved) * 100) : 0;

        if (!studentMap.has(hw.mathflat_student_id)) {
          studentMap.set(hw.mathflat_student_id, {
            student_name: hw.student_name,
            mathflat_student_id: hw.mathflat_student_id,
            homeworks: [],
            totalCompletionRate: 0,
            totalCorrectRate: 0,
          });
        }

        studentMap.get(hw.mathflat_student_id)!.homeworks.push({
          title: hw.title,
          page: hw.page,
          total,
          solved,
          correct,
          wrong,
          notSolved,
          completionRate,
          correctRate,
        });
      });

      // 학생별 총 완료율/정답률 계산
      const students = Array.from(studentMap.values()).map((student) => {
        const totalProblems = student.homeworks.reduce((sum, h) => sum + h.total, 0);
        const totalSolved = student.homeworks.reduce((sum, h) => sum + h.solved, 0);
        const totalCorrect = student.homeworks.reduce((sum, h) => sum + h.correct, 0);
        return {
          ...student,
          totalCompletionRate: totalProblems > 0 ? Math.round((totalSolved / totalProblems) * 100) : 0,
          totalCorrectRate: totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0,
        };
      });

      // 완료율 기준 정렬 (낮은 순 - 관심 필요한 학생 먼저)
      students.sort((a, b) => a.totalCompletionRate - b.totalCompletionRate);

      // 공통 오답 문제 분석
      const wrongProblemMap = new Map<string, CommonWrongProblem>();
      const homeworkIds = homeworks.map((h) => h.id);

      rawProblems
        .filter((p) => homeworkIds.includes(p.homework_id) && p.result === "WRONG")
        .forEach((p) => {
          const key = p.problem_id;
          const hw = homeworks.find((h) => h.id === p.homework_id);
          const studentName = hw?.student_name || "알 수 없음";

          if (wrongProblemMap.has(key)) {
            const existing = wrongProblemMap.get(key)!;
            if (!existing.wrong_students.includes(studentName)) {
              existing.wrong_students.push(studentName);
              existing.wrong_count++;
            }
          } else {
            wrongProblemMap.set(key, {
              problem_id: p.problem_id,
              book_title: hw?.title || null,
              page: hw?.page || null,
              problem_title: p.problem_title,
              problem_number: p.problem_number,
              level: p.level,
              wrong_count: 1,
              wrong_students: [studentName],
            });
          }
        });

      // 공통 오답: 2명 이상, 교재별 > 페이지별 > problem_title별 > 문제번호(숫자) 순 정렬
      const commonWrongProblems = Array.from(wrongProblemMap.values())
        .filter((p) => p.wrong_count >= 2)
        .sort((a, b) => {
          // 1. 교재명
          const titleCompare = (a.book_title || "").localeCompare(b.book_title || "", "ko");
          if (titleCompare !== 0) return titleCompare;
          // 2. 페이지 (숫자 기준)
          const pageCompare = extractFirstPage(a.page) - extractFirstPage(b.page);
          if (pageCompare !== 0) return pageCompare;
          // 3. problem_title
          const problemTitleCompare = (a.problem_title || "").localeCompare(b.problem_title || "", "ko");
          if (problemTitleCompare !== 0) return problemTitleCompare;
          // 4. 문제번호 (숫자 추출하여 비교)
          return extractProblemNumber(a.problem_number) - extractProblemNumber(b.problem_number);
        });

      // 반 평균
      const avgCompletionRate =
        students.length > 0
          ? Math.round(students.reduce((sum, s) => sum + s.totalCompletionRate, 0) / students.length)
          : 0;
      const avgCorrectRate =
        students.length > 0
          ? Math.round(students.reduce((sum, s) => sum + s.totalCorrectRate, 0) / students.length)
          : 0;

      summaries.push({
        classId,
        className: classInfo.name,
        students,
        commonWrongProblems,
        avgCompletionRate,
        avgCorrectRate,
        totalStudents: students.length,
      });
    });

    // 반 이름순 정렬
    summaries.sort((a, b) => a.className.localeCompare(b.className, "ko"));

    return summaries;
  }, [rawHomeworks, rawProblems, classes]);

  // 날짜 이동
  const moveDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split("T")[0]);
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
  };

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = days[date.getDay()];
    return { month, day, dayOfWeek };
  };

  const dateInfo = formatDate(selectedDate);
  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  // 완료율 색상
  const getCompletionColor = (rate: number) => {
    if (rate >= 100) return "bg-emerald-500";
    if (rate >= 80) return "bg-blue-500";
    if (rate >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  const getCompletionTextColor = (rate: number) => {
    if (rate >= 100) return "text-emerald-600";
    if (rate >= 80) return "text-blue-600";
    if (rate >= 50) return "text-amber-600";
    return "text-red-600";
  };

  // 정답률 색상
  const getCorrectRateColor = (rate: number) => {
    if (rate >= 85) return "text-emerald-600";
    if (rate >= 70) return "text-blue-600";
    if (rate >= 50) return "text-amber-600";
    return "text-red-600";
  };

  // 오답수 색상 (반 인원 대비 비율) - 그라데이션 강도
  const getWrongCountColor = (wrongCount: number, totalStudents: number) => {
    const ratio = totalStudents > 0 ? (wrongCount / totalStudents) * 100 : 0;
    if (ratio >= 70) {
      return "bg-rose-600 text-white"; // 심각: 70% 이상 (진한 분홍/빨강)
    }
    if (ratio >= 40) {
      return "bg-orange-500 text-white"; // 주의: 40% 이상 (진한 주황)
    }
    return "bg-yellow-200 text-yellow-700"; // 경미: 40% 미만 (연한 노랑)
  };

  // 공통오답 학생 필터 변경
  const handleWrongProblemStudentFilter = (classId: string, studentName: string) => {
    setWrongProblemStudentFilter((prev) => {
      const next = new Map(prev);
      if (studentName === "all") {
        next.delete(classId);
      } else {
        next.set(classId, studentName);
      }
      return next;
    });
  };

  // 필터링된 공통오답 목록
  const getFilteredCommonWrongProblems = (classSummary: ClassSummary) => {
    const filter = wrongProblemStudentFilter.get(classSummary.classId);
    if (!filter) return classSummary.commonWrongProblems;
    return classSummary.commonWrongProblems.filter((p) => p.wrong_students.includes(filter));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <LearningTabs />

        {/* 날짜 헤더 */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-800 to-slate-700 p-5 shadow-xl">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* 날짜 + 설명 */}
            <div className="flex items-center gap-5">
              <div className="text-white">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black tracking-tight">
                    {dateInfo.month}/{dateInfo.day}
                  </span>
                  <span className="text-xl font-medium text-slate-300">{dateInfo.dayOfWeek}요일</span>
                  {isToday && (
                    <Badge className="ml-2 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                      오늘
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  숙제 제출일 기준
                </div>
              </div>

              {/* 구분선 */}
              <div className="w-px h-14 bg-slate-600"></div>

              {/* 수업 반 */}
              <div className="text-slate-300">
                <div className="text-xs font-medium opacity-70 mb-1">오늘 수업 반</div>
                <div className="text-base font-semibold text-white">
                  {todayClasses.length > 0
                    ? todayClasses.map((c) => c.name).join(", ")
                    : "해당 요일 수업 없음"}
                </div>
              </div>
            </div>

            {/* 필터 + 날짜 네비게이션 */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* 선생님 필터 */}
              <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white text-sm">
                  <SelectValue placeholder="선생님 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 선생님</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} {t.position === "원장" ? "(원장)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 날짜 네비게이션 */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => moveDate(-1)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goToToday}
                  className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  오늘
                </button>
                <button
                  onClick={() => moveDate(1)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="ml-1 px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 로딩 상태 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin"></div>
              <span className="text-slate-500 text-sm">숙제 데이터를 불러오는 중...</span>
            </div>
          </div>
        ) : classSummaries.length === 0 ? (
          /* 데이터 없음 */
          <Card className="p-10 text-center border-0 shadow-lg">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-slate-100 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">숙제 데이터가 없습니다</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              {todayClasses.length === 0
                ? "선택한 날짜에 수업이 있는 반이 없습니다."
                : "선택한 날짜에 수집된 숙제가 없습니다. 다른 날짜를 선택해주세요."}
            </p>
          </Card>
        ) : (
          /* 반별 카드 */
          <div className="space-y-4">
            {classSummaries.map((classSummary) => {
              const isExpanded = expandedClasses.has(classSummary.classId);
              const filteredWrongProblems = getFilteredCommonWrongProblems(classSummary);
              const selectedStudentFilter = wrongProblemStudentFilter.get(classSummary.classId);

              return (
                <Card key={classSummary.classId} className="overflow-hidden border-0 shadow-lg">
                  {/* 반 헤더 (클릭 가능) */}
                  <button
                    onClick={() => toggleClass(classSummary.classId)}
                    className="w-full bg-slate-800 px-5 py-3.5 flex items-center justify-between hover:bg-slate-750 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                        <h2 className="text-lg font-bold text-white">{classSummary.className}</h2>
                      </div>
                      <div className="flex items-center gap-2.5 text-slate-300 text-sm">
                        <Users className="w-4 h-4" />
                        <span>{classSummary.totalStudents}명</span>
                        {classSummary.commonWrongProblems.length > 0 && (
                          <>
                            <span className="text-slate-500">|</span>
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                            <span className="text-amber-300">
                              공통오답 {classSummary.commonWrongProblems.length}개
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">완료율</span>
                        <span className="text-lg font-bold text-white">
                          {classSummary.avgCompletionRate}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">정답률</span>
                        <span
                          className={`text-lg font-bold ${
                            classSummary.avgCorrectRate >= 70 ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {classSummary.avgCorrectRate}%
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* 펼쳐진 내용 */}
                  {isExpanded && (
                    <div className="p-5">
                      {/* 학생별 현황 */}
                      <div className="mb-5">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5" />
                          학생별 현황
                        </h3>
                        <div className="space-y-2">
                          {classSummary.students.map((student) => (
                            <div
                              key={student.mathflat_student_id}
                              className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                              {/* 학생 이름 */}
                              <div className="w-20 font-medium text-slate-800 text-sm">
                                {student.student_name}
                              </div>

                              {/* 완료율 게이지 */}
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

                              {/* 정답률 */}
                              <div className="flex items-center gap-1 w-20 justify-end">
                                <span className="text-xs text-slate-400">정답률</span>
                                <span className={`text-sm font-bold ${getCorrectRateColor(student.totalCorrectRate)}`}>
                                  {student.totalCorrectRate}%
                                </span>
                              </div>

                              {/* 숙제별 상세 */}
                              <div className="flex gap-1.5">
                                {student.homeworks.map((hw, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-slate-200 text-xs"
                                  >
                                    <span className="text-slate-500 font-mono">p.{hw.page || "-"}</span>
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
                          ))}
                        </div>
                      </div>

                      {/* 공통 오답 문제 */}
                      {classSummary.commonWrongProblems.length > 0 && (
                        <div className="border-t border-slate-100 pt-5">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                              공통 오답 (2명 이상)
                            </h3>
                            {/* 학생 필터 */}
                            <div className="flex items-center gap-2">
                              <Filter className="w-3.5 h-3.5 text-slate-400" />
                              <Select
                                value={selectedStudentFilter || "all"}
                                onValueChange={(value) => handleWrongProblemStudentFilter(classSummary.classId, value)}
                              >
                                <SelectTrigger className="w-[130px] h-8 text-xs bg-white border-slate-200">
                                  <SelectValue placeholder="학생 필터" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">전체 학생</SelectItem>
                                  {classSummary.students.map((s) => (
                                    <SelectItem key={s.mathflat_student_id} value={s.student_name}>
                                      {s.student_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {filteredWrongProblems.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-sm">
                              선택한 학생의 공통 오답이 없습니다.
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-slate-100 text-slate-600">
                                    <th className="px-3 py-2 text-center font-medium w-20">오답수</th>
                                    <th className="px-3 py-2 text-left font-medium">교재</th>
                                    <th className="px-3 py-2 text-left font-medium w-24">페이지</th>
                                    <th className="px-3 py-2 text-left font-medium">단원/유형</th>
                                    <th className="px-3 py-2 text-left font-medium w-32">문제번호</th>
                                    <th className="px-3 py-2 text-left font-medium">틀린 학생</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredWrongProblems.map((problem, idx) => (
                                    <tr
                                      key={problem.problem_id}
                                      className={`border-b border-slate-100 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                                    >
                                      <td className="px-3 py-2.5 text-center">
                                        <span
                                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${getWrongCountColor(problem.wrong_count, classSummary.totalStudents)}`}
                                        >
                                          {problem.wrong_count}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2.5 text-slate-700 font-medium">
                                        {problem.book_title || "-"}
                                      </td>
                                      <td className="px-3 py-2.5 font-mono text-slate-600">
                                        {problem.page ? `p.${problem.page}` : "-"}
                                      </td>
                                      <td className="px-3 py-2.5 text-slate-600">
                                        {problem.problem_title || "-"}
                                      </td>
                                      <td className="px-3 py-2.5 font-semibold text-slate-800">
                                        {problem.problem_number || "-"}
                                      </td>
                                      <td className="px-3 py-2.5">
                                        <div className="flex flex-wrap gap-1">
                                          {problem.wrong_students.map((name) => (
                                            <span
                                              key={name}
                                              className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded text-xs"
                                            >
                                              {name}
                                            </span>
                                          ))}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
