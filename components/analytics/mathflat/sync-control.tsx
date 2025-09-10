"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RefreshCw, Settings, CheckCircle } from "lucide-react"
import { toast } from "sonner"

export function SyncControl() {
  const [autoSync, setAutoSync] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const requestBody = {};
      console.log('Sync request: All students');
      
      const response = await fetch('/api/mathflat/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      // 응답이 비어있지 않은지 확인
      const text = await response.text()
      if (!text) {
        toast.error('서버 응답이 비어있습니다.')
        return
      }

      let result
      try {
        result = JSON.parse(text)
      } catch (e) {
        console.error('JSON parse error:', e)
        console.error('Response text:', text)
        toast.error('서버 응답 형식 오류')
        return
      }
      
      if (response.ok && result.success) {
        toast.success(result.message || '최신 데이터 동기화 완료')
        setLastSyncTime(new Date().toLocaleString('ko-KR'))
      } else {
        toast.error(result.error || '동기화 실패')
      }
    } catch (error) {
      toast.error('동기화 중 오류가 발생했습니다.')
      console.error('Sync error:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* 수동 동기화 */}
      <Card>
        <CardHeader>
          <CardTitle>수동 동기화</CardTitle>
          <CardDescription>
            모든 학생의 최신 학습 내역을 가져옵니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">동기화 정보</span>
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• 전체 재원 학생 포함</li>
              <li>• 각 학생의 최신 학습일 데이터</li>
              <li>• 4개 카테고리 (학습지, 교재, 오답/심화, 챌린지)</li>
            </ul>
          </div>

          {lastSyncTime && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <div className="text-sm">
                <p className="font-medium text-green-600 dark:text-green-400">
                  마지막 동기화
                </p>
                <p className="text-green-600 dark:text-green-400">
                  {lastSyncTime}
                </p>
              </div>
            </div>
          )}
          
          {!isSyncing ? (
            <Button 
              className="w-full" 
              onClick={handleSync}
              size="lg"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              최신 데이터 동기화
            </Button>
          ) : (
            <div className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                동기화 진행 중... 전체 학생 데이터를 수집하고 있습니다.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 자동 동기화 설정 */}
      <Card>
        <CardHeader>
          <CardTitle>자동 동기화 설정</CardTitle>
          <CardDescription>
            매일 오전 2시에 자동으로 동기화됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-sync">자동 동기화</Label>
              <p className="text-sm text-muted-foreground">
                매일 오전 2시에 실행
              </p>
            </div>
            <Switch
              id="auto-sync"
              checked={autoSync}
              onCheckedChange={setAutoSync}
            />
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Settings className="h-4 w-4" />
              <span>다음 예정: {new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR')} 오전 02:00</span>
            </div>
          </div>

          {autoSync && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                자동 동기화가 활성화되었습니다. 매일 새벽에 최신 학습 데이터가 자동으로 수집됩니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}