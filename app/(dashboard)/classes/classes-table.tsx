import React from "react"
import { Button } from "@/components/ui/button"

interface Class {
  id: string
  name: string
  subject: string
  teacher_id: string | null
}
interface Teacher {
  id: string
  name: string
  role?: string
}
interface Student {
  id: string
  name: string
}

interface ClassesTableProps {
  classes: Class[]
  teachers: Teacher[]
  students: Student[]
  studentsCountMap: Record<string, number>
  onDetail: (cls: Class) => void
}

export function ClassesTable({ classes, teachers, students, studentsCountMap, onDetail }: ClassesTableProps) {
  // TODO: 학생 수, 담당 선생님 이름 매핑
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead>
          <tr className="bg-white">
            <th className="px-4 py-3 text-left font-semibold border-b text-muted-foreground">반 이름</th>
            <th className="px-4 py-3 text-left font-semibold border-b text-muted-foreground">과목</th>
            <th className="px-4 py-3 text-left font-semibold border-b text-muted-foreground">담당 선생님</th>
            <th className="px-4 py-3 text-center font-semibold border-b text-muted-foreground">학생 수</th>
            <th className="px-4 py-3 text-center font-semibold border-b text-muted-foreground">상세</th>
          </tr>
        </thead>
        <tbody>
          {classes.map((c, idx) => {
            const teacher = teachers.find(t => t.id === c.teacher_id)
            const studentCount = studentsCountMap[c.id] || 0
            return (
              <tr key={c.id} className="bg-white hover:bg-gray-50">
                <td className="px-4 py-2 border-b align-middle text-foreground">{c.name}</td>
                <td className="px-4 py-2 border-b align-middle text-foreground">{c.subject}</td>
                <td className="px-4 py-2 border-b align-middle text-foreground">{teacher ? teacher.name : '-'}</td>
                <td className="px-4 py-2 border-b text-center align-middle text-foreground">{studentCount}명</td>
                <td className="px-4 py-2 border-b text-center align-middle">
                  <Button size="sm" variant="outline" onClick={() => onDetail(c)}>상세</Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
} 