"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Calendar,
  Users,
  FileText,
  Download,
  Activity,
  TrendingUp
} from "lucide-react"
import { toast } from "sonner"
import { SyncControl } from "@/components/analytics/mathflat/sync-control"
import { StudentRecords } from "@/components/analytics/mathflat/student-records"
import { SyncLogs } from "@/components/analytics/mathflat/sync-logs"

export default function MathFlatPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [selectedTab, setSelectedTab] = useState("overview")
  const [stats, setStats] = useState<any>(null)

  // 동기화 상태 확인
  const checkSyncStatus = async () => {
    try {
      const response = await fetch('/api/mathflat/sync')
      if (response.ok) {
        const data = await response.json()
        setSyncStatus(data)
      }
    } catch (error) {
      console.error('Failed to check sync status:', error)
    }
  }

  // 통계 데이터 가져오기
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/mathflat/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  useEffect(() => {
    // 페이지 로드 시 상태 확인 및 통계 가져오기
    checkSyncStatus()
    fetchStats()
  }, [])

  const handleManualSync = async () => {
    if (syncStatus?.isRunning) {
      toast.error('동기화가 이미 진행 중입니다.')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/mathflat/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // 지난 주 데이터 동기화
          dateRange: {
            start: getLastMonday(),
            end: getLastSunday()
          }
        })
      })

      const result = await response.json()
      
      if (response.ok && result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.error || '동기화 실패')
      }
      
      // 상태 및 통계 새로고침
      await checkSyncStatus()
      await fetchStats()
    } catch (error) {
      toast.error('동기화 중 오류가 발생했습니다.')
      console.error('Sync error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 날짜 헬퍼 함수
  const getLastMonday = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - dayOfWeek - 6 // 지난 주 월요일
    const monday = new Date(today.setDate(diff))
    return monday.toISOString().split('T')[0]
  }

  const getLastSunday = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - dayOfWeek // 지난 주 일요일
    const sunday = new Date(today.setDate(diff))
    return sunday.toISOString().split('T')[0]
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500">성공</Badge>
      case 'running':
        return <Badge className="bg-blue-500">진행중</Badge>
      case 'failed':
        return <Badge variant="destructive">실패</Badge>
      case 'partial':
        return <Badge className="bg-yellow-500">부분성공</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* 탭 네비게이션 */}
      <div className="flex items-center gap-2 border-b">
        <Link href="/analytics">
          <Button variant="ghost" className="rounded-none border-b-2 border-transparent hover:border-gray-300">
            <TrendingUp className="w-4 h-4 mr-2" />
            운영 통계
          </Button>
        </Link>
        <Button 
          variant="ghost" 
          className="rounded-none border-b-2 border-primary"
        >
          <Activity className="w-4 h-4 mr-2" />
          매쓰플랫
        </Button>
        <Link href="/analytics/student-timeline">
          <Button variant="ghost" className="rounded-none border-b-2 border-transparent hover:border-gray-300">
            <Calendar className="w-4 h-4 mr-2" />
            학생 타임라인
          </Button>
        </Link>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              <Users className="w-4 h-4 inline mr-2" />
              총 재원 학생
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalEnrolled || 0}명
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              등록된 전체 학생
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              <CheckCircle className="w-4 h-4 inline mr-2" />
              동기화 상태
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              저성과 학생
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.lowPerformers && stats.lowPerformers.length > 0 ? (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {stats.lowPerformers.map((student: any, idx: number) => (
                  <p key={idx} className="text-xs">
                    <span className="font-medium">{student.name}</span>
                    <span className="text-muted-foreground"> ({student.problemsSolved}문제, {student.accuracyRate}%)</span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">해당 없음</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              <FileText className="w-4 h-4 inline mr-2" />
              챌린지 Top 3
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.challengeTop3 && stats.challengeTop3.length > 0 ? (
              <div className="space-y-1">
                {stats.challengeTop3.map((student: any) => (
                  <div key={student.rank} className="flex items-center justify-between text-sm">
                    <span className="flex items-center">
                      <span className="font-bold mr-1">
                        {student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : '🥉'}
                      </span>
                      <span className="truncate">{student.name}</span>
                    </span>
                    <span className="text-muted-foreground">{student.problemsSolved}문제</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">데이터 없음</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 탭 컨텐츠 */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="records">학습 기록</TabsTrigger>
          <TabsTrigger value="logs">동기화 로그</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <SyncControl />
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          <StudentRecords />
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <SyncLogs logs={syncStatus?.recentLogs || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}