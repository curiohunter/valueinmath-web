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

interface Student {
  id: string
  name: string
  status?: string
  school_type?: string
  grade?: number
}

interface PrintClassesTableProps {
  classes: Class[]
  teachers: Teacher[]
  students: Student[]
  classStudents: any[]
  currentDate: Date
}

export function PrintClassesTable({
  classes,
  teachers,
  students,
  classStudents,
  currentDate
}: PrintClassesTableProps) {
  // 시간표 포맷팅 함수
  const formatSchedule = (schedules?: Schedule[]) => {
    if (!schedules || schedules.length === 0) return "시간표 미등록"

    // 시간대별로 그룹화
    const timeGroups = new Map<string, string[]>()
    schedules.forEach(s => {
      const startTime = s.start_time.substring(0, 5) // HH:mm
      const endTime = s.end_time.substring(0, 5)
      const timeKey = `${startTime}-${endTime}`
      if (!timeGroups.has(timeKey)) {
        timeGroups.set(timeKey, [])
      }
      timeGroups.get(timeKey)!.push(s.day_of_week)
    })

    // 포맷팅 - 줄바꿈으로 구분
    const formatted = Array.from(timeGroups.entries()).map(([time, days], index) => (
      <React.Fragment key={time}>
        {index > 0 && <br />}
        {days.join('')} {time}
      </React.Fragment>
    ))

    return <>{formatted}</>
  }

  // 반별 학생 매핑 (재원 상태인 학생만, 학교급+학년 포함)
  const getClassStudents = (classId: string) => {
    return classStudents
      .filter(cs => cs.class_id === classId)
      .map(cs => students.find(s => s.id === cs.student_id))
      .filter((s): s is Student => s !== undefined && s.status === '재원')
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }

  // 학생 이름 포맷팅 (학교급+학년 포함)
  const formatStudentName = (student: Student) => {
    const schoolTypeMap: Record<string, string> = {
      '초등학교': '초',
      '중학교': '중',
      '고등학교': '고'
    }
    const schoolAbbr = student.school_type ? schoolTypeMap[student.school_type] || '' : ''
    const gradeStr = student.grade ? `${student.grade}` : ''

    if (schoolAbbr && gradeStr) {
      return `${student.name}(${schoolAbbr}${gradeStr})`
    }
    return student.name
  }

  // 선생님별로 반 그룹화
  const classesByTeacher = classes.reduce((acc: Record<string, Class[]>, cls) => {
    const teacherId = cls.teacher_id || 'unassigned'
    if (!acc[teacherId]) {
      acc[teacherId] = []
    }
    acc[teacherId].push(cls)
    return acc
  }, {})

  // 전체 통계 계산
  const totalClasses = classes.length
  const totalStudents = students.filter(s => s.status === '재원').length
  const totalMonthlyFee = classes.reduce((sum, cls) => {
    const classStudentCount = getClassStudents(cls.id).length
    return sum + ((cls.monthly_fee || 0) * classStudentCount)
  }, 0)

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
  }

  return (
    <div className="print-container">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            margin: 0;
            padding: 20px;
            font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
          }
          .print-container {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-before: always;
          }
          .avoid-break {
            page-break-inside: avoid;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f5f5f5 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        @media screen {
          .print-container {
            padding: 20px;
            background: white;
            max-width: 800px;
            margin: 0 auto;
          }
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #333;
        }
        .header h1 {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .header .date {
          color: #666;
          font-size: 14px;
        }
        .teacher-section {
          margin-bottom: 40px;
        }
        .teacher-header {
          background-color: #f0f4f8;
          padding: 10px;
          margin-bottom: 20px;
          font-weight: bold;
          font-size: 16px;
          border-left: 4px solid #3b82f6;
        }
        .class-section {
          margin-bottom: 30px;
          padding: 15px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }
        .class-title {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #1f2937;
        }
        .class-info {
          display: flex;
          gap: 20px;
          margin-bottom: 15px;
          font-size: 14px;
          color: #4b5563;
        }
        .schedule-info {
          margin-top: 8px;
          padding: 8px;
          background-color: #f9fafb;
          border-radius: 4px;
          font-size: 13px;
          color: #6b7280;
        }
        .student-list {
          margin-top: 10px;
        }
        .student-list-title {
          font-weight: bold;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .student-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          font-size: 13px;
        }
        .student-item {
          padding: 4px 8px;
          background-color: #f9fafb;
          border-radius: 4px;
        }
        .summary {
          margin-top: 40px;
          padding: 20px;
          background-color: #f0f9ff;
          border: 2px solid #3b82f6;
          border-radius: 8px;
        }
        .summary h2 {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 15px;
          color: #1e40af;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .summary-item {
          text-align: center;
        }
        .summary-label {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 4px;
        }
        .summary-value {
          font-size: 20px;
          font-weight: bold;
          color: #1f2937;
        }
      ` }} />

      <div className="header">
        <h1>반 목록 현황</h1>
        <div className="date">{formatDate(currentDate)} 인쇄</div>
      </div>

      {Object.entries(classesByTeacher).map(([teacherId, teacherClasses]) => {
        const teacher = teachers.find(t => t.id === teacherId)
        const teacherName = teacher ? teacher.name : '미배정'
        
        return (
          <div key={teacherId} className="teacher-section avoid-break">
            <div className="teacher-header">
              {teacherName} 선생님
            </div>
            
            {teacherClasses.map(cls => {
              const classStudentList = getClassStudents(cls.id)
              const monthlyFee = cls.monthly_fee || 0
              
              return (
                <div key={cls.id} className="class-section">
                  <div className="class-title">■ {cls.name}</div>
                  <div className="class-info">
                    <span>과목: {cls.subject}</span>
                    <span>월 원비: {monthlyFee.toLocaleString()}원</span>
                    <span>학생 수: {classStudentList.length}명</span>
                  </div>
                  {cls.schedules && cls.schedules.length > 0 && (
                    <div className="schedule-info">
                      📅 시간표: {formatSchedule(cls.schedules)}
                    </div>
                  )}
                  
                  {classStudentList.length > 0 && (
                    <div className="student-list">
                      <div className="student-list-title">학생 명단:</div>
                      <div className="student-grid">
                        {classStudentList.map(student => (
                          <div key={student.id} className="student-item">
                            • {formatStudentName(student)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      <div className="summary">
        <h2>전체 요약</h2>
        <div className="summary-grid">
          <div className="summary-item">
            <div className="summary-label">총 반 수</div>
            <div className="summary-value">{totalClasses}개</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">총 학생 수</div>
            <div className="summary-value">{totalStudents}명</div>
          </div>
          <div className="summary-item">
            <div className="summary-label">예상 총 월 원비</div>
            <div className="summary-value">{totalMonthlyFee.toLocaleString()}원</div>
          </div>
        </div>
      </div>
    </div>
  )
}