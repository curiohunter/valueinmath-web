"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChurnRiskStudent {
  id: string;
  name: string;
  grade: number | null;
  school_type: string | null;
  risk_score: number;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  risk_factors: string[];
  tenure_months: number;
  ai_churn_risk: string | null;
  trends?: {
    attendance: { trend: 'improving' | 'stable' | 'declining'; recent: number; previous: number } | null;
    mathflat: { trend: 'improving' | 'stable' | 'declining'; recent: number; previous: number } | null;
    consultation: { trend: 'improving' | 'stable' | 'declining' } | null;
  };
}

interface ChurnRiskCardProps {
  students: ChurnRiskStudent[];
  onStudentClick?: (student: ChurnRiskStudent) => void;
  loading?: boolean;
}

export default function ChurnRiskCard({
  students,
  onStudentClick,
  loading = false
}: ChurnRiskCardProps) {

  const getRiskVariant = (level: 'critical' | 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      default: return 'outline';
    }
  };

  const getRiskLabel = (level: 'critical' | 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'critical': return '매우 위험';
      case 'high': return '위험';
      case 'medium': return '주의';
      default: return '양호';
    }
  };

  const getGradeString = (grade: number | null, schoolType: string | null): string => {
    if (!grade || !schoolType) return '';
    const prefix = schoolType === '초등학교' ? '초' : schoolType === '중학교' ? '중' : '고';
    return `${prefix}${grade}`;
  };

  const getTrendIcon = (trend: 'improving' | 'stable' | 'declining' | undefined) => {
    if (trend === 'improving') return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (trend === 'declining') return <TrendingDown className="h-3 w-3 text-red-500" />;
    return null;
  };

  // 40점 이상만 필터링 (high, critical)
  const highRiskStudents = students
    .filter(s => s.risk_score >= 40)
    .sort((a, b) => b.risk_score - a.risk_score);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            이탈 위험 학생
          </CardTitle>
          <CardDescription className="text-xs">
            데이터를 로딩 중입니다...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (highRiskStudents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            이탈 위험 학생
          </CardTitle>
          <CardDescription className="text-xs">
            퇴원 위험도 40점 이상인 학생을 표시합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-sm text-muted-foreground">
            고위험 학생이 없습니다
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
          이탈 위험 학생
          <Badge variant="destructive" className="ml-2">
            {highRiskStudents.length}명
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          퇴원 위험도 40점 이상 (AI 상담분석 + 전환기 + 추세 기반)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {highRiskStudents.map((student) => (
          <div
            key={student.id}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer",
              "hover:bg-accent",
              student.risk_level === 'critical' && "border-red-300 bg-red-50/50",
              student.risk_level === 'high' && "border-orange-200 bg-orange-50/50"
            )}
            onClick={() => onStudentClick?.(student)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{student.name}</span>
                <span className="text-xs text-muted-foreground">
                  {getGradeString(student.grade, student.school_type)}
                </span>
                <Badge
                  variant={getRiskVariant(student.risk_level)}
                  className="h-5 text-xs"
                >
                  {getRiskLabel(student.risk_level)}
                </Badge>
                {/* 추세 아이콘 */}
                {student.trends?.mathflat?.trend && getTrendIcon(student.trends.mathflat.trend)}
                {student.trends?.consultation?.trend && getTrendIcon(student.trends.consultation.trend)}
              </div>
              {/* 위험 요인 표시 */}
              <div className="flex flex-wrap gap-1 mt-1">
                {student.risk_factors.slice(0, 3).map((factor, idx) => (
                  <span key={idx} className="text-[10px] text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
                    {factor}
                  </span>
                ))}
                {student.risk_factors.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{student.risk_factors.length - 3}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right ml-2">
              <div className={cn(
                "text-lg font-bold",
                student.risk_score >= 60 ? "text-red-600" : "text-orange-600"
              )}>
                {student.risk_score}점
              </div>
              <div className="text-[10px] text-muted-foreground">
                재원 {student.tenure_months}개월
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
