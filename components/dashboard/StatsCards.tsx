'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Users, Phone, GraduationCap, TrendingUp, AlertCircle, Clock, 
  CreditCard, CheckSquare 
} from "lucide-react"

interface DashboardStats {
  activeStudents: number
  activeStudentsByDept: { [key: string]: number }
  activeStudentsChange: string
  consultationsThisMonth: number
  consultationsByDept: { [key: string]: number }
  consultationsYoY: string
  testsThisMonth: number
  testsByDept: { [key: string]: number }
  testConversionRate: string
  newEnrollmentsThisMonth: number
  newEnrollmentsByDept: { [key: string]: number }
  enrollmentConversionRate: string
  withdrawalsThisMonth: number
  withdrawalsByDept: { [key: string]: number }
  withdrawalsYoY: string
  // 새로운 통계 추가
  pendingMakeups: number // 보강 미정
  weeklyScheduledMakeups: number // 7일내 예정
  overdueScheduledMakeups: number // 기한 지난 미완료
  overdueTeachers: string[] // 기한 초과 담당 선생님들
  currentMonthPaidCount: number // 이번달 완납
  currentMonthUnpaidCount: number // 이번달 미납
  todosByAssignee: { [key: string]: number } // 담당자별 미완료 투두
  totalIncompleteTodos: number // 전체 미완료 투두 수
}

interface TeacherGroup {
  teacherName: string
  students: any[]
}

interface StatsCardsProps {
  stats: DashboardStats
  atRiskStudents: TeacherGroup[]
}

export function StatsCards({ stats, atRiskStudents }: StatsCardsProps) {
  return (
    <>
      {/* 상단 5개 카드 - 수정된 그리드 */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {/* 재원생 */}
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">재원생</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeStudents}명</div>
            <div className="text-xs text-muted-foreground space-y-1 mt-1">
              {Object.entries(stats.activeStudentsByDept).map(([dept, count]) => (
                <div key={dept}>{dept}: {count}명</div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 이번달 신규상담 */}
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번달 신규상담</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.consultationsThisMonth}건</div>
            <p className={`text-xs font-medium ${
              stats.consultationsYoY.startsWith('+') ? 'text-green-600' : 
              stats.consultationsYoY.startsWith('-') ? 'text-red-600' : 
              'text-muted-foreground'
            }`}>
              YoY {stats.consultationsYoY}
            </p>
            <div className="text-xs text-muted-foreground space-y-1 mt-1">
              {Object.entries(stats.consultationsByDept).map(([dept, count]) => (
                <div key={dept}>{dept}: {count}건</div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 이번달 입학테스트 */}
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번달 입학테스트</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.testsThisMonth}건</div>
            <p className={`text-xs font-medium ${
              parseFloat(stats.testConversionRate) >= 70 ? 'text-green-600' : 
              parseFloat(stats.testConversionRate) >= 40 ? 'text-amber-600' : 
              parseFloat(stats.testConversionRate) > 0 ? 'text-red-600' :
              'text-muted-foreground'
            }`}>
              전환율: {stats.testConversionRate}
            </p>
            <div className="text-xs text-muted-foreground space-y-1 mt-1">
              {Object.entries(stats.testsByDept).map(([dept, count]) => (
                <div key={dept}>{dept}: {count}건</div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 이번달 신규등원 */}
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번달 신규등원</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newEnrollmentsThisMonth}명</div>
            <p className={`text-xs font-medium ${
              parseFloat(stats.enrollmentConversionRate) >= 50 ? 'text-green-600' : 
              parseFloat(stats.enrollmentConversionRate) >= 25 ? 'text-amber-600' : 
              parseFloat(stats.enrollmentConversionRate) > 0 ? 'text-red-600' :
              'text-muted-foreground'
            }`}>
              전환율: {stats.enrollmentConversionRate}
            </p>
            <div className="text-xs text-muted-foreground space-y-1 mt-1">
              {Object.entries(stats.newEnrollmentsByDept).map(([dept, count]) => (
                <div key={dept}>{dept}: {count}명</div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 이번달 퇴원 */}
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번달 퇴원</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground rotate-180" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withdrawalsThisMonth}명</div>
            <p className={`text-xs font-medium ${
              stats.withdrawalsYoY.startsWith('-') ? 'text-green-600' :  // 퇴원은 감소가 좋음
              stats.withdrawalsYoY.startsWith('+') ? 'text-red-600' : 
              'text-muted-foreground'
            }`}>
              YoY {stats.withdrawalsYoY}
            </p>
            <div className="text-xs text-muted-foreground space-y-1 mt-1">
              {Object.entries(stats.withdrawalsByDept).map(([dept, count]) => (
                <div key={dept}>{dept}: {count}명</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 추가 통계 카드 5개 - 새로운 섹션 */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {/* 관리 필요 학생 */}
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">관리 필요 학생</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {atRiskStudents.reduce((total, group) => total + group.students.length, 0)}명
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              상담/케어 필요
            </p>
            <div className="text-xs text-muted-foreground space-y-1 mt-1">
              {atRiskStudents.slice(0, 3).map((group, index) => (
                <div key={`${group.teacherName}-${index}`}>
                  {group.teacherName}: {group.students.length}명
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 보강 관리 현황 */}
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">보강 관리</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">날짜 미정</span>
                <span className="text-sm font-semibold">{stats.pendingMakeups}건</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">7일내 예정</span>
                <span className="text-sm font-semibold text-blue-600">{stats.weeklyScheduledMakeups}건</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">기한 초과</span>
                <span className="text-sm font-semibold text-red-600">{stats.overdueScheduledMakeups}건</span>
              </div>
            </div>
            {stats.overdueScheduledMakeups > 0 && stats.overdueTeachers.length > 0 && (
              <p className="text-xs text-red-600 font-medium mt-2 truncate">
                {stats.overdueTeachers.join(', ')}: 관리 필요!
              </p>
            )}
          </CardContent>
        </Card>

        {/* 전환율 알림 */}
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전환율 관리</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">입학테스트<span className="text-[10px]">(목표60%)</span></span>
                  <span className={`text-sm font-semibold ${
                    parseFloat(stats.testConversionRate) >= 60 ? 'text-green-600' : 'text-amber-600'
                  }`}>
                    {stats.testConversionRate}
                  </span>
                </div>
                {parseFloat(stats.testConversionRate) < 60 && (
                  <p className="text-xs text-amber-600 font-medium mt-1 truncate">
                    적극 연락 필요!
                  </p>
                )}
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">신규등원<span className="text-[10px]">(목표50%)</span></span>
                  <span className={`text-sm font-semibold ${
                    parseFloat(stats.enrollmentConversionRate) >= 50 ? 'text-green-600' : 
                    parseFloat(stats.enrollmentConversionRate) >= 40 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {stats.enrollmentConversionRate}
                  </span>
                </div>
                {parseFloat(stats.enrollmentConversionRate) < 50 && (
                  <p className="text-xs text-red-600 font-medium mt-1 truncate">
                    등록 유도 강화!
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 학원비 납부 현황 */}
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번달 학원비</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">완납</span>
                <span className="text-sm font-semibold text-green-600">
                  {stats.currentMonthPaidCount}건
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">미납</span>
                <span className="text-sm font-semibold text-red-600">
                  {stats.currentMonthUnpaidCount}건
                </span>
              </div>
              <div className="pt-1 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">납부율</span>
                  <span className="text-sm font-semibold">
                    {stats.currentMonthPaidCount + stats.currentMonthUnpaidCount > 0
                      ? `${Math.round(
                          (stats.currentMonthPaidCount /
                            (stats.currentMonthPaidCount + stats.currentMonthUnpaidCount)) *
                            100
                        )}%`
                      : '0%'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5번째 카드 - Todo 관리 */}
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Todo 관리</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.keys(stats.todosByAssignee).length > 0 ? (
                Object.entries(stats.todosByAssignee).slice(0, 3).map(([assignee, count]) => (
                  <div key={assignee} className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground truncate">{assignee}</span>
                    <span className="text-sm font-semibold text-orange-600">{count}건</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-2">
                  없음
                </div>
              )}
              {Object.keys(stats.todosByAssignee).length > 3 && (
                <div className="text-xs text-muted-foreground text-center">
                  외 {Object.keys(stats.todosByAssignee).length - 3}명
                </div>
              )}
              {stats.totalIncompleteTodos > 0 && (
                <div className="pt-1 border-t mt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium">전체 미완료</span>
                    <span className="text-sm font-bold text-red-600">{stats.totalIncompleteTodos}건</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}