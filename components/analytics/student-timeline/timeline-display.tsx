"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { ChevronDown, ChevronUp, Brain, BookOpen, TestTube, Users, AlertCircle } from "lucide-react"

interface TimelineData {
  date: string
  type: 'mathflat' | 'study_log' | 'test_log' | 'makeup' | 'consultation'
  title: string
  description?: string
  fullDescription?: string
  value?: number
  color: string
  icon: any
}

interface TimelineDisplayProps {
  timelineData: TimelineData[]
  loading: boolean
}

export function TimelineDisplay({ timelineData, loading }: TimelineDisplayProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // 데이터 타입 설정
  const dataTypeConfig = {
    mathflat: { color: 'bg-blue-500', lightColor: 'bg-blue-100', icon: Brain, label: '매쓰플랫' },
    study_log: { color: 'bg-green-500', lightColor: 'bg-green-100', icon: BookOpen, label: '학습일지' },
    test_log: { color: 'bg-purple-500', lightColor: 'bg-purple-100', icon: TestTube, label: '시험기록' },
    makeup: { color: 'bg-orange-500', lightColor: 'bg-orange-100', icon: Users, label: '보강수업' },
    consultation: { color: 'bg-red-500', lightColor: 'bg-red-100', icon: AlertCircle, label: '상담기록' }
  }

  // 날짜별로 그룹화
  const groupedData = timelineData.reduce((acc, item) => {
    const date = item.date
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(item)
    return acc
  }, {} as Record<string, TimelineData[]>)

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">데이터 로딩 중...</div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="relative">
        {/* 타임라인 라인 */}
        <div className="absolute left-12 top-0 bottom-0 w-0.5 bg-gray-200" />
        
        {/* 타임라인 아이템 */}
        <div className="space-y-8">
          {Object.entries(groupedData).map(([date, items]) => (
            <div key={date} className="relative">
              {/* 날짜 마커 */}
              <div className="absolute left-0 w-24 text-right pr-4">
                <div className="text-sm font-medium">
                  {format(new Date(date), 'MM/dd')}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(date), 'EEE', { locale: ko })}
                </div>
              </div>
              
              {/* 데이터 포인트 */}
              <div className="ml-32 space-y-3">
                {items.map((item, idx) => {
                  const config = dataTypeConfig[item.type]
                  const Icon = config.icon
                  const itemKey = `${date}-${idx}`
                  const isExpanded = expandedItems.has(itemKey)
                  const hasLongContent = item.type === 'consultation' && item.fullDescription && item.fullDescription.length > 100
                  
                  return (
                    <div
                      key={idx}
                      className={`relative p-4 rounded-lg border ${config.lightColor} border-l-4`}
                      style={{ borderLeftColor: config.color.replace('bg-', '') }}
                    >
                      {/* 아이콘 */}
                      <div className={`absolute -left-[52px] w-8 h-8 rounded-full ${config.color} flex items-center justify-center text-white`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      
                      {/* 내용 */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.title}</h4>
                          {item.description && (
                            <div className="mt-1">
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {isExpanded && item.fullDescription ? item.fullDescription : item.description}
                              </p>
                              {/* 더보기/접기 버튼 - 상담이고 내용이 긴 경우에만 표시 */}
                              {hasLongContent && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-2 p-0 h-auto text-xs text-blue-600 hover:text-blue-800"
                                  onClick={() => {
                                    const newExpanded = new Set(expandedItems)
                                    if (isExpanded) {
                                      newExpanded.delete(itemKey)
                                    } else {
                                      newExpanded.add(itemKey)
                                    }
                                    setExpandedItems(newExpanded)
                                  }}
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="h-3 w-3 mr-1" />
                                      접기
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-3 w-3 mr-1" />
                                      더보기
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* 값 표시 (점수, 정답률, 평점 등) */}
                        {item.value !== undefined && (
                          <div className="ml-4 flex-shrink-0">
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              item.type === 'study_log' ? (
                                // 학습일지는 1-5점 기준 (20점 단위)
                                item.value >= 80 ? 'bg-green-100 text-green-700 border border-green-200' :
                                item.value >= 60 ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                item.value >= 40 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                item.value >= 20 ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                                'bg-red-100 text-red-700 border border-red-200'
                              ) : (
                                // 다른 항목들은 기존 로직 유지
                                item.value >= 80 ? 'bg-green-100 text-green-700' :
                                item.value >= 60 ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              )
                            }`}>
                              {item.type === 'study_log' ? 
                                `평균 ${Math.round(item.value / 20)}` : // 평균 점수
                                item.type === 'test_log' ?
                                `${item.value}점` :
                                `${Math.round(item.value)}%`
                              }
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          
          {Object.keys(groupedData).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              선택한 기간에 데이터가 없습니다
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}