"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, RefreshCw, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HomeworkAlertStudent } from "@/hooks/use-homework-alerts";

const StudentLearningModal = dynamic(
  () => import("@/components/dashboard/StudentLearningModal"),
  { ssr: false }
);

interface HomeworkAlertCardProps {
  students: HomeworkAlertStudent[];
  stats: { total: number; critical: number; warning: number };
  lastCalculatedAt: string | null;
  loading?: boolean;
  onRefresh?: () => void;
}

function getGradeString(grade: number | null, schoolType: string | null): string {
  if (!grade || !schoolType) return '';
  const prefix = schoolType === '초등학교' ? '초' : schoolType === '중학교' ? '중' : '고';
  return `${prefix}${grade}`;
}

function formatLastUpdated(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  if (isToday) {
    return `오늘 ${hours}:${minutes}`;
  }

  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day} ${hours}:${minutes}`;
}

function CompletionBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            rate < 30 ? "bg-red-500" : rate < 60 ? "bg-amber-500" : "bg-green-500"
          )}
          style={{ width: `${Math.max(rate, 2)}%` }}
        />
      </div>
      <span className={cn(
        "text-xs font-bold tabular-nums",
        rate < 30 ? "text-red-600" : "text-amber-600"
      )}>
        {rate}%
      </span>
    </div>
  );
}

const SCROLL_HEIGHT = "max-h-[240px]";

export default function HomeworkAlertCard({
  students,
  stats,
  lastCalculatedAt,
  loading = false,
  onRefresh,
}: HomeworkAlertCardProps) {
  const [selectedStudent, setSelectedStudent] = useState<HomeworkAlertStudent | null>(null);

  const criticalStudents = students.filter(s => s.alert_level === 'critical');
  const warningStudents = students.filter(s => s.alert_level === 'warning');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            숙제 미완료 알림
          </CardTitle>
          <CardDescription className="text-xs">
            데이터를 로딩 중입니다...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                숙제 미완료 알림
                {stats.total > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {stats.total}명
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                최근 14일간 완료율 60% 미만
                {lastCalculatedAt && (
                  <span className="ml-2 text-muted-foreground">
                    · 업데이트: {formatLastUpdated(lastCalculatedAt)}
                  </span>
                )}
              </CardDescription>
            </div>
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onRefresh}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {students.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              숙제 완료율이 양호합니다
            </div>
          ) : (
            <>
              {/* 좌우 2컬럼: 위험 | 주의 */}
              <div className="grid grid-cols-2 gap-3">
                {/* 왼쪽: 매우위험 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                    <span>매우위험</span>
                    <Badge variant="destructive" className="h-4 text-[10px] px-1.5">
                      {criticalStudents.length}명
                    </Badge>
                  </div>
                  <div className={cn("space-y-1.5 overflow-y-auto pr-1", SCROLL_HEIGHT)}>
                    {criticalStudents.length > 0 ? (
                      criticalStudents.map(student => (
                        <StudentRow
                          key={student.id}
                          student={student}
                          variant="critical"
                          onClick={() => setSelectedStudent(student)}
                        />
                      ))
                    ) : (
                      <div className="text-center py-4 text-xs text-muted-foreground">
                        없음
                      </div>
                    )}
                  </div>
                </div>

                {/* 오른쪽: 주의 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                    <span>주의</span>
                    <Badge variant="outline" className="h-4 text-[10px] px-1.5 border-amber-300 text-amber-600">
                      {warningStudents.length}명
                    </Badge>
                  </div>
                  <div className={cn("space-y-1.5 overflow-y-auto pr-1", SCROLL_HEIGHT)}>
                    {warningStudents.length > 0 ? (
                      warningStudents.map(student => (
                        <StudentRow
                          key={student.id}
                          student={student}
                          variant="warning"
                          onClick={() => setSelectedStudent(student)}
                        />
                      ))
                    ) : (
                      <div className="text-center py-4 text-xs text-muted-foreground">
                        없음
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 바로가기 링크 */}
              <div className="pt-3 mt-3 border-t">
                <Link
                  href="/learning/homework-analysis"
                  className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  숙제 분석 페이지 바로가기
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 학습 분석 모달 */}
      {selectedStudent && (
        <StudentLearningModal
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          studentName={selectedStudent.name}
          mathflatStudentId={selectedStudent.mathflat_student_id}
          studentId={selectedStudent.id}
        />
      )}
    </>
  );
}

function StudentRow({
  student,
  variant,
  onClick,
}: {
  student: HomeworkAlertStudent;
  variant: 'critical' | 'warning';
  onClick: () => void;
}) {
  const gradeStr = getGradeString(student.grade, student.school_type);
  const notCompleted = student.total_homework_count - student.completed_homework_count;

  return (
    <div
      className={cn(
        "p-2 rounded-lg border transition-colors cursor-pointer",
        "hover:bg-accent",
        variant === 'critical' && "border-red-300 bg-red-50/50",
        variant === 'warning' && "border-amber-200 bg-amber-50/50"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 min-w-0">
          <span className="font-medium text-sm truncate">{student.name}</span>
          {gradeStr && (
            <span className="text-[10px] text-muted-foreground flex-shrink-0">{gradeStr}</span>
          )}
        </div>
        <CompletionBar rate={student.avg_completion_rate} />
      </div>
      <div className="flex items-center justify-between mt-0.5">
        {student.class_name && (
          <span className="text-[10px] text-muted-foreground truncate">
            {student.class_name}
          </span>
        )}
        <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-1">
          {notCompleted}/{student.total_homework_count}건
        </span>
      </div>
    </div>
  );
}
