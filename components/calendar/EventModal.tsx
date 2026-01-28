'use client'

import { useEffect, memo } from 'react'
import { useForm } from 'react-hook-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarEvent, RecurrenceRule, RecurrenceFrequency } from '@/types/calendar'
import { formatRecurrenceRule } from '@/lib/recurrence'
import { Repeat } from 'lucide-react'
import { Switch } from '@/components/ui/switch'

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (event: Omit<CalendarEvent, 'id' | 'created_by' | 'created_at' | 'updated_at'>) => void
  onDelete?: (id: string) => void
  event?: CalendarEvent | null
  selectedDate?: string
}

const eventCategories = [
  // 상담 관련 (퍼널 순서대로)
  { value: 'new_consultation', label: '신규상담', color: '#a855f7' }, // purple-500 (첫 상담)
  { value: 'test_guidance', label: '입테유도', color: '#f59e0b' }, // amber-500 (테스트 전)
  { value: 'after_test_consultation', label: '입테후상담', color: '#3b82f6' }, // blue-500 (테스트 직후)
  { value: 'enrollment_guidance', label: '등록유도', color: '#6366f1' }, // indigo-500 (테스트 후)
  { value: 'regular_consultation', label: '정기상담', color: '#14b8a6' }, // teal-500 (재원생)
  { value: 'withdrawal_consultation', label: '퇴원상담', color: '#ef4444' }, // red-500
  { value: 'after_enrollment_consultation', label: '입학후상담', color: '#22c55e' }, // green-500 (기타)

  // 테스트 및 등원
  { value: 'entrance_test', label: '입학테스트', color: '#7c3aed' }, // violet-600
  { value: 'new_enrollment', label: '신규등원', color: '#059669' }, // emerald-600

  // 수업 관련
  { value: 'makeup', label: '보강', color: '#10b981' }, // emerald-500
  { value: 'last_minute_makeup', label: '직전보강', color: '#f97316' }, // orange-500
  { value: 'absence', label: '결석', color: '#fbbf24' }, // amber-400
  { value: 'holiday', label: '휴강', color: '#6b7280' }, // gray-500

  // 시험
  { value: 'school_exam', label: '학교시험', color: '#84cc16' }, // lime-500

  // 기타
  { value: 'notice', label: '공지사항', color: '#dc2626' }, // red-600
  { value: 'work', label: '근무관련', color: '#0891b2' }, // cyan-600
  { value: 'project', label: '프로젝트', color: '#9333ea' }, // purple-600
]

// 시간 옵션을 상수로 미리 생성 (성능 최적화)
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'))

// 반복 빈도 옵션 (UI에서는 사용하지 않지만 타입 호환성을 위해 유지)
const recurrenceOptions: { value: RecurrenceFrequency | 'none'; label: string }[] = [
  { value: 'monthly', label: '개월마다' },
  { value: 'weekly', label: '주마다' },
  { value: 'daily', label: '일마다' },
  { value: 'yearly', label: '년마다' },
]

// 폼 타입 정의
interface FormValues {
  title: string
  event_type: string
  start_date: string
  start_hour: string
  start_minute: string
  end_date: string
  end_hour: string
  end_minute: string
  location: string
  description: string
  // 반복 설정
  recurrence_enabled: boolean
  recurrence_freq: RecurrenceFrequency | 'none'
  recurrence_interval: string
  recurrence_by_day_of_month: string
  recurrence_until: string
}

const EventModal = memo(function EventModal({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete, 
  event, 
  selectedDate 
}: EventModalProps) {
  const form = useForm<FormValues>({
    defaultValues: {
      title: '',
      event_type: 'notice',
      start_date: '',
      start_hour: '09',
      start_minute: '00',
      end_date: '',
      end_hour: '10',
      end_minute: '00',
      location: '',
      description: '',
      // 반복 설정 기본값
      recurrence_enabled: false,
      recurrence_freq: 'monthly', // 기본값을 monthly로 설정 (가장 흔한 사용 케이스)
      recurrence_interval: '1',
      recurrence_by_day_of_month: '',
      recurrence_until: '',
    }
  })

  // 반복 설정 감시
  const watchRecurrenceEnabled = form.watch('recurrence_enabled')
  const watchRecurrenceFreq = form.watch('recurrence_freq')
  const watchRecurrenceInterval = form.watch('recurrence_interval')

  // 시작 시간 변경 감지
  const watchStartHour = form.watch('start_hour')
  const watchStartMinute = form.watch('start_minute')
  const watchStartDate = form.watch('start_date')

  // DB에 저장된 시간을 폼 필드용으로 변환
  const formatDateTimeForForm = (dbDateString: string) => {
    // "2025-06-25T13:00:00+00:00" 형식 처리
    const dateTimeStr = dbDateString.split('+')[0] // +00:00 제거
    
    let datePart, timePart
    if (dateTimeStr.includes('T')) {
      // ISO 형식: 2025-06-25T13:00:00
      [datePart, timePart] = dateTimeStr.split('T')
    } else {
      // 스페이스 형식: 2025-06-25 13:00:00
      [datePart, timePart] = dateTimeStr.split(' ')
    }
    
    let dateStr = datePart // YYYY-MM-DD
    let hour = '09'
    let minute = '00'
    
    if (timePart) {
      const timeComponents = timePart.split(':')
      hour = timeComponents[0] || '09'
      minute = timeComponents[1] || '00'
    }
    
    return { dateStr, hour, minute }
  }

  // 폼 초기화 및 이벤트 데이터 로딩
  useEffect(() => {
    if (event) {
      // 기존 이벤트 편집
      const startDateTime = formatDateTimeForForm(event.start_time)
      const endDateTime = formatDateTimeForForm(event.end_time)

      // 반복 규칙 파싱
      const rule = event.recurrence_rule
      const hasRecurrence = !!rule

      form.reset({
        title: event.title || '',
        event_type: event.event_type || 'notice',
        start_date: startDateTime.dateStr,
        start_hour: startDateTime.hour,
        start_minute: startDateTime.minute,
        end_date: endDateTime.dateStr,
        end_hour: endDateTime.hour,
        end_minute: endDateTime.minute,
        location: event.location || '',
        description: event.description || '',
        recurrence_enabled: hasRecurrence,
        recurrence_freq: rule?.freq || 'none',
        recurrence_interval: (rule?.interval ?? 1).toString(),
        recurrence_by_day_of_month: rule?.byDayOfMonth?.toString() || '',
        recurrence_until: rule?.until || '',
      })
    } else if (selectedDate) {
      // 새 이벤트 생성
      form.reset({
        title: '',
        event_type: 'notice',
        start_date: selectedDate,
        start_hour: '09',
        start_minute: '00',
        end_date: selectedDate,
        end_hour: '10',
        end_minute: '00',
        location: '',
        description: '',
        recurrence_enabled: false,
        recurrence_freq: 'monthly',
        recurrence_interval: '1',
        recurrence_by_day_of_month: new Date(selectedDate).getDate().toString(),
        recurrence_until: '',
      })
    }
  }, [event, selectedDate, isOpen, form])

  // 시작 날짜 변경 시 반복 일자 자동 설정
  useEffect(() => {
    if (watchStartDate && watchRecurrenceFreq === 'monthly') {
      const day = new Date(watchStartDate).getDate()
      form.setValue('recurrence_by_day_of_month', day.toString())
    }
  }, [watchStartDate, watchRecurrenceFreq, form])

  // 시작 시간 변경 시 종료 시간 자동 설정 (1시간 후)
  useEffect(() => {
    if (!event && watchStartHour && watchStartMinute && watchStartDate) {
      // 새 이벤트 생성 모드에서만 자동 설정
      const startHour = parseInt(watchStartHour)
      const startMinute = parseInt(watchStartMinute)
      
      // 1시간 후 계산
      let endHour = startHour + 1
      let endMinute = startMinute
      let endDate = watchStartDate
      
      // 24시를 넘어가면 다음 날로
      if (endHour >= 24) {
        endHour = endHour - 24
        // 날짜 증가
        const dateObj = new Date(watchStartDate)
        dateObj.setDate(dateObj.getDate() + 1)
        endDate = dateObj.toISOString().split('T')[0]
      }
      
      const endHourString = endHour.toString().padStart(2, '0')
      const endMinuteString = endMinute.toString().padStart(2, '0')
      
      // 종료 시간 업데이트
      form.setValue('end_date', endDate)
      form.setValue('end_hour', endHourString)
      form.setValue('end_minute', endMinuteString)
    }
  }, [watchStartHour, watchStartMinute, watchStartDate, event, form])

  // 폼 제출 핸들러
  const onSubmit = (data: FormValues) => {
    // KST 시간 문자열 생성 (UTC 변환 없이 그대로 저장)
    const startTimeKST = `${data.start_date}T${data.start_hour}:${data.start_minute}:00`
    const endTimeKST = `${data.end_date}T${data.end_hour}:${data.end_minute}:00`

    // 시간 검증 (KST 기준)
    const startTime = new Date(startTimeKST)
    const endTime = new Date(endTimeKST)

    if (endTime <= startTime) {
      form.setError('end_hour', { message: '종료 시간은 시작 시간보다 늦어야 합니다' })
      return
    }

    // 반복 규칙 생성
    let recurrence_rule: RecurrenceRule | undefined = undefined
    if (data.recurrence_enabled && data.recurrence_freq !== 'none') {
      recurrence_rule = {
        freq: data.recurrence_freq as RecurrenceFrequency,
        interval: parseInt(data.recurrence_interval) || 1,
      }

      // 매월인 경우 날짜 지정
      if (data.recurrence_freq === 'monthly' && data.recurrence_by_day_of_month) {
        recurrence_rule.byDayOfMonth = parseInt(data.recurrence_by_day_of_month)
      }

      // 종료일 지정
      if (data.recurrence_until) {
        recurrence_rule.until = data.recurrence_until
      }
    }

    const eventData = {
      title: data.title.trim(),
      start_time: startTimeKST,  // KST 그대로 저장
      end_time: endTimeKST,      // KST 그대로 저장
      description: data.description.trim() || undefined,
      location: data.location.trim() || undefined,
      event_type: data.event_type,
      recurrence_rule,
    }

    onSave(eventData)
  }

  // 삭제 핸들러
  const handleDelete = () => {
    if (event?.id && onDelete) {
      if (confirm('정말로 이 이벤트를 삭제하시겠습니까?')) {
        onDelete(event.id)
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {event ? '이벤트 편집' : '새 이벤트 생성'}
          </DialogTitle>
        </DialogHeader>

        {/* 모달이 열릴 때만 내용 렌더링 (성능 최적화) */}
        {isOpen && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 overflow-y-auto flex-1 pr-2">
              {/* 일정 분류 */}
              <FormField
                control={form.control}
                name="event_type"
                rules={{ required: '일정 분류를 선택해주세요' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>일정 분류 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="일정 분류를 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventCategories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: category.color }}
                              />
                              {category.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 제목 */}
              <FormField
                control={form.control}
                name="title"
                rules={{ required: '제목을 입력해주세요' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>제목 *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="이벤트 제목을 입력하세요" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 시작 시간 */}
              <div className="space-y-2">
                <FormLabel>시작 시간 *</FormLabel>
                <div className="grid grid-cols-4 gap-2">
                  <FormField
                    control={form.control}
                    name="start_date"
                    rules={{ required: '시작 날짜를 선택해주세요' }}
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="start_hour"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {HOUR_OPTIONS.map((hour) => (
                              <SelectItem key={hour} value={hour}>
                                {hour}시
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="start_minute"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {MINUTE_OPTIONS.map((minute) => (
                              <SelectItem key={minute} value={minute}>
                                {minute}분
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* 종료 시간 */}
              <div className="space-y-2">
                <FormLabel>종료 시간 *</FormLabel>
                <div className="grid grid-cols-4 gap-2">
                  <FormField
                    control={form.control}
                    name="end_date"
                    rules={{ required: '종료 날짜를 선택해주세요' }}
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="end_hour"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {HOUR_OPTIONS.map((hour) => (
                              <SelectItem key={hour} value={hour}>
                                {hour}시
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="end_minute"
                    render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {MINUTE_OPTIONS.map((minute) => (
                              <SelectItem key={minute} value={minute}>
                                {minute}분
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* 반복 설정 */}
              <div className="space-y-3 p-4 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 rounded-xl border border-blue-100/50 dark:border-blue-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                      <Repeat className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <FormLabel className="mb-0 text-sm font-semibold text-gray-800 dark:text-gray-200">반복 일정</FormLabel>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">이 일정을 정기적으로 반복합니다</p>
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="recurrence_enabled"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {watchRecurrenceEnabled && (
                  <div className="space-y-4 pt-3 border-t border-blue-100/50 dark:border-blue-800/30">
                    {/* 얼마나 자주? */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">🔄 얼마나 자주 반복할까요?</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FormField
                          control={form.control}
                          name="recurrence_interval"
                          render={({ field }) => (
                            <FormItem className="w-20">
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  max="12"
                                  {...field}
                                  className="text-center font-semibold h-9"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="recurrence_freq"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="daily">일마다</SelectItem>
                                  <SelectItem value="weekly">주마다</SelectItem>
                                  <SelectItem value="monthly">개월마다</SelectItem>
                                  <SelectItem value="yearly">년마다</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                        <span className="text-xs text-gray-500 whitespace-nowrap">반복</span>
                      </div>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 pl-1">
                        예: 1개월마다 = 매달, 2주마다 = 격주
                      </p>
                    </div>

                    {/* 매월인 경우 날짜 선택 */}
                    {watchRecurrenceFreq === 'monthly' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">📅 매월 몇 일에?</span>
                        </div>
                        <FormField
                          control={form.control}
                          name="recurrence_by_day_of_month"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">매월</span>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="1"
                                    max="31"
                                    {...field}
                                    className="w-20 text-center font-semibold h-9"
                                  />
                                </FormControl>
                                <span className="text-sm text-gray-600">일</span>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* 언제까지? */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">⏰ 언제까지 반복할까요?</span>
                        <span className="text-[10px] text-gray-400">(선택)</span>
                      </div>
                      <FormField
                        control={form.control}
                        name="recurrence_until"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                className="h-9"
                                placeholder="종료일 없음"
                              />
                            </FormControl>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500">
                              비워두면 계속 반복됩니다
                            </p>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* 미리보기 */}
                    {watchRecurrenceFreq && watchRecurrenceFreq !== 'none' && (
                      <div className="mt-3 p-2.5 bg-white/60 dark:bg-gray-800/40 rounded-lg border border-gray-200/50 dark:border-gray-700/50">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          <span className="font-medium text-blue-600 dark:text-blue-400">📋 요약:</span>{' '}
                          {(() => {
                            const interval = parseInt(form.watch('recurrence_interval')) || 1
                            const freq = watchRecurrenceFreq
                            const day = form.watch('recurrence_by_day_of_month')
                            const until = form.watch('recurrence_until')

                            let text = ''
                            if (freq === 'daily') {
                              text = interval === 1 ? '매일' : `${interval}일마다`
                            } else if (freq === 'weekly') {
                              text = interval === 1 ? '매주' : `${interval}주마다`
                            } else if (freq === 'monthly') {
                              const dayText = day ? ` ${day}일에` : ''
                              text = interval === 1 ? `매달${dayText}` : `${interval}개월마다${dayText}`
                            } else if (freq === 'yearly') {
                              text = interval === 1 ? '매년' : `${interval}년마다`
                            }

                            if (until) {
                              text += ` (${until}까지)`
                            } else {
                              text += ' (계속 반복)'
                            }

                            return text
                          })()}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 장소 */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>장소</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="장소를 입력하세요 (선택사항)" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 설명 */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>설명</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="이벤트 설명을 입력하세요 (선택사항)"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        )}
        
        <DialogFooter className="gap-2 flex-shrink-0 border-t pt-4 mt-2">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          {event && onDelete && (
            <Button variant="destructive" onClick={handleDelete}>
              삭제
            </Button>
          )}
          <Button onClick={form.handleSubmit(onSubmit)}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

export default EventModal