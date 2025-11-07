import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardList, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConsultationPageStats } from "@/types/consultation";

interface ConsultationStatsProps {
  stats: ConsultationPageStats;
  onRequestsClick: () => void;
}

export function ConsultationStats({ stats, onRequestsClick }: ConsultationStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">이번달 신규생</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold">{stats.newStudentsThisMonth}</span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-xs text-muted-foreground space-y-1 mt-2">
            {Object.entries(stats.newStudentsByDeptNames).map(([dept, names]) => (
              <div key={dept}>
                <span className="font-semibold">{dept}: </span>
                <span>{names.join(', ')}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">이번달 신규상담</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold">{stats.consultationsThisMonth}</span>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-xs text-muted-foreground space-y-1 mt-2">
            {Object.entries(stats.consultationsByDept).map(([dept, count]) => (
              <div key={dept}>{dept}: {count}건</div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">입학테스트 전환율</CardTitle>
          <CardDescription className="text-xs">
            전체: {stats.testConversionTotal.tests}/{stats.testConversionTotal.consultations}건
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-xs space-y-1">
            {Object.entries(stats.testConversionByDept).map(([dept, rate]) => (
              <div key={dept} className="flex justify-between">
                <span>{dept}:</span>
                <span className={cn(
                  "font-bold",
                  rate >= 70 ? "text-green-600" :
                  rate >= 40 ? "text-amber-600" :
                  "text-red-600"
                )}>
                  {rate}%
                </span>
              </div>
            ))}
            {Object.keys(stats.testConversionByDept).length === 0 && (
              <span className="text-muted-foreground">데이터 없음</span>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">신규등원 전환율</CardTitle>
          <CardDescription className="text-xs">
            전체: {stats.enrollmentConversionTotal.enrollments}/{stats.enrollmentConversionTotal.consultations}건
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-xs space-y-1">
            {Object.entries(stats.enrollmentConversionByDept).map(([dept, rate]) => (
              <div key={dept} className="flex justify-between">
                <span>{dept}:</span>
                <span className={cn(
                  "font-bold",
                  rate >= 50 ? "text-green-600" :
                  rate >= 25 ? "text-amber-600" :
                  "text-red-600"
                )}>
                  {rate}%
                </span>
              </div>
            ))}
            {Object.keys(stats.enrollmentConversionByDept).length === 0 && (
              <span className="text-muted-foreground">데이터 없음</span>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card
        className="cursor-pointer transition-colors hover:bg-accent"
        onClick={onRequestsClick}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            상담요청 현황
          </CardTitle>
          <CardDescription className="text-xs">
            재원생 상담 요청 관리
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">전체 요청</span>
              <span className="text-base font-bold">{stats.consultationRequestsTotal}건</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">대기중</span>
              <span className="text-base font-bold text-orange-600">{stats.consultationRequestsPending}건</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">완료</span>
              <span className="text-base font-bold text-green-600">{stats.consultationRequestsCompleted}건</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}