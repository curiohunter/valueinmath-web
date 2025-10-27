"use client"

import { useState, useMemo } from "react"
import { ActivityTimelineItem } from "@/types/portal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, ClipboardCheck, FileText, Calendar, MessageSquare, Target, ChevronDown } from "lucide-react"
import { format, subWeeks, isAfter } from "date-fns"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface ActivityTimelineProps {
  activities: ActivityTimelineItem[]
}

type PeriodType = "1" | "2" | "4" | "all"

const activityIcons = {
  study: BookOpen,
  test: ClipboardCheck,
  exam: FileText,
  makeup: Calendar,
  consultation: MessageSquare,
  mathflat: Target,
}

const activityColors = {
  study: "text-blue-500 bg-blue-50",
  test: "text-green-500 bg-green-50",
  exam: "text-purple-500 bg-purple-50",
  makeup: "text-orange-500 bg-orange-50",
  consultation: "text-pink-500 bg-pink-50",
  mathflat: "text-cyan-500 bg-cyan-50",
}

const activityLabels = {
  study: "학습 일지",
  test: "테스트",
  exam: "학교 시험",
  makeup: "보강 수업",
  consultation: "상담",
  mathflat: "매쓰플랫",
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const [period, setPeriod] = useState<PeriodType>("4")
  const [showAll, setShowAll] = useState(false)

  // Filter activities by period
  const filteredActivities = useMemo(() => {
    if (period === "all" || showAll) {
      return activities
    }

    const weeks = parseInt(period)
    const cutoffDate = subWeeks(new Date(), weeks)

    return activities.filter((activity) => {
      if (!activity.date) return false
      return isAfter(new Date(activity.date), cutoffDate)
    })
  }, [activities, period, showAll])

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups: { [date: string]: ActivityTimelineItem[] } = {}

    filteredActivities.forEach((activity) => {
      const dateKey = activity.date
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(activity)
    })

    return Object.entries(groups)
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .slice(0, showAll ? undefined : 20) // Limit to 20 dates when not showing all
  }, [filteredActivities, showAll])

  const hasMoreToShow = !showAll && filteredActivities.length > groupedActivities.flatMap(([, items]) => items).length

  return (
    <Card id="activity-timeline-section">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg font-semibold">최근 활동</CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={period === "1" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPeriod("1")
                setShowAll(false)
              }}
            >
              1주
            </Button>
            <Button
              variant={period === "2" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPeriod("2")
                setShowAll(false)
              }}
            >
              2주
            </Button>
            <Button
              variant={period === "4" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPeriod("4")
                setShowAll(false)
              }}
            >
              4주
            </Button>
            <Button
              variant={period === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPeriod("all")
                setShowAll(false)
              }}
            >
              전체
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredActivities.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">최근 활동이 없습니다.</p>
        ) : (
          <>
            <div className="space-y-6">
              {groupedActivities.map(([date, items]) => (
                <div key={date} className="relative">
                  {/* Date Header */}
                  <div className="sticky top-0 bg-background z-10 pb-2">
                    <span className="inline-block px-3 py-1 text-sm font-medium bg-muted rounded-full">
                      {format(new Date(date), "M월 d일 (E)", { locale: ko })}
                    </span>
                  </div>

                  {/* Timeline Items */}
                  <div className="relative pl-8 space-y-4">
                    {/* Vertical Line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                    {items.map((activity, index) => {
                      const Icon = activityIcons[activity.type]
                      const colorClass = activityColors[activity.type]
                      const label = activityLabels[activity.type]

                      return (
                        <div key={activity.id} className="relative">
                          {/* Timeline Dot */}
                          <div
                            className={cn(
                              "absolute -left-[1.125rem] top-2 w-6 h-6 rounded-full flex items-center justify-center border-2 border-background",
                              colorClass
                            )}
                          >
                            <Icon className="w-3 h-3" />
                          </div>

                          {/* Content Card */}
                          <div className="ml-6 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground">
                                  {label}
                                </span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <h3 className="text-sm font-semibold">{activity.title}</h3>
                              </div>
                            </div>
                            {activity.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {activity.description}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Show More Button */}
            {hasMoreToShow && (
              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  onClick={() => setShowAll(true)}
                  className="gap-2"
                >
                  더 보기
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
