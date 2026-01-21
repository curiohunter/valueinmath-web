'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Users, Phone, GraduationCap, TrendingUp, MessageSquare, Clock,
  CreditCard, CheckSquare
} from "lucide-react"
import type { DashboardStats, StudentInfo } from "@/types/dashboard"

interface StatsCardsProps {
  stats: DashboardStats
}

// 학교타입+학년 포맷팅 함수: "홍길동(고2)"
const formatStudentWithGrade = (student: StudentInfo): string => {
  const schoolPrefix = student.school_type === '고등학교' ? '고'
    : student.school_type === '중학교' ? '중'
    : student.school_type === '초등학교' ? '초'
    : ''

  if (schoolPrefix && student.grade) {
    return `${student.name}(${schoolPrefix}${student.grade})`
  } else if (student.grade) {
    return `${student.name}(${student.grade}학년)`
  }
  return student.name
}

// 관별로 학생 그룹핑
const groupStudentsByDept = (students: StudentInfo[]): { [key: string]: StudentInfo[] } => {
  const grouped: { [key: string]: StudentInfo[] } = {}
  const order = ['영재관', '중등관', '고등관']

  // 순서대로 초기화
  order.forEach(dept => {
    grouped[dept] = []
  })

  students.forEach(student => {
    const dept = student.department || '기타'
    if (!grouped[dept]) grouped[dept] = []
    grouped[dept].push(student)
  })

  return grouped
}

// 관별 학생 이름 요약 (2명까지만 표시)
const formatDeptStudents = (dept: string, students: StudentInfo[]): string => {
  if (students.length === 0) return ''
  const names = students.slice(0, 2).map(s => formatStudentWithGrade(s)).join(', ')
  const extra = students.length > 2 ? ` 외${students.length - 2}` : ''
  return `${dept}: ${students.length}명 - ${names}${extra}`
}

export function StatsCards({ stats }: StatsCardsProps) {
  const [enrollmentModalOpen, setEnrollmentModalOpen] = useState(false)
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false)

  const enrollmentsByDept = groupStudentsByDept(stats.newEnrollmentStudents || [])
  const withdrawalsByDept = groupStudentsByDept(stats.withdrawalStudents || [])

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
            <div className="text-xs text-muted-foreground space-y-1 mt-1">
              {Object.entries(stats.testsByDept).map(([dept, count]) => (
                <div key={dept}>{dept}: {count}건</div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 이번달 신규등원 */}
        <Card
          className="min-w-0 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => stats.newEnrollmentsThisMonth > 0 && setEnrollmentModalOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번달 신규등원</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newEnrollmentsThisMonth}명</div>
            <div className="text-xs space-y-0.5 mt-1">
              {Object.entries(enrollmentsByDept)
                .filter(([_, students]) => students.length > 0)
                .map(([dept, students]) => (
                  <div key={dept} className="text-green-600 truncate">
                    {formatDeptStudents(dept, students)}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* 이번달 퇴원 */}
        <Card
          className="min-w-0 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => stats.withdrawalsThisMonth > 0 && setWithdrawalModalOpen(true)}
        >
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
            <div className="text-xs space-y-0.5 mt-1">
              {Object.entries(withdrawalsByDept)
                .filter(([_, students]) => students.length > 0)
                .map(([dept, students]) => (
                  <div key={dept} className="text-red-600 truncate">
                    {formatDeptStudents(dept, students)}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 추가 통계 카드 5개 - 새로운 섹션 */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {/* 재원생 상담 요청 */}
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">재원생 상담 요청</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">미배정 요청</span>
                <span className="text-sm font-semibold text-orange-600">
                  {stats.consultationRequestsUnassigned}건
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">대기중</span>
                <span className="text-sm font-semibold text-amber-600">
                  {stats.consultationRequestsPending}건
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">완료</span>
                <span className="text-sm font-semibold text-green-600">
                  {stats.consultationRequestsCompleted}건
                </span>
              </div>
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

        {/* 코호트 전환율 (정확한 코호트 기반 계산) */}
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">코호트 전환율</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {stats.cohortData && stats.cohortData.length > 0 ? (
                <>
                  {stats.cohortData.map((cohort, idx) => {
                    // 월 표시 형식 변환: "2024-12" -> "12월"
                    const monthNum = parseInt(cohort.month.split('-')[1])
                    const monthLabel = `${monthNum}월`
                    const isCurrentMonth = idx === 0

                    return (
                      <div key={cohort.month} className="space-y-0.5">
                        <div className="flex justify-between items-center">
                          <span className={`text-xs ${isCurrentMonth ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                            {monthLabel}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-semibold ${
                              cohort.conversionRate >= 50 ? 'text-green-600' :
                              cohort.conversionRate >= 30 ? 'text-amber-600' :
                              'text-red-600'
                            }`}>
                              {cohort.conversionRate}%
                            </span>
                            <span className={`text-[10px] ${
                              cohort.yoyChange?.startsWith('+') ? 'text-green-600' :
                              cohort.yoyChange?.startsWith('-') ? 'text-red-600' :
                              'text-muted-foreground'
                            }`}>
                              ({cohort.yoyChange || ''})
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                          <span>상담 {cohort.consultations}건</span>
                          <span>→ 등원 {cohort.enrollments}명</span>
                        </div>
                      </div>
                    )
                  })}
                </>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-2">
                  데이터 없음
                </div>
              )}
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

      {/* 신규등원 학생 전체 목록 모달 */}
      <Dialog open={enrollmentModalOpen} onOpenChange={setEnrollmentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>이번달 신규등원 학생</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {Object.entries(enrollmentsByDept)
              .filter(([_, students]) => students.length > 0)
              .map(([dept, students]) => (
                <div key={dept} className="space-y-1">
                  <h4 className="font-medium text-sm text-green-700">{dept} ({students.length}명)</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {students.map((student, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-2 py-1 text-xs bg-green-50 text-green-700 rounded"
                      >
                        {formatStudentWithGrade(student)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            {(stats.newEnrollmentStudents?.length || 0) === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                이번달 신규등원 학생이 없습니다.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 퇴원 학생 전체 목록 모달 */}
      <Dialog open={withdrawalModalOpen} onOpenChange={setWithdrawalModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>이번달 퇴원 학생</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {Object.entries(withdrawalsByDept)
              .filter(([_, students]) => students.length > 0)
              .map(([dept, students]) => (
                <div key={dept} className="space-y-1">
                  <h4 className="font-medium text-sm text-red-700">{dept} ({students.length}명)</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {students.map((student, idx) => (
                      <span
                        key={idx}
                        className="inline-block px-2 py-1 text-xs bg-red-50 text-red-700 rounded"
                      >
                        {formatStudentWithGrade(student)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            {(stats.withdrawalStudents?.length || 0) === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                이번달 퇴원 학생이 없습니다.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}