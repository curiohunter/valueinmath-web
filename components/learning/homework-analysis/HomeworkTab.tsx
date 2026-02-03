"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  HomeworkAnalysisHeader,
  ClassSummaryCard,
  TeacherInfo,
  ClassInfo,
  ClassSchedule,
  ClassSummary,
  StudentLearingSummary,
  CommonWrongProblem,
  ConceptWeakness,
  DailyWorkData,
  HomeworkData,
  ProblemResult,
  DailyWorkHomeworkMapping,
  SelfStudyCategory,
  extractFirstPage,
  extractProblemNumber,
  getDayOfWeek,
} from "@/components/learning/homework-analysis";

export default function HomeworkTab() {
  const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("all");
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [classSchedules, setClassSchedules] = useState<ClassSchedule[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  // 데이터 상태
  const [dailyWorks, setDailyWorks] = useState<DailyWorkData[]>([]);
  const [homeworks, setHomeworks] = useState<HomeworkData[]>([]);
  const [problemResults, setProblemResults] = useState<ProblemResult[]>([]);
  const [dwHomeworkMappings, setDwHomeworkMappings] = useState<DailyWorkHomeworkMapping[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 반별 접기/펼치기 상태
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

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
        const teacherData = data as TeacherInfo[];
        setTeachers(teacherData);
        const defaultTeacher = teacherData.find((t) => t.name === "박석돈");
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
    const dayOfWeek = getDayOfWeek(selectedDate);
    const classIdsWithSchedule = classSchedules
      .filter((s) => s.day_of_week === dayOfWeek)
      .map((s) => s.class_id);

    return classes.filter((c) => {
      const hasSchedule = classIdsWithSchedule.includes(c.id);
      const teacherMatch =
        selectedTeacherId === "all" || c.teacher_id === selectedTeacherId;
      return hasSchedule && teacherMatch;
    });
  }, [selectedDate, classSchedules, classes, selectedTeacherId]);

  // 데이터 로드 (homework → mapping → daily_work → problem_results)
  useEffect(() => {
    async function loadData() {
      if (!selectedDate || todayClasses.length === 0) {
        setDailyWorks([]);
        setHomeworks([]);
        setProblemResults([]);
        setDwHomeworkMappings([]);
        return;
      }

      setIsLoading(true);

      try {
        const classIds = todayClasses.map((c) => c.id);

        // 1. 숙제 데이터 로드
        const { data: hwData, error: hwError } = await supabase
          .from("mathflat_homework")
          .select("*")
          .eq("homework_date", selectedDate)
          .in("class_id", classIds);

        if (hwError) throw hwError;
        setHomeworks((hwData || []) as HomeworkData[]);

        // 2. 숙제가 있는 학생들의 mathflat_student_id 추출
        const studentIds = [...new Set((hwData || []).map((h: HomeworkData) => h.mathflat_student_id))];

        // 3. Daily work 데이터 로드 (해당 학생들의 당일 활동)
        if (studentIds.length > 0) {
          const { data: dwData, error: dwError } = await supabase
            .from("mathflat_daily_work")
            .select("*")
            .eq("work_date", selectedDate)
            .in("mathflat_student_id", studentIds);

          if (dwError) throw dwError;
          setDailyWorks((dwData || []) as DailyWorkData[]);

          // 4. daily_work ↔ homework 매핑 로드
          const dailyWorkIds = (dwData || []).map((dw: DailyWorkData) => dw.id);
          const homeworkIds = (hwData || []).map((h: HomeworkData) => h.id);

          if (dailyWorkIds.length > 0 && homeworkIds.length > 0) {
            const { data: mappingData, error: mappingError } = await supabase
              .from("mathflat_daily_work_homework")
              .select("*")
              .in("daily_work_id", dailyWorkIds)
              .in("homework_id", homeworkIds);

            if (mappingError) throw mappingError;
            setDwHomeworkMappings((mappingData || []) as DailyWorkHomeworkMapping[]);
          } else {
            setDwHomeworkMappings([]);
          }

          // 5. problem_results 로드 (daily_work_id 기반)
          if (dailyWorkIds.length > 0) {
            const { data: prData, error: prError } = await supabase
              .from("mathflat_problem_results")
              .select("*")
              .in("daily_work_id", dailyWorkIds);

            if (prError) throw prError;
            setProblemResults((prData || []) as ProblemResult[]);
          } else {
            setProblemResults([]);
          }
        } else {
          setDailyWorks([]);
          setDwHomeworkMappings([]);
          setProblemResults([]);
        }

        expandAllClasses(classIds);
      } catch (error) {
        console.error("데이터 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [selectedDate, todayClasses]);

  // 반별 데이터 처리
  const classSummaries = useMemo((): ClassSummary[] => {
    if (homeworks.length === 0) return [];

    // 반별로 숙제 그룹화
    const classHomeworkMap = new Map<string, HomeworkData[]>();
    homeworks.forEach((hw) => {
      if (!hw.class_id) return;
      const list = classHomeworkMap.get(hw.class_id) || [];
      list.push(hw);
      classHomeworkMap.set(hw.class_id, list);
    });

    const summaries: ClassSummary[] = [];

    classHomeworkMap.forEach((classHomeworks, classId) => {
      const classInfo = classes.find((c) => c.id === classId);
      if (!classInfo) return;

      // 학생별 mathflat_student_id 목록
      const studentIds = [...new Set(classHomeworks.map((h) => h.mathflat_student_id))];

      // 학생별 요약 생성
      const students: StudentLearingSummary[] = studentIds.map((studentId) => {
        const studentHomeworks = classHomeworks.filter(
          (h) => h.mathflat_student_id === studentId
        );
        const studentName = studentHomeworks[0]?.student_name || "알 수 없음";

        // 숙제별 상세 계산 (매핑을 통해 daily_work 통계 활용)
        const homeworkDetails = studentHomeworks.map((hw) => {
          // 숙제에 매핑된 daily_work 찾기
          const mappings = dwHomeworkMappings.filter(m => m.homework_id === hw.id);
          const mappedDwIds = mappings.map(m => m.daily_work_id);
          const mappedDailyWorks = dailyWorks.filter(dw => mappedDwIds.includes(dw.id));

          // daily_work 통계 합산
          const total = mappedDailyWorks.reduce((sum, dw) => sum + (dw.assigned_count || 0), 0);
          const correct = mappedDailyWorks.reduce((sum, dw) => sum + (dw.correct_count || 0), 0);
          const wrong = mappedDailyWorks.reduce((sum, dw) => sum + (dw.wrong_count || 0), 0);
          const solved = correct + wrong;
          const notSolved = total - solved;

          return {
            title: hw.title || "",
            page: hw.page,
            total,
            solved,
            correct,
            wrong,
            notSolved,
            completionRate: total > 0 ? Math.round((solved / total) * 100) : 0,
            correctRate: solved > 0 ? Math.round((correct / solved) * 100) : 0,
          };
        });

        // 전체 숙제 통계
        const totalProblems = homeworkDetails.reduce((sum, h) => sum + h.total, 0);
        const totalSolved = homeworkDetails.reduce((sum, h) => sum + h.solved, 0);
        const totalCorrect = homeworkDetails.reduce((sum, h) => sum + h.correct, 0);

        // 자율학습 데이터
        const studentDailyWorks = dailyWorks.filter(
          (dw) =>
            dw.mathflat_student_id === studentId &&
            (dw.category === "CHALLENGE" || dw.category === "CHALLENGE_WRONG")
        );

        const selfStudyCategories: Record<SelfStudyCategory, number> = {
          CHALLENGE: 0,
          CHALLENGE_WRONG: 0,
        };

        let selfStudyTotal = 0;
        let selfStudyCorrect = 0;

        studentDailyWorks.forEach((dw) => {
          const count = dw.assigned_count || 0;
          const correct = dw.correct_count || 0;
          selfStudyTotal += count;
          selfStudyCorrect += correct;
          if (dw.category === "CHALLENGE" || dw.category === "CHALLENGE_WRONG") {
            selfStudyCategories[dw.category as SelfStudyCategory] += count;
          }
        });

        // 취약 개념 (매핑을 통해 해당 학생의 숙제 관련 오답 찾기)
        const studentHwIds = studentHomeworks.map((h) => h.id);
        const studentMappedDwIds = dwHomeworkMappings
          .filter(m => studentHwIds.includes(m.homework_id))
          .map(m => m.daily_work_id);
        const wrongConcepts = problemResults
          .filter(
            (p) =>
              studentMappedDwIds.includes(p.daily_work_id) &&
              (p.result === "WRONG" || p.result === "UNKNOWN") &&
              p.concept_name
          )
          .map((p) => p.concept_name!);

        const uniqueWeakConcepts = [...new Set(wrongConcepts)];

        return {
          studentName,
          mathflatStudentId: studentId,
          homeworks: homeworkDetails,
          totalCompletionRate:
            totalProblems > 0 ? Math.round((totalSolved / totalProblems) * 100) : 0,
          totalCorrectRate:
            totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0,
          selfStudy: {
            total: selfStudyTotal,
            correctRate:
              selfStudyTotal > 0
                ? Math.round((selfStudyCorrect / selfStudyTotal) * 100)
                : 0,
            categories: selfStudyCategories,
          },
          weakConcepts: uniqueWeakConcepts,
        };
      });

      // 완료율 기준 정렬 (낮은 순)
      students.sort((a, b) => a.totalCompletionRate - b.totalCompletionRate);

      // 공통 오답 문제 분석 (매핑을 통해 연결)
      const classHwIds = classHomeworks.map((h) => h.id);
      const classMappings = dwHomeworkMappings.filter(m => classHwIds.includes(m.homework_id));
      const classMappedDwIds = classMappings.map(m => m.daily_work_id);
      const wrongProblemMap = new Map<string, CommonWrongProblem>();

      problemResults
        .filter((p) => classMappedDwIds.includes(p.daily_work_id) && (p.result === "WRONG" || p.result === "UNKNOWN"))
        .forEach((p) => {
          const key = p.problem_id;
          // daily_work에서 학생 이름 찾기
          const dw = dailyWorks.find(d => d.id === p.daily_work_id);
          const studentName = dw?.student_name || "알 수 없음";
          // 매핑을 통해 숙제 정보 찾기
          const mapping = classMappings.find(m => m.daily_work_id === p.daily_work_id);
          const hw = mapping ? classHomeworks.find(h => h.id === mapping.homework_id) : null;

          if (wrongProblemMap.has(key)) {
            const existing = wrongProblemMap.get(key)!;
            if (!existing.wrongStudents.includes(studentName)) {
              existing.wrongStudents.push(studentName);
              existing.wrongCount++;
            }
          } else {
            wrongProblemMap.set(key, {
              problemId: p.problem_id,
              bookTitle: hw?.title || dw?.title || null,
              page: hw?.page || dw?.page || null,
              problemTitle: p.problem_title,
              problemNumber: p.problem_number,
              level: p.level,
              wrongCount: 1,
              wrongStudents: [studentName],
              conceptName: p.concept_name,
              problemImageUrl: p.problem_image_url,
              solutionImageUrl: p.solution_image_url,
            });
          }
        });

      const commonWrongProblems = Array.from(wrongProblemMap.values())
        .filter((p) => p.wrongCount >= 2)
        .sort((a, b) => {
          const titleCompare = (a.bookTitle || "").localeCompare(b.bookTitle || "", "ko");
          if (titleCompare !== 0) return titleCompare;
          const pageCompare = extractFirstPage(a.page) - extractFirstPage(b.page);
          if (pageCompare !== 0) return pageCompare;
          return extractProblemNumber(a.problemNumber) - extractProblemNumber(b.problemNumber);
        });

      // 개념별 약점 분석 (매핑을 통해 연결)
      const conceptWeaknessMap = new Map<string, ConceptWeakness>();

      problemResults
        .filter(
          (p) =>
            classMappedDwIds.includes(p.daily_work_id) &&
            (p.result === "WRONG" || p.result === "UNKNOWN") &&
            p.concept_name
        )
        .forEach((p) => {
          const dw = dailyWorks.find(d => d.id === p.daily_work_id);
          const studentName = dw?.student_name || "알 수 없음";
          const mapping = classMappings.find(m => m.daily_work_id === p.daily_work_id);
          const hw = mapping ? classHomeworks.find(h => h.id === mapping.homework_id) : null;
          const key = p.concept_name!;

          if (conceptWeaknessMap.has(key)) {
            const existing = conceptWeaknessMap.get(key)!;
            if (!existing.wrongStudents.includes(studentName)) {
              existing.wrongStudents.push(studentName);
              existing.wrongCount++;
            }
            existing.relatedProblems.push({
              page: hw?.page || dw?.page || null,
              problemNumber: p.problem_number,
            });
          } else {
            conceptWeaknessMap.set(key, {
              conceptName: key,
              wrongCount: 1,
              wrongStudents: [studentName],
              relatedProblems: [
                {
                  page: hw?.page || dw?.page || null,
                  problemNumber: p.problem_number,
                },
              ],
            });
          }
        });

      const conceptWeaknesses = Array.from(conceptWeaknessMap.values())
        .filter((c) => c.wrongCount >= 2)
        .sort((a, b) => b.wrongCount - a.wrongCount);

      // 반 통계
      const avgCompletionRate =
        students.length > 0
          ? Math.round(
              students.reduce((sum, s) => sum + s.totalCompletionRate, 0) /
                students.length
            )
          : 0;

      const avgCorrectRate =
        students.length > 0
          ? Math.round(
              students.reduce((sum, s) => sum + s.totalCorrectRate, 0) /
                students.length
            )
          : 0;

      const totalSelfStudyProblems = students.reduce(
        (sum, s) => sum + s.selfStudy.total,
        0
      );

      const topWeakConcepts = conceptWeaknesses.slice(0, 3).map((c) => c.conceptName);

      summaries.push({
        classId,
        className: classInfo.name,
        students,
        commonWrongProblems,
        conceptWeaknesses,
        avgCompletionRate,
        avgCorrectRate,
        totalStudents: students.length,
        totalSelfStudyProblems,
        topWeakConcepts,
      });
    });

    // 반 이름순 정렬
    summaries.sort((a, b) => a.className.localeCompare(b.className, "ko"));

    return summaries;
  }, [homeworks, dailyWorks, problemResults, dwHomeworkMappings, classes]);

  return (
    <div className="space-y-4">
      {/* 날짜 헤더 */}
      <HomeworkAnalysisHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        teachers={teachers}
        selectedTeacherId={selectedTeacherId}
        onTeacherChange={setSelectedTeacherId}
        todayClasses={todayClasses}
      />

      {/* 로딩 상태 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin"></div>
            <span className="text-slate-500 text-sm">
              학습 데이터를 불러오는 중...
            </span>
          </div>
        </div>
      ) : classSummaries.length === 0 ? (
        /* 데이터 없음 */
        <Card className="p-10 text-center border-0 shadow-lg">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-slate-100 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">
            학습 데이터가 없습니다
          </h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            {todayClasses.length === 0
              ? "선택한 날짜에 수업이 있는 반이 없습니다."
              : "선택한 날짜에 수집된 학습 데이터가 없습니다. 다른 날짜를 선택해주세요."}
          </p>
        </Card>
      ) : (
        /* 반별 카드 */
        <div className="space-y-4">
          {classSummaries.map((classSummary) => (
            <ClassSummaryCard
              key={classSummary.classId}
              classSummary={classSummary}
              isExpanded={expandedClasses.has(classSummary.classId)}
              onToggle={() => toggleClass(classSummary.classId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
