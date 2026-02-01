import React from "react"

interface Schedule {
  day_of_week: string
  start_time: string
  end_time: string
}

interface Class {
  id: string
  name: string
  subject: string
  teacher_id: string | null
  monthly_fee?: number
  schedules?: Schedule[]
}

interface Teacher {
  id: string
  name: string
  position?: string
}

interface PrintScheduleGridProps {
  classes: Class[]
  teachers: Teacher[]
  studentsCountMap: Record<string, number>
  currentDate: Date
}

const DAYS = ['월', '화', '수', '목', '금', '토', '일'] as const
const START_HOUR = 9
const END_HOUR = 22

// 과목별 색상 (인쇄용 - 채도 높게)
const SUBJECT_PRINT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  '수학': { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' },
  '수학특강': { bg: '#EDE9FE', border: '#8B5CF6', text: '#5B21B6' },
  '과학': { bg: '#D1FAE5', border: '#10B981', text: '#047857' },
  '과학특강': { bg: '#FEF3C7', border: '#F59E0B', text: '#B45309' },
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours - START_HOUR) * 60 + minutes
}

export function PrintScheduleGrid({
  classes,
  teachers,
  studentsCountMap,
  currentDate,
}: PrintScheduleGridProps) {
  // 스케줄 슬롯 생성
  const scheduleSlots = classes.flatMap((classData) => {
    if (!classData.schedules) return []

    return classData.schedules.map((schedule) => {
      const dayIndex = DAYS.indexOf(schedule.day_of_week as typeof DAYS[number])
      if (dayIndex === -1) return null

      const startMinutes = timeToMinutes(schedule.start_time)
      const endMinutes = timeToMinutes(schedule.end_time)

      if (startMinutes < 0 || endMinutes > (END_HOUR - START_HOUR) * 60) return null

      const teacher = teachers.find((t) => t.id === classData.teacher_id)

      return {
        classData,
        schedule,
        teacher,
        dayIndex,
        startMinutes,
        endMinutes,
      }
    }).filter(Boolean)
  })

  // 요일별로 그룹화하고 겹침 계산
  const slotsByDay: Record<number, typeof scheduleSlots> = {}
  DAYS.forEach((_, index) => {
    slotsByDay[index] = scheduleSlots.filter((slot) => slot?.dayIndex === index)
  })

  // 겹치는 슬롯 계산
  const calculateLayout = (daySlots: typeof scheduleSlots) => {
    const result: Map<any, { columnIndex: number; totalColumns: number }> = new Map()

    if (daySlots.length === 0) return result

    const sorted = [...daySlots].sort((a, b) => (a?.startMinutes || 0) - (b?.startMinutes || 0))
    const groups: any[][] = []

    sorted.forEach((slot) => {
      if (!slot) return
      let addedToGroup = false

      for (const group of groups) {
        const overlaps = group.some(
          (existing) =>
            slot.startMinutes < existing.endMinutes &&
            slot.endMinutes > existing.startMinutes
        )

        if (overlaps) {
          group.push(slot)
          addedToGroup = true
          break
        }
      }

      if (!addedToGroup) {
        groups.push([slot])
      }
    })

    groups.forEach((group) => {
      const columnEndTimes: number[] = []

      group.forEach((slot) => {
        let assignedColumn = -1
        for (let i = 0; i < columnEndTimes.length; i++) {
          if (columnEndTimes[i] <= slot.startMinutes) {
            assignedColumn = i
            columnEndTimes[i] = slot.endMinutes
            break
          }
        }

        if (assignedColumn === -1) {
          assignedColumn = columnEndTimes.length
          columnEndTimes.push(slot.endMinutes)
        }

        result.set(slot, { columnIndex: assignedColumn, totalColumns: 0 })
      })

      group.forEach((slot) => {
        const existing = result.get(slot)!
        result.set(slot, { ...existing, totalColumns: columnEndTimes.length })
      })
    })

    return result
  }

  const layoutByDay: Record<number, Map<any, { columnIndex: number; totalColumns: number }>> = {}
  DAYS.forEach((_, index) => {
    layoutByDay[index] = calculateLayout(slotsByDay[index])
  })

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
  }

  const hourLabels = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
  const gridHeight = (END_HOUR - START_HOUR) * 40 // 40px per hour for print

  return (
    <div className="print-schedule-container">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .print-schedule-container {
            width: 100%;
            font-size: 8px;
          }
        }
        @media screen {
          .print-schedule-container {
            padding: 20px;
            background: white;
            max-width: 1200px;
            margin: 0 auto;
          }
        }
        .print-schedule-container {
          font-family: 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
        }
        .print-schedule-container * {
          box-sizing: border-box;
        }

        /* Header */
        .schedule-print-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 3px solid #1e293b;
        }
        .schedule-print-title {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.5px;
        }
        .schedule-print-subtitle {
          font-size: 11px;
          color: #64748b;
          margin-top: 2px;
        }
        .schedule-print-date {
          font-size: 11px;
          color: #64748b;
          text-align: right;
        }
        .schedule-print-stats {
          font-size: 12px;
          font-weight: 600;
          color: #334155;
          margin-top: 2px;
        }

        /* Legend */
        .schedule-print-legend {
          display: flex;
          gap: 16px;
          margin-bottom: 10px;
          padding: 8px 12px;
          background: #f8fafc;
          border-radius: 6px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          color: #475569;
        }
        .legend-color {
          width: 14px;
          height: 14px;
          border-radius: 3px;
          border: 2px solid;
        }

        /* Grid Container */
        .schedule-print-grid {
          display: grid;
          grid-template-columns: 42px repeat(7, 1fr);
          border: 2px solid #cbd5e1;
          border-radius: 8px;
          overflow: hidden;
          background: white;
        }

        /* Day Header */
        .day-header {
          background: linear-gradient(180deg, #1e293b 0%, #334155 100%);
          color: white;
          padding: 8px 4px;
          text-align: center;
          font-weight: 700;
          font-size: 13px;
          border-left: 1px solid #475569;
        }
        .day-header:first-child {
          border-left: none;
        }
        .time-header {
          background: #f1f5f9;
          padding: 8px 4px;
          text-align: center;
          font-weight: 600;
          font-size: 10px;
          color: #64748b;
        }

        /* Time Column */
        .time-column {
          background: #f8fafc;
          border-right: 2px solid #e2e8f0;
          position: relative;
        }
        .time-label {
          position: absolute;
          right: 4px;
          font-size: 9px;
          font-weight: 600;
          color: #94a3b8;
          font-family: 'SF Mono', 'Consolas', monospace;
          transform: translateY(-50%);
        }

        /* Day Column */
        .day-column {
          position: relative;
          border-left: 1px solid #e2e8f0;
          background: white;
        }
        .hour-line {
          position: absolute;
          left: 0;
          right: 0;
          border-top: 1px solid #e2e8f0;
        }
        .half-hour-line {
          position: absolute;
          left: 0;
          right: 0;
          border-top: 1px dashed #f1f5f9;
        }

        /* Schedule Block */
        .schedule-print-block {
          position: absolute;
          border-radius: 4px;
          padding: 3px 4px;
          overflow: hidden;
          border-left: 3px solid;
          font-size: 8px;
          line-height: 1.3;
        }
        .block-name {
          font-weight: 700;
          font-size: 9px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .block-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1px;
          opacity: 0.85;
        }
        .block-time {
          font-size: 7px;
          font-family: 'SF Mono', 'Consolas', monospace;
        }
        .block-teacher {
          font-size: 7px;
        }
        .block-count {
          font-size: 7px;
          font-weight: 600;
          background: rgba(255,255,255,0.5);
          padding: 0 3px;
          border-radius: 2px;
        }

        /* Footer */
        .schedule-print-footer {
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 9px;
          color: #94a3b8;
        }
      ` }} />

      {/* Header */}
      <div className="schedule-print-header">
        <div>
          <div className="schedule-print-title">주간 시간표</div>
          <div className="schedule-print-subtitle">밸류인수학학원</div>
        </div>
        <div>
          <div className="schedule-print-date">{formatDate(currentDate)} 기준</div>
          <div className="schedule-print-stats">
            총 {classes.length}개 반 · {scheduleSlots.length}개 수업
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="schedule-print-legend">
        {Object.entries(SUBJECT_PRINT_COLORS).map(([subject, colors]) => (
          <div key={subject} className="legend-item">
            <div
              className="legend-color"
              style={{ backgroundColor: colors.bg, borderColor: colors.border }}
            />
            <span>{subject}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="schedule-print-grid">
        {/* Header Row */}
        <div className="time-header">시간</div>
        {DAYS.map((day) => (
          <div key={day} className="day-header">{day}요일</div>
        ))}

        {/* Time Column */}
        <div className="time-column" style={{ height: gridHeight }}>
          {hourLabels.map((hour) => (
            <div
              key={hour}
              className="time-label"
              style={{ top: (hour - START_HOUR) * 40 }}
            >
              {hour.toString().padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Day Columns */}
        {DAYS.map((day, dayIndex) => (
          <div key={day} className="day-column" style={{ height: gridHeight }}>
            {/* Hour lines */}
            {hourLabels.map((hour) => (
              <React.Fragment key={hour}>
                <div
                  className="hour-line"
                  style={{ top: (hour - START_HOUR) * 40 }}
                />
                <div
                  className="half-hour-line"
                  style={{ top: (hour - START_HOUR) * 40 + 20 }}
                />
              </React.Fragment>
            ))}

            {/* Schedule blocks */}
            {slotsByDay[dayIndex].map((slot, index) => {
              if (!slot) return null

              const layout = layoutByDay[dayIndex].get(slot) || { columnIndex: 0, totalColumns: 1 }
              const colors = SUBJECT_PRINT_COLORS[slot.classData.subject] || SUBJECT_PRINT_COLORS['수학']

              const top = (slot.startMinutes / 60) * 40
              const height = ((slot.endMinutes - slot.startMinutes) / 60) * 40
              const widthPercent = 100 / layout.totalColumns
              const leftPercent = layout.columnIndex * widthPercent

              const startTime = slot.schedule.start_time.substring(0, 5)
              const endTime = slot.schedule.end_time.substring(0, 5)
              const studentCount = studentsCountMap[slot.classData.id] || 0

              return (
                <div
                  key={`${slot.classData.id}-${dayIndex}-${index}`}
                  className="schedule-print-block"
                  style={{
                    top,
                    height,
                    left: `calc(${leftPercent}% + 2px)`,
                    width: `calc(${widthPercent}% - 4px)`,
                    backgroundColor: colors.bg,
                    borderLeftColor: colors.border,
                    color: colors.text,
                  }}
                >
                  <div className="block-name">{slot.classData.name}</div>
                  {height > 25 && (
                    <div className="block-info">
                      <span className="block-time">{startTime}-{endTime}</span>
                      <span className="block-count">{studentCount}명</span>
                    </div>
                  )}
                  {height > 40 && slot.teacher && (
                    <div className="block-teacher">{slot.teacher.name}</div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="schedule-print-footer">
        <span>* 시간표는 변경될 수 있습니다</span>
        <span>밸류인수학학원 · valueinmath.com</span>
      </div>
    </div>
  )
}
