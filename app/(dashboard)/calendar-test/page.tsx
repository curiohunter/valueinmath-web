'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import FullCalendarWrapper from '@/components/calendar/FullCalendarWrapper'

export default function CalendarTestPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">캘린더 테스트</h1>
        <Link href="/schedule">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
        </Link>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>FullCalendar 실험용 페이지</CardTitle>
        </CardHeader>
        <CardContent>
          <FullCalendarWrapper />
        </CardContent>
      </Card>
    </div>
  )
}