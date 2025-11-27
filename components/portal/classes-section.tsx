"use client"

import { ClassInfo } from "@/types/portal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Clock } from "lucide-react"

interface ClassesSectionProps {
  classes: ClassInfo[]
}

export function ClassesSection({ classes }: ClassesSectionProps) {
  // Group classes by subject
  const subjects = ['수학', '과학', '수학특강', '과학특강'] as const
  type Subject = typeof subjects[number]

  const groupedClasses: Record<Subject, ClassInfo[]> = {
    '수학': [],
    '과학': [],
    '수학특강': [],
    '과학특강': []
  }

  classes.forEach(cls => {
    const subject = cls.subject as Subject
    if (groupedClasses[subject]) {
      groupedClasses[subject].push(cls)
    }
  })

  // Format schedule string (e.g., "월수금 19:00-21:00")
  const formatSchedule = (schedules: ClassInfo['schedules']) => {
    if (!schedules || schedules.length === 0) return "시간표 미등록"

    // Group by time slots
    const timeGroups = new Map<string, string[]>()
    schedules.forEach(s => {
      const timeKey = `${s.start_time}-${s.end_time}`
      if (!timeGroups.has(timeKey)) {
        timeGroups.set(timeKey, [])
      }
      timeGroups.get(timeKey)!.push(s.day_of_week)
    })

    // Format each time group
    const formatted = Array.from(timeGroups.entries()).map(([time, days]) => {
      return `${days.join('')} ${time}`
    })

    return formatted.join(', ')
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">수강 중인 반</h2>

      {classes.length === 0 ? (
        <Card className="p-6">
          <p className="text-center text-muted-foreground">등록된 반이 없습니다.</p>
        </Card>
      ) : (
        <>
          {/* Desktop: 4-column grid */}
          <div className="hidden md:grid md:grid-cols-4 gap-4">
            {subjects.map(subject => (
              <div key={subject} className="space-y-3">
                {/* Column Header */}
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                      <span>{subject}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {groupedClasses[subject].length}개
                      </span>
                    </CardTitle>
                  </CardHeader>
                </Card>

                {/* Class Cards */}
                {groupedClasses[subject].length === 0 ? (
                  <Card className="bg-gray-50">
                    <CardContent className="p-4 text-center text-xs text-muted-foreground">
                      없음
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {groupedClasses[subject].map(classInfo => (
                      <Card key={classInfo.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 space-y-2">
                          {/* Class Name */}
                          <h3 className="font-semibold text-base">{classInfo.name}</h3>

                          {/* Teacher */}
                          {classInfo.teacher_name && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="w-3.5 h-3.5" />
                              <span>{classInfo.teacher_name}</span>
                            </div>
                          )}

                          {/* Schedule */}
                          <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <span className="break-words">{formatSchedule(classInfo.schedules)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mobile: Vertical stack */}
          <div className="md:hidden space-y-4">
            {subjects.map(subject => {
              // 해당 과목에 반이 없으면 표시하지 않음
              if (groupedClasses[subject].length === 0) return null

              return (
                <div key={subject} className="space-y-2">
                  {/* Subject Header */}
                  <div className="flex items-center justify-between px-1">
                    <span className="font-semibold text-gray-700">{subject}</span>
                    <span className="text-xs text-muted-foreground">
                      {groupedClasses[subject].length}개
                    </span>
                  </div>

                  {/* Class Cards */}
                  <div className="space-y-2">
                    {groupedClasses[subject].map(classInfo => (
                      <Card key={classInfo.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 space-y-2">
                          {/* Class Name */}
                          <h3 className="font-semibold text-base">{classInfo.name}</h3>

                          {/* Teacher */}
                          {classInfo.teacher_name && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="w-3.5 h-3.5" />
                              <span>{classInfo.teacher_name}</span>
                            </div>
                          )}

                          {/* Schedule */}
                          <div className="flex items-start gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <span className="break-words">{formatSchedule(classInfo.schedules)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
