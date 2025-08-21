"use client";

import React from "react";
import { CalendarX, Clock, CheckCircle, Calendar, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MakeupStatsProps {
  stats: {
    weeklyAbsences: number;
    pendingMakeups: number;
    weeklyScheduled: number;
    monthlyCompleted: number;
    teacherStats: { name: string; count: number }[];
  };
}

export function MakeupStats({ stats }: MakeupStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {/* 이번주 결석 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">이번주 결석</CardTitle>
          <CalendarX className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.weeklyAbsences}건</div>
          <p className="text-xs text-muted-foreground">일요일~토요일</p>
        </CardContent>
      </Card>

      {/* 보강 미정 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">보강 미정</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{stats.pendingMakeups}건</div>
          <p className="text-xs text-muted-foreground">날짜 지정 필요</p>
        </CardContent>
      </Card>

      {/* 향후 7일 예정 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">향후 7일 예정</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.weeklyScheduled}건</div>
          <p className="text-xs text-muted-foreground">오늘부터 7일간</p>
        </CardContent>
      </Card>

      {/* 최근 30일 완료 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">최근 30일 완료</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.monthlyCompleted}건</div>
          <p className="text-xs text-muted-foreground">지난 30일간</p>
        </CardContent>
      </Card>

      {/* 최근 30일 선생님별 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">선생님별 완료</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {stats.teacherStats.length > 0 ? (
            <div className="space-y-1">
              {stats.teacherStats.slice(0, 3).map((teacher, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">{teacher.name}</span>
                  <span className="text-xs font-semibold">{teacher.count}건</span>
                </div>
              ))}
              {stats.teacherStats.length > 3 && (
                <div className="text-xs text-gray-400 text-center pt-1">
                  외 {stats.teacherStats.length - 3}명
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">데이터 없음</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}