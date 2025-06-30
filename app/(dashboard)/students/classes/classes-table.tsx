import React from "react"
import { Button } from "@/components/ui/button"

interface Class {
  id: string
  name: string
  subject: string
  teacher_id: string | null
  monthly_fee?: number
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
  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <colgroup>
            <col style={{width: '30%'}} />
            <col style={{width: '15%'}} />
            <col style={{width: '20%'}} />
            <col style={{width: '15%'}} />
            <col style={{width: '10%'}} />
            <col style={{width: '10%'}} />
          </colgroup>
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                반 이름
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                과목
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                담당 선생님
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                원비
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                학생 수
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {classes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="text-gray-400 text-4xl mb-4">📚</div>
                  <div className="text-lg font-medium text-gray-500 mb-2">등록된 반이 없습니다</div>
                  <div className="text-sm text-gray-400">새 반을 만들어 보세요</div>
                </td>
              </tr>
            ) : (
              classes.map((c, idx) => {
                const teacher = teachers.find(t => t.id === c.teacher_id)
                const studentCount = studentsCountMap[c.id] || 0
                const formattedFee = c.monthly_fee ? c.monthly_fee.toLocaleString() + '원' : '-'
                
                return (
                  <tr 
                    key={c.id} 
                    className="bg-white hover:bg-gray-50/50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                        <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        c.subject === '수학' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {c.subject}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm font-medium text-gray-900">
                        {teacher ? teacher.name : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm font-bold text-gray-900">
                        {formattedFee}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {studentCount}명
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => onDetail(c)}
                        className="hover:bg-gray-50 hover:border-gray-300 transition-colors duration-150"
                      >
                        수정
                      </Button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
} 