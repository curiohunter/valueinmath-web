"use client"

import { SUBJECT_COLORS, SubjectType } from './types'
import { cn } from '@/lib/utils'

const subjects: SubjectType[] = ['수학', '수학특강', '과학', '과학특강']

export function ScheduleLegend() {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {subjects.map((subject) => (
        <div key={subject} className="flex items-center gap-1.5">
          <div
            className={cn(
              'w-3 h-3 rounded',
              SUBJECT_COLORS[subject].bg
            )}
          />
          <span className="text-sm text-gray-600">{subject}</span>
        </div>
      ))}
    </div>
  )
}
