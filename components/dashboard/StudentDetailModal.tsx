"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Phone,
  User,
  Calendar,
  School,
  BookOpen,
  TrendingDown,
  TrendingUp,
  Minus,
  Clock,
  ClipboardX,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ChurnRiskStudent } from "./ChurnRiskCard";
import type { Database } from "@/types/database";

type Student = Database["public"]["Tables"]["students"]["Row"];
type StudyLog = Database["public"]["Tables"]["study_logs"]["Row"];
type TestLog = Database["public"]["Tables"]["test_logs"]["Row"];
type MakeupClass = Database["public"]["Tables"]["makeup_classes"]["Row"];
type Class = Database["public"]["Tables"]["classes"]["Row"];

interface StudentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: ChurnRiskStudent | null;
}

interface StudentDetail extends Student {
  classes?: Array<{
    id: string;
    name: string;
    teacher_name: string;
  }>;
  recentStudyLogs?: StudyLog[];
  testLogs?: TestLog[];
  makeupClasses?: MakeupClass[];
}

export default function StudentDetailModal({
  isOpen,
  onClose,
  student,
}: StudentDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null);
  const [activeTab, setActiveTab] = useState("basic");
  const supabase = createClient();

  useEffect(() => {
    if (student && isOpen) {
      loadStudentDetail();
    }
  }, [student, isOpen]);

  const loadStudentDetail = async () => {
    if (!student) return;
    
    setLoading(true);
    try {
      // 1. 학생 기본 정보 로드
      const { data: studentData, error: studentError } = await supabase
        .from("student_with_school_info")
        .select("*")
        .eq("id", student.id)
        .single();

      if (studentError) throw studentError;

      // 2. 수강 반 정보 로드 (현재 활성화된 반만)
      const { data: classData, error: classError } = await supabase
        .from("class_students")
        .select(`
          class_id,
          classes!inner(
            id,
            name,
            is_active,
            teacher_id,
            employees!inner(name)
          )
        `)
        .eq("student_id", student.id)
        .eq("classes.is_active", true);

      if (classError) throw classError;

      // 3. 최근 1개월 학습 기록 로드
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      const { data: studyLogs, error: studyError } = await supabase
        .from("study_logs")
        .select("*")
        .eq("student_id", student.id)
        .gte("date", oneMonthAgo.toISOString().split("T")[0])
        .order("date", { ascending: false });

      if (studyError) throw studyError;

      // 4. 시험 기록 로드
      const { data: testLogs, error: testError } = await supabase
        .from("test_logs")
        .select("*")
        .eq("student_id", student.id)
        .order("date", { ascending: false })
        .limit(20);

      if (testError) throw testError;

      // 5. 보강 수업 로드
      const { data: makeupClasses, error: makeupError } = await supabase
        .from("makeup_classes")
        .select("*")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false });

      if (makeupError) throw makeupError;

      // 데이터 조합
      const detail: StudentDetail = {
        ...studentData,
        classes: classData?.map((c: any) => ({
          id: c.classes.id,
          name: c.classes.name,
          teacher_name: c.classes.employees.name,
        })) || [],
        recentStudyLogs: studyLogs || [],
        testLogs: testLogs || [],
        makeupClasses: makeupClasses || [],
      };

      setStudentDetail(detail);
    } catch (error) {
      console.error("학생 정보 로드 오류:", error);
      toast.error("학생 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case "critical":
        return "destructive";
      case "high":
        return "secondary";
      case "medium":
        return "outline";
      case "low":
        return "outline";
      default:
        return "outline";
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case "critical":
        return "매우 위험";
      case "high":
        return "위험";
      case "medium":
        return "주의";
      case "low":
        return "양호";
      default:
        return "양호";
    }
  };

  const getScoreColor = (score: number, type: "score" | "test" = "score") => {
    if (type === "test") {
      if (score < 60) return "text-red-500";
      if (score < 80) return "text-orange-500";
      return "text-green-500";
    }
    
    if (score < 2) return "text-red-500";
    if (score < 3) return "text-orange-500";
    if (score < 4) return "text-yellow-500";
    return "text-green-500";
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const copyPhoneNumber = (phone: string) => {
    navigator.clipboard.writeText(phone);
    toast.success("전화번호가 복사되었습니다.");
  };

  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{student.name} 학생 상세 정보</span>
            <Badge variant={getRiskBadgeVariant(student.risk_level)}>
              {getRiskLabel(student.risk_level)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            이탈 위험도: {student.risk_score}점 | 재원 {student.tenure_months}개월
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">기본 정보</TabsTrigger>
              <TabsTrigger value="study">학습 기록</TabsTrigger>
              <TabsTrigger value="test">시험 성적</TabsTrigger>
              <TabsTrigger value="makeup">보강 수업</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              {/* 위험 요인 카드 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">이탈 위험 요인</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 위험 요인 목록 */}
                  <div className="flex flex-wrap gap-2">
                    {student.risk_factors.map((factor, idx) => (
                      <Badge
                        key={idx}
                        variant={factor.startsWith("📈") ? "outline" : "secondary"}
                        className={cn(
                          "text-xs",
                          factor.startsWith("📈") && "bg-green-50 text-green-700 border-green-200"
                        )}
                      >
                        {factor}
                      </Badge>
                    ))}
                  </div>

                  {/* AI 상담 분석 */}
                  {student.ai_churn_risk && (
                    <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-800">AI 상담 분석</span>
                      </div>
                      <p className="text-sm text-amber-700">{student.ai_churn_risk}</p>
                    </div>
                  )}

                  {/* 추세 정보 */}
                  {student.trends && (
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      {student.trends.attendance && (
                        <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
                          <BookOpen className="h-5 w-5 text-gray-600 mb-1" />
                          <span className="text-xs text-gray-600">출석률</span>
                          <div className="flex items-center gap-1">
                            {student.trends.attendance.trend === 'improving' ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : student.trends.attendance.trend === 'declining' ? (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            ) : (
                              <Minus className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="text-sm font-medium">
                              {student.trends.attendance.recent}%
                            </span>
                          </div>
                        </div>
                      )}
                      {student.trends.mathflat && (
                        <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
                          <School className="h-5 w-5 text-gray-600 mb-1" />
                          <span className="text-xs text-gray-600">매쓰플랫</span>
                          <div className="flex items-center gap-1">
                            {student.trends.mathflat.trend === 'improving' ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : student.trends.mathflat.trend === 'declining' ? (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            ) : (
                              <Minus className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="text-sm font-medium">
                              {student.trends.mathflat.recent}%
                            </span>
                          </div>
                        </div>
                      )}
                      {student.trends.consultation && (
                        <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
                          <Clock className="h-5 w-5 text-gray-600 mb-1" />
                          <span className="text-xs text-gray-600">상담 추세</span>
                          <div className="flex items-center gap-1">
                            {student.trends.consultation.trend === 'improving' ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : student.trends.consultation.trend === 'declining' ? (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            ) : (
                              <Minus className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="text-sm font-medium">
                              {student.trends.consultation.trend === 'improving' ? '개선' :
                               student.trends.consultation.trend === 'declining' ? '악화' : '유지'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 학생 정보 카드 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">학생 정보</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ) : studentDetail ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          {studentDetail.grade ? `${studentDetail.grade}학년` : "학년 미정"} | 
                          {studentDetail.school || "학교 미정"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          시작일: {studentDetail.start_date ? format(new Date(studentDetail.start_date), "yyyy년 MM월 dd일") : "미정"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">학생: {studentDetail.student_phone || "없음"}</span>
                        {studentDetail.student_phone && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyPhoneNumber(studentDetail.student_phone!)}
                          >
                            복사
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">학부모: {studentDetail.parent_phone || "없음"}</span>
                        {studentDetail.parent_phone && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyPhoneNumber(studentDetail.parent_phone!)}
                          >
                            복사
                          </Button>
                        )}
                      </div>
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">수강 반</h4>
                        <div className="flex flex-wrap gap-2">
                          {studentDetail.classes?.map((cls) => (
                            <Badge key={cls.id} variant="secondary">
                              {cls.name} ({cls.teacher_name} 선생님)
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">정보를 불러올 수 없습니다.</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="study" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">최근 1개월 학습 기록</CardTitle>
                  <CardDescription>날짜별 출석, 숙제, 집중도 점수</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : studentDetail?.recentStudyLogs && studentDetail.recentStudyLogs.length > 0 ? (
                    <div className="overflow-auto max-h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>날짜</TableHead>
                            <TableHead>출석</TableHead>
                            <TableHead>숙제</TableHead>
                            <TableHead>집중도</TableHead>
                            <TableHead>교재1</TableHead>
                            <TableHead>교재2</TableHead>
                            <TableHead>메모</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {studentDetail.recentStudyLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="text-sm">
                                {format(new Date(log.date), "MM/dd (EEE)", { locale: ko })}
                              </TableCell>
                              <TableCell>
                                <span className={cn("font-medium", getScoreColor(log.attendance_status || 0))}>
                                  {log.attendance_status || "-"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className={cn("font-medium", getScoreColor(log.homework || 0))}>
                                  {log.homework || "-"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className={cn("font-medium", getScoreColor(log.focus || 0))}>
                                  {log.focus || "-"}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-gray-600">
                                {log.book1 && log.book1log ? `${log.book1}: ${log.book1log}` : "-"}
                              </TableCell>
                              <TableCell className="text-xs text-gray-600">
                                {log.book2 && log.book2log ? `${log.book2}: ${log.book2log}` : "-"}
                              </TableCell>
                              <TableCell className="text-xs text-gray-600 max-w-[200px] truncate">
                                {log.note || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-8">
                      최근 학습 기록이 없습니다.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="test" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">시험 성적 이력</CardTitle>
                  <CardDescription>최근 시험 점수 및 추이</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : studentDetail?.testLogs && studentDetail.testLogs.length > 0 ? (
                    <div className="overflow-auto max-h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>날짜</TableHead>
                            <TableHead>시험 유형</TableHead>
                            <TableHead>시험명</TableHead>
                            <TableHead>점수</TableHead>
                            <TableHead>메모</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {studentDetail.testLogs.map((test) => (
                            <TableRow key={test.id}>
                              <TableCell className="text-sm">
                                {format(new Date(test.date), "yyyy-MM-dd")}
                              </TableCell>
                              <TableCell className="text-sm">
                                {test.test_type || "일반"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {test.test || "-"}
                              </TableCell>
                              <TableCell>
                                <span className={cn("font-bold", getScoreColor(test.test_score || 0, "test"))}>
                                  {test.test_score ? `${test.test_score}점` : "-"}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs text-gray-600 max-w-[200px] truncate">
                                {test.note || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-8">
                      시험 기록이 없습니다.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="makeup" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">보강 수업 현황</CardTitle>
                  <CardDescription>결석 및 보강 일정</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : studentDetail?.makeupClasses && studentDetail.makeupClasses.length > 0 ? (
                    <div className="overflow-auto max-h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>유형</TableHead>
                            <TableHead>결석일</TableHead>
                            <TableHead>사유</TableHead>
                            <TableHead>보강일</TableHead>
                            <TableHead>상태</TableHead>
                            <TableHead>내용</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {studentDetail.makeupClasses.map((makeup) => (
                            <TableRow key={makeup.id}>
                              <TableCell>
                                <Badge variant="outline">
                                  {makeup.makeup_type === "absence" ? "결석 보강" : "추가 수업"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {makeup.absence_date
                                  ? format(new Date(makeup.absence_date), "MM/dd", { locale: ko })
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {makeup.absence_reason || "-"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {makeup.makeup_date
                                  ? format(new Date(makeup.makeup_date), "MM/dd", { locale: ko })
                                  : "미정"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    makeup.status === "completed"
                                      ? "default"
                                      : makeup.status === "scheduled"
                                      ? "secondary"
                                      : "outline"
                                  }
                                >
                                  {makeup.status === "completed"
                                    ? "완료"
                                    : makeup.status === "scheduled"
                                    ? "예정"
                                    : "취소"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-gray-600 max-w-[200px] truncate">
                                {makeup.content || "-"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-8">
                      보강 수업 기록이 없습니다.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          <Button
            onClick={() => {
              window.location.href = `/learning?student=${student.id}`;
            }}
          >
            학습 관리 페이지로 이동
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}