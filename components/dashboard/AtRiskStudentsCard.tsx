"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingDown, BookOpen, Clock, ClipboardX } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RiskFactor {
  attendanceAvg: number;     // 최근 1개월 출석 평균 (1-5)
  homeworkAvg: number;       // 최근 1개월 숙제 평균 (1-5)
  focusAvg: number;         // 최근 1개월 집중도 평균 (1-5)
  testScore: number | null; // 최근 시험 점수
  missingTests: number;     // 미응시 시험 수
}

export interface AtRiskStudent {
  studentId: string;
  studentName: string;
  className: string;
  teacherId: string;
  teacherName: string;
  riskLevel: 'high' | 'medium' | 'low';
  factors: RiskFactor;
  totalScore: number;       // 종합 위험 점수 (낮을수록 위험)
}

export interface TeacherGroup {
  teacherId: string;
  teacherName: string;
  students: AtRiskStudent[];
}

interface AtRiskStudentsCardProps {
  teacherGroups: TeacherGroup[];
  onStudentClick?: (student: AtRiskStudent) => void;
  loading?: boolean;
}

export default function AtRiskStudentsCard({ 
  teacherGroups, 
  onStudentClick,
  loading = false 
}: AtRiskStudentsCardProps) {
  
  const getRiskVariant = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getRiskLabel = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return '고위험';
      case 'medium': return '중위험';
      case 'low': return '주의';
      default: return '주의';
    }
  };

  const getRiskIcon = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high': return <AlertTriangle className="h-3 w-3" />;
      case 'medium': return <TrendingDown className="h-3 w-3" />;
      case 'low': return <Clock className="h-3 w-3" />;
      default: return null;
    }
  };

  const getFactorColor = (value: number, type: 'score' | 'test') => {
    if (type === 'test') {
      if (value === null) return 'text-red-500';
      if (value < 60) return 'text-red-500';
      if (value < 80) return 'text-orange-500';
      return 'text-green-500';
    }
    
    // For attendance, homework, focus (1-5 scale)
    if (value < 2) return 'text-red-500';
    if (value < 3) return 'text-orange-500';
    if (value < 4) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            관리 필요 학생
          </CardTitle>
          <CardDescription className="text-xs">
            데이터를 로딩 중입니다...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (teacherGroups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            관리 필요 학생
          </CardTitle>
          <CardDescription className="text-xs">
            성적 하락 위험이 있는 학생들을 표시합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-sm text-muted-foreground">
            위험 학생이 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          관리 필요 학생
        </CardTitle>
        <CardDescription className="text-xs">
          출석, 숙제, 집중도, 시험 점수 기준 하위 학생
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {teacherGroups.map((group) => (
          <div key={group.teacherId} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {group.teacherName} 선생님
              </h3>
              <span className="text-xs text-muted-foreground">
                {group.students.length > 0 ? `${group.students.length}명` : '위험 학생 없음'}
              </span>
            </div>
            <div className="space-y-2">
              {group.students.length > 0 ? (
                group.students.map((student) => (
                <div
                  key={student.studentId}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-colors",
                    "hover:bg-accent cursor-pointer",
                    student.riskLevel === 'high' && "border-red-200 bg-red-50/50",
                    student.riskLevel === 'medium' && "border-orange-200 bg-orange-50/50",
                    student.riskLevel === 'low' && "border-yellow-200 bg-yellow-50/50"
                  )}
                  onClick={() => onStudentClick?.(student)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{student.studentName}</span>
                      <span className="text-xs text-muted-foreground">{student.className}</span>
                      <Badge 
                        variant={getRiskVariant(student.riskLevel)}
                        className="h-5 text-xs flex items-center gap-1"
                      >
                        {getRiskIcon(student.riskLevel)}
                        {getRiskLabel(student.riskLevel)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3 text-muted-foreground" />
                        <span className={cn("text-xs", getFactorColor(student.factors.attendanceAvg, 'score'))}>
                          출석 {student.factors.attendanceAvg.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ClipboardX className="h-3 w-3 text-muted-foreground" />
                        <span className={cn("text-xs", getFactorColor(student.factors.homeworkAvg, 'score'))}>
                          숙제 {student.factors.homeworkAvg.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className={cn("text-xs", getFactorColor(student.factors.focusAvg, 'score'))}>
                          집중 {student.factors.focusAvg.toFixed(1)}
                        </span>
                      </div>
                      {student.factors.testScore !== null && (
                        <span className={cn("text-xs", getFactorColor(student.factors.testScore, 'test'))}>
                          시험 {Math.round(student.factors.testScore)}점
                        </span>
                      )}
                      {student.factors.missingTests > 0 && (
                        <span className="text-xs text-red-500 font-medium">
                          미응시 {student.factors.missingTests}회
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    위험도: {student.totalScore.toFixed(1)}
                  </div>
                </div>
              ))
              ) : (
                <div className="text-center py-3 text-xs text-muted-foreground bg-gray-50 rounded-lg">
                  현재 위험 학생이 없습니다
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}