"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar,
  Activity,
  TrendingUp
} from "lucide-react"
import { toast } from "sonner"
import { StatsCards } from "@/components/analytics/mathflat/stats-cards"
import { SyncControl } from "@/components/analytics/mathflat/sync-control"
import { StudentRecords } from "@/components/analytics/mathflat/student-records"
import { SyncLogs } from "@/components/analytics/mathflat/sync-logs"

export default function MathFlatPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [selectedTab, setSelectedTab] = useState("overview")

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


  useEffect(() => {
    // 페이지 로드 시 상태 확인
    checkSyncStatus()
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
      
      // 상태 새로고침
      await checkSyncStatus()
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

      {/* 통계 카드 컴포넌트 */}
      <StatsCards />

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