"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Users,
  CheckCircle,
  AlertCircle,
  FileText,
  TrendingDown
} from "lucide-react"

interface StatsData {
  currentDate: string
  totalEnrolled: number
  syncedCount: number
  notSyncedCount: number
  notSyncedStudents: string[]
  lowPerformers: Array<{
    name: string
    problemsSolved: number
    accuracyRate: number
    categories: string
  }>
  challengeTop3: Array<{
    rank: number
    name: string
    problemsSolved: number
  }>
}

export function StatsCards() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/mathflat/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* 총 재원 학생 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            <Users className="w-4 h-4 inline mr-2" />
            총 재원 학생
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-12 flex items-center">
              <div className="animate-pulse bg-gray-200 h-8 w-20 rounded" />
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold">
                {stats?.totalEnrolled || 0}명
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                등록된 전체 학생
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* 동기화 상태 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            <CheckCircle className="w-4 h-4 inline mr-2" />
            동기화 상태
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-12 flex items-center">
              <div className="animate-pulse bg-gray-200 h-8 w-24 rounded" />
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold">
                {stats?.syncedCount || 0}/{stats?.totalEnrolled || 0}
              </div>
              {stats?.notSyncedStudents && stats.notSyncedStudents.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">미동기화:</p>
                  <div className="text-xs text-red-600 max-h-20 overflow-y-auto">
                    {stats.notSyncedStudents.join(', ')}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 저성과 학생 (최근 1주일, 학습지/교재) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            <TrendingDown className="w-4 h-4 inline mr-2" />
            저성과 학생
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            최근 1주일 학습지/교재
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <div className="animate-pulse bg-gray-200 h-4 w-full rounded" />
              <div className="animate-pulse bg-gray-200 h-4 w-3/4 rounded" />
            </div>
          ) : stats?.lowPerformers && stats.lowPerformers.length > 0 ? (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {stats.lowPerformers.map((student, idx) => (
                <div key={idx} className="text-xs">
                  <span className="font-medium">{student.name}</span>
                  <span className="text-muted-foreground">: {student.problemsSolved}문제, 정답률 {student.accuracyRate}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">해당 없음</p>
          )}
        </CardContent>
      </Card>

      {/* 챌린지 Top 3 (최근 1주일 합계) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            <FileText className="w-4 h-4 inline mr-2" />
            챌린지 Top 3
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            최근 1주일 문제 합계
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <div className="animate-pulse bg-gray-200 h-4 w-full rounded" />
              <div className="animate-pulse bg-gray-200 h-4 w-5/6 rounded" />
              <div className="animate-pulse bg-gray-200 h-4 w-4/6 rounded" />
            </div>
          ) : stats?.challengeTop3 && stats.challengeTop3.length > 0 ? (
            <div className="space-y-1">
              {stats.challengeTop3.map((student) => (
                <div key={student.rank} className="flex items-center justify-between text-sm">
                  <span className="flex items-center">
                    <span className="font-bold mr-1">
                      {student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : '🥉'}
                    </span>
                    <span className="truncate">{student.name}</span>
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {student.problemsSolved}문제
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">데이터 없음</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}