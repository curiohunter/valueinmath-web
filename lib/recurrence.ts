/**
 * 반복 일정 확장 유틸리티
 *
 * 반복 규칙(RecurrenceRule)을 기반으로 주어진 기간 내의 모든 인스턴스를 생성
 */

import { CalendarEvent, RecurrenceRule, FullCalendarEvent } from '@/types/calendar'

interface DateRange {
  start: Date
  end: Date
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 날짜/시간을 KST ISO 형식으로 포맷 (UTC 변환 없이)
 * 예: 2026-01-25T15:00:00
 */
function formatDateTimeKST(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

/**
 * 시간 문자열에서 시/분/초 추출
 * 예: "2026-01-25T15:30:00" -> { hours: 15, minutes: 30, seconds: 0 }
 */
function parseTimeFromString(timeStr: string): { hours: number; minutes: number; seconds: number } {
  // T 이후 부분 또는 공백 이후 부분에서 시간 추출
  const timePart = timeStr.includes('T')
    ? timeStr.split('T')[1]
    : timeStr.includes(' ')
      ? timeStr.split(' ')[1]
      : '00:00:00'

  // +09:00 또는 Z 제거
  const cleanTime = timePart.replace(/[Z+].*$/, '')
  const [hours, minutes, seconds] = cleanTime.split(':').map(Number)

  return {
    hours: hours || 0,
    minutes: minutes || 0,
    seconds: seconds || 0
  }
}

/**
 * 두 날짜가 같은 날인지 확인
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/**
 * 요일을 숫자로 변환 (MO=1, TU=2, ..., SU=7)
 */
function dayToNumber(day: string): number {
  const days: Record<string, number> = {
    'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6, 'SU': 0
  }
  return days[day] ?? -1
}

/**
 * 반복 규칙에 따라 다음 날짜 생성
 */
function getNextOccurrence(
  current: Date,
  rule: RecurrenceRule,
  originalDate: Date
): Date | null {
  const next = new Date(current)
  const interval = rule.interval ?? 1

  switch (rule.freq) {
    case 'daily':
      next.setDate(next.getDate() + interval)
      break

    case 'weekly':
      if (rule.byDay && rule.byDay.length > 0) {
        // 지정된 요일들 중 다음 요일 찾기
        const currentDay = next.getDay()
        const targetDays = rule.byDay.map(dayToNumber).sort((a, b) => a - b)

        let found = false
        for (const targetDay of targetDays) {
          if (targetDay > currentDay) {
            next.setDate(next.getDate() + (targetDay - currentDay))
            found = true
            break
          }
        }

        if (!found) {
          // 다음 주의 첫 번째 지정 요일로
          const daysUntilNextWeek = 7 - currentDay + targetDays[0]
          next.setDate(next.getDate() + daysUntilNextWeek)
        }
      } else {
        next.setDate(next.getDate() + (7 * interval))
      }
      break

    case 'monthly':
      if (rule.byDayOfMonth) {
        // 다음 달의 지정된 날짜로
        next.setMonth(next.getMonth() + interval)
        next.setDate(rule.byDayOfMonth)

        // 해당 월에 그 날짜가 없으면 (예: 2월 31일) 마지막 날로
        if (next.getDate() !== rule.byDayOfMonth) {
          next.setDate(0) // 이전 달의 마지막 날
        }
      } else {
        // 원래 날짜와 같은 날로
        const originalDay = originalDate.getDate()
        next.setMonth(next.getMonth() + interval)
        next.setDate(originalDay)

        if (next.getDate() !== originalDay) {
          next.setDate(0)
        }
      }
      break

    case 'yearly':
      next.setFullYear(next.getFullYear() + interval)
      break

    default:
      return null
  }

  return next
}

/**
 * 반복 일정의 모든 인스턴스 생성
 */
export function expandRecurringEvent(
  event: CalendarEvent,
  viewRange: DateRange,
  excludedDates: Set<string> = new Set() // 개별 수정/삭제된 날짜들
): CalendarEvent[] {
  const rule = event.recurrence_rule
  if (!rule) {
    return [event]
  }

  const instances: CalendarEvent[] = []

  // 원본 시간 정보 추출 (UTC 변환 없이 문자열에서 직접)
  const originalStartTime = parseTimeFromString(event.start_time)
  const originalEndTime = parseTimeFromString(event.end_time)

  // 날짜 객체 생성 (날짜 계산용)
  const eventStart = new Date(event.start_time)
  const eventEnd = new Date(event.end_time)
  const durationMs = eventEnd.getTime() - eventStart.getTime()

  // 종료 조건
  const until = rule.until ? new Date(rule.until + 'T23:59:59') : null
  const maxCount = rule.count ?? 365 // 최대 1년치
  const rangeEnd = until && until < viewRange.end ? until : viewRange.end

  let current = new Date(eventStart)
  let count = 0

  // 첫 번째 발생이 범위 내에 있으면 추가
  if (current >= viewRange.start && current <= rangeEnd) {
    const dateKey = formatDate(current)
    if (!excludedDates.has(dateKey)) {
      instances.push({
        ...event,
        id: `${event.id}_${dateKey}`, // 인스턴스 ID
      })
    }
    count++
  }

  // 나머지 발생 생성
  while (count < maxCount) {
    const next = getNextOccurrence(current, rule, eventStart)
    if (!next) break

    if (next > rangeEnd) break

    if (next >= viewRange.start) {
      const dateKey = formatDate(next)
      if (!excludedDates.has(dateKey)) {
        // 원본 시간을 유지하면서 새 날짜에 적용
        const instanceStart = new Date(next)
        instanceStart.setHours(originalStartTime.hours, originalStartTime.minutes, originalStartTime.seconds)

        const instanceEnd = new Date(next)
        instanceEnd.setHours(originalEndTime.hours, originalEndTime.minutes, originalEndTime.seconds)

        // 종료 시간이 시작 시간보다 작으면 다음 날로 (자정 넘김)
        if (instanceEnd <= instanceStart) {
          instanceEnd.setDate(instanceEnd.getDate() + 1)
        }

        instances.push({
          ...event,
          id: `${event.id}_${dateKey}`,
          start_time: formatDateTimeKST(instanceStart),
          end_time: formatDateTimeKST(instanceEnd),
        })
      }
      count++
    }

    current = next
  }

  return instances
}

/**
 * 여러 이벤트를 확장 (반복 일정 포함)
 */
export function expandAllEvents(
  events: CalendarEvent[],
  viewRange: DateRange,
  exceptionsMap: Map<string, Set<string>> = new Map() // eventId -> 제외된 날짜들
): CalendarEvent[] {
  const expanded: CalendarEvent[] = []

  for (const event of events) {
    if (event.recurrence_rule) {
      const exceptions = exceptionsMap.get(event.id ?? '') ?? new Set()
      const instances = expandRecurringEvent(event, viewRange, exceptions)
      expanded.push(...instances)
    } else {
      expanded.push(event)
    }
  }

  return expanded
}

/**
 * CalendarEvent를 FullCalendarEvent로 변환 (반복 정보 포함)
 */
export function toFullCalendarEvent(
  event: CalendarEvent,
  colorMap: Record<string, string>
): FullCalendarEvent {
  const eventType = event.event_type ?? 'notice'
  const color = colorMap[eventType] ?? '#6b7280'

  // 인스턴스 ID에서 원본 ID와 날짜 추출
  const idParts = event.id?.split('_') ?? []
  const isInstance = idParts.length > 1 && /^\d{4}-\d{2}-\d{2}$/.test(idParts[idParts.length - 1])

  return {
    id: event.id ?? '',
    title: event.title,
    start: event.start_time,
    end: event.end_time,
    description: event.description,
    location: event.location,
    backgroundColor: color,
    borderColor: color,
    extendedProps: {
      event_type: eventType,
      recurrence_rule: event.recurrence_rule,
      recurrence_parent_id: event.recurrence_parent_id,
      original_event_id: isInstance ? idParts.slice(0, -1).join('_') : undefined,
      instance_date: isInstance ? idParts[idParts.length - 1] : undefined,
    }
  }
}

/**
 * 반복 규칙을 사람이 읽을 수 있는 형태로 변환
 */
export function formatRecurrenceRule(rule: RecurrenceRule | null | undefined): string {
  if (!rule) return ''

  const interval = rule.interval ?? 1
  let text = ''

  switch (rule.freq) {
    case 'daily':
      text = interval === 1 ? '매일' : `${interval}일마다`
      break
    case 'weekly':
      if (rule.byDay && rule.byDay.length > 0) {
        const dayNames: Record<string, string> = {
          'MO': '월', 'TU': '화', 'WE': '수', 'TH': '목', 'FR': '금', 'SA': '토', 'SU': '일'
        }
        const days = rule.byDay.map(d => dayNames[d]).join(', ')
        text = interval === 1 ? `매주 ${days}요일` : `${interval}주마다 ${days}요일`
      } else {
        text = interval === 1 ? '매주' : `${interval}주마다`
      }
      break
    case 'monthly':
      if (rule.byDayOfMonth) {
        text = interval === 1 ? `매월 ${rule.byDayOfMonth}일` : `${interval}개월마다 ${rule.byDayOfMonth}일`
      } else {
        text = interval === 1 ? '매월' : `${interval}개월마다`
      }
      break
    case 'yearly':
      text = interval === 1 ? '매년' : `${interval}년마다`
      break
  }

  if (rule.until) {
    text += ` (${rule.until}까지)`
  } else if (rule.count) {
    text += ` (${rule.count}회)`
  }

  return text
}
