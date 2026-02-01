"use client"

import { START_HOUR, END_HOUR } from './types'

export function ScheduleTimeline() {
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)

  return (
    <div className="relative flex flex-col">
      {hours.map((hour, index) => (
        <div
          key={hour}
          className="h-16 flex items-start justify-end pr-2 text-xs text-gray-500 font-medium"
          style={{ marginTop: index === 0 ? 0 : -4 }}
        >
          <span className="bg-white px-1">
            {hour.toString().padStart(2, '0')}:00
          </span>
        </div>
      ))}
    </div>
  )
}
