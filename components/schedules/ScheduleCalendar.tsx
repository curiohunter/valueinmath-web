"use client";

import { useState, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useSchedules } from './useSchedules';
import type { Database } from '@/types/database';

const locales = { ko };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

type CalendarEvent = {
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
};

export default function ScheduleCalendar() {
  const { data, isLoading, error } = useSchedules();
  
  // 캘린더 상태 관리
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState('month');

  // 네비게이션 핸들러
  const onNavigate = useCallback((newDate: Date) => {
    console.log('Navigating to:', newDate);
    setDate(newDate);
  }, []);

  // 뷰 변경 핸들러
  const onView = useCallback((newView: string) => {
    console.log('Changing view to:', newView);
    setView(newView);
  }, []);

  // 진단용 콘솔 출력
  console.log('schedules data:', data);
  if (error) console.error('schedules fetch error:', error);

  const events: CalendarEvent[] = (data ?? []).map((item: Database['public']['Tables']['schedules']['Row']) => {
    // 각 일정의 변환 결과도 출력
    const event = {
      title: item.title,
      start: item.start_datetime ? new Date(item.start_datetime) : new Date(),
      end: item.end_datetime ? new Date(item.end_datetime) : new Date(),
      allDay: false,
    };
    console.log('event:', event);
    return event;
  });
  console.log('events array:', events);

  if (isLoading) return <div>로딩 중...</div>;
  if (error) return <div>에러 발생: {error.message}</div>;

  return (
    <div style={{ height: 600 }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        date={date}
        view={view}
        onNavigate={onNavigate}
        onView={onView}
        messages={{
          next: "다음",
          previous: "이전",
          today: "오늘",
          month: "월",
          week: "주",
          day: "일",
          agenda: "목록",
        }}
      />
    </div>
  );
}