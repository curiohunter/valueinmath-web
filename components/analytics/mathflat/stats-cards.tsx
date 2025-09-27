"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  TrendingDown,
  Target,
  Trophy,
  AlertTriangle
} from "lucide-react"
import type { MathflatStats } from "@/lib/mathflat/types"

export function StatsCards() {
  const [stats, setStats] = useState<MathflatStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/mathflat/stats')
      if (response.ok) {
        const { data } = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 카드 1: 교재 대비 학습지 정답률 낮은 학생 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2 text-yellow-500" />
            학습지 부진 학생
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <div className="animate-pulse bg-gray-200 h-4 w-full rounded" />
              <div className="animate-pulse bg-gray-200 h-4 w-3/4 rounded" />
            </div>
          ) : stats?.rateDifferenceStudents && stats.rateDifferenceStudents.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">
                교재 대비 학습지 정답률 낮은 TOP 5 (2주간)
              </p>
              {stats.rateDifferenceStudents.slice(0, 5).map((student, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate">{student.student_name}</span>
                  <span className="text-xs text-muted-foreground">
                    교재: {student.교재_rate}% / 학습지: {student.학습지_rate}%
                  </span>
                  <Badge variant="secondary" className="text-xs ml-2">
                    {student.difference}% 차이
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              학습지 정답률이 낮은 학생이 없습니다
            </div>
          )}
        </CardContent>
      </Card>

      {/* 카드 2: 교재 정답률 60% 이하 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center">
            <TrendingDown className="w-4 h-4 mr-2 text-red-500" />
            교재 저성과 학생
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <div className="animate-pulse bg-gray-200 h-4 w-full rounded" />
              <div className="animate-pulse bg-gray-200 h-4 w-3/4 rounded" />
            </div>
          ) : stats?.lowTextbookStudents && stats.lowTextbookStudents.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">
                교재 정답률 60% 이하 (2주간 평균)
              </p>
              {stats.lowTextbookStudents.slice(0, 5).map((student, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate">{student.student_name}</span>
                  <Badge variant="destructive" className="text-xs">
                    {student.average_rate}%
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              교재 정답률이 낮은 학생이 없습니다
            </div>
          )}
        </CardContent>
      </Card>

      {/* 카드 3: 챌린지/챌린지오답 상위 3명 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center">
            <Target className="w-4 h-4 mr-2 text-purple-500" />
            챌린지 우수 학생
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <div className="animate-pulse bg-gray-200 h-4 w-full rounded" />
              <div className="animate-pulse bg-gray-200 h-4 w-3/4 rounded" />
            </div>
          ) : stats?.topChallengeStudents && stats.topChallengeStudents.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">
                챌린지 문제 풀이 TOP 5 (2주간)
              </p>
              {stats.topChallengeStudents.slice(0, 5).map((student, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="flex items-center truncate">
                    <span className="font-bold mr-2">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}위`}
                    </span>
                    <span className="truncate">{student.student_name}</span>
                  </span>
                  <Badge className="text-xs bg-purple-100 text-purple-700">
                    {student.total_problems}문제
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              챌린지 기록이 없습니다
            </div>
          )}
        </CardContent>
      </Card>

      {/* 카드 4: 주간 랭킹 (주의필요 제거) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center">
            <Trophy className="w-4 h-4 mr-2 text-yellow-500" />
            2주간 랭킹
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="animate-pulse bg-gray-200 h-4 w-full rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {stats?.weeklyTopPerformers && stats.weeklyTopPerformers.length > 0 ? (
                <>
                  <p className="text-xs text-muted-foreground mb-2">
                    전체 문제 풀이 TOP 5 (2주간)
                  </p>
                  {stats.weeklyTopPerformers.slice(0, 5).map((student, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="flex items-center truncate">
                        <span className="font-bold mr-2">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}위`}
                        </span>
                        <span className="truncate">{student.student_name}</span>
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {student.total_problems}
                      </Badge>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">데이터 없음</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}