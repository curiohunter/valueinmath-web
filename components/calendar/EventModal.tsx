'use client'

import { useEffect, memo } from 'react'
import { useForm } from 'react-hook-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarEvent } from '@/types/calendar'

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (event: Omit<CalendarEvent, 'id' | 'created_by' | 'created_at' | 'updated_at'>) => void
  onDelete?: (id: string) => void
  event?: CalendarEvent | null
  selectedDate?: string
}

const eventCategories = [
  { value: 'notice', label: '공지사항', color: '#ef4444' }, // red-500
  { value: 'work', label: '근무관련', color: '#3b82f6' }, // blue-500
  { value: 'project', label: '프로젝트', color: '#8b5cf6' }, // violet-500
  { value: 'makeup', label: '보강', color: '#10b981' }, // emerald-500
  { value: 'absence', label: '결석', color: '#f59e0b' }, // amber-500
  { value: 'entrance_test', label: '입학테스트', color: '#7c3aed' }, // violet-600
  { value: 'new_consultation', label: '신규상담', color: '#ec4899' }, // pink-500
  { value: 'new_enrollment', label: '신규등원', color: '#14b8a6' }, // teal-500
  { value: 'regular_consultation', label: '정기상담', color: '#6366f1' }, // indigo-500
  { value: 'school_exam', label: '학교시험', color: '#84cc16' }, // lime-500
  { value: 'last_minute_makeup', label: '직전보강', color: '#f97316' }, // orange-500
  { value: 'holiday', label: '휴강', color: '#6b7280' }, // gray-500
]

// 시간 옵션을 상수로 미리 생성 (성능 최적화)
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'))

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
  description: string
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
      description: ''
    }
  })

  // 시작 시간 변경 감지
  const watchStartHour = form.watch('start_hour')
  const watchStartMinute = form.watch('start_minute')
  const watchStartDate = form.watch('start_date')

  // DB에 저장된 시간을 폼 필드용으로 변환
  const formatDateTimeForForm = (dbDateString: string) => {
    console.log('원본 DB 시간:', dbDateString)
    
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
    
    console.log('파싱된 결과:', { dateStr, hour, minute })
    return { dateStr, hour, minute }
  }

  // 폼 초기화 및 이벤트 데이터 로딩
  useEffect(() => {
    if (event) {
      console.log('전체 이벤트 객체:', event)
      console.log('start_time:', event.start_time)
      console.log('end_time:', event.end_time)
      
      // 기존 이벤트 편집
      const startDateTime = formatDateTimeForForm(event.start_time)
      const endDateTime = formatDateTimeForForm(event.end_time)
      
      form.reset({
        title: event.title || '',
        event_type: event.event_type || 'notice',
        start_date: startDateTime.dateStr,
        start_hour: startDateTime.hour,
        start_minute: startDateTime.minute,
        end_date: endDateTime.dateStr,
        end_hour: endDateTime.hour,
        end_minute: endDateTime.minute,
        description: event.description || ''
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
        description: ''
      })
    }
  }, [event, selectedDate, isOpen, form])

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

    const eventData = {
      title: data.title.trim(),
      start_time: startTimeKST,  // KST 그대로 저장
      end_time: endTimeKST,      // KST 그대로 저장
      description: data.description.trim() || undefined,
      location: undefined,
      event_type: data.event_type
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {event ? '이벤트 편집' : '새 이벤트 생성'}
          </DialogTitle>
        </DialogHeader>
        
        {/* 모달이 열릴 때만 내용 렌더링 (성능 최적화) */}
        {isOpen && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
        
        <DialogFooter className="gap-2">
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