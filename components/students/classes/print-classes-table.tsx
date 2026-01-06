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

// 선생님 ID → 관 매핑
const TEACHER_DEPARTMENT_MAP: Record<string, string> = {
  "e5244afb-02d9-4f28-9dfe-950336fb4d7d": "고등관",  // 박석돈
  "116bbe7f-de58-4091-bcc7-e678658258aa": "중등관",  // 이명지
  "e48a9b12-a091-4eec-8a81-d878d629bff2": "영재관",  // 신현주
  "70e5fbef-87e9-4657-b262-ae37ae1f8bb2": "영재관",  // 신승희
  "80527822-677c-4bc1-b62d-e8cdef01071d": "과학",    // 나은영
}

// 관 표시 순서
const DEPARTMENT_ORDER = ["고등관", "중등관", "영재관", "과학", "기타"]

export function PrintClassesTable({
  classes,
  teachers,
  students,
  classStudents,
  currentDate
}: PrintClassesTableProps) {
  // 시간표 포맷팅 함수 (컴팩트)
  const formatSchedule = (schedules?: Schedule[]) => {
    if (!schedules || schedules.length === 0) return "-"

    // 시간대별로 그룹화
    const timeGroups = new Map<string, string[]>()
    schedules.forEach(s => {
      const startTime = s.start_time.substring(0, 5)
      const endTime = s.end_time.substring(0, 5)
      const timeKey = `${startTime}-${endTime}`
      if (!timeGroups.has(timeKey)) {
        timeGroups.set(timeKey, [])
      }
      timeGroups.get(timeKey)!.push(s.day_of_week)
    })

    return Array.from(timeGroups.entries())
      .map(([time, days]) => `${days.join('')} ${time}`)
      .join(' / ')
  }

  // 반별 학생 매핑 (재원 상태인 학생만)
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

  // 선생님 ID로 관 가져오기
  const getDepartment = (teacherId: string | null): string => {
    if (!teacherId) return "기타"
    return TEACHER_DEPARTMENT_MAP[teacherId] || "기타"
  }

  // 관별로 반 그룹화
  const classesByDepartment = classes.reduce((acc: Record<string, Class[]>, cls) => {
    const department = getDepartment(cls.teacher_id)
    if (!acc[department]) {
      acc[department] = []
    }
    acc[department].push(cls)
    return acc
  }, {})

  // 관별 통계
  const getDepartmentStats = (deptClasses: Class[]) => {
    let totalStudents = 0
    deptClasses.forEach(cls => {
      totalStudents += getClassStudents(cls.id).length
    })
    return { classCount: deptClasses.length, studentCount: totalStudents }
  }

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
  }

  // 선생님 이름 가져오기
  const getTeacherName = (teacherId: string | null) => {
    if (!teacherId) return "-"
    const teacher = teachers.find(t => t.id === teacherId)
    return teacher ? teacher.name : "-"
  }

  return (
    <div className="print-container">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
            font-size: 9px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-container {
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .department-section {
            page-break-inside: avoid;
          }
        }
        @media screen {
          .print-container {
            padding: 15px;
            background: white;
            max-width: 1200px;
            margin: 0 auto;
            font-size: 11px;
          }
        }
        .print-container * {
          box-sizing: border-box;
        }
        .header {
          text-align: center;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 2px solid #333;
        }
        .header h1 {
          font-size: 18px;
          font-weight: bold;
          margin: 0 0 4px 0;
        }
        .header .date {
          color: #666;
          font-size: 11px;
        }
        .department-section {
          margin-bottom: 16px;
        }
        .department-header {
          background-color: #1e3a5f;
          color: white;
          padding: 6px 10px;
          font-weight: bold;
          font-size: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .department-stats {
          font-weight: normal;
          font-size: 10px;
        }
        .class-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9px;
        }
        .class-table th {
          background-color: #f0f4f8;
          border: 1px solid #ccc;
          padding: 4px 6px;
          text-align: center;
          font-weight: bold;
          white-space: nowrap;
        }
        .class-table td {
          border: 1px solid #ccc;
          padding: 4px 6px;
          vertical-align: top;
        }
        .class-table .col-name {
          width: 18%;
          font-weight: 500;
        }
        .class-table .col-teacher {
          width: 8%;
          text-align: center;
        }
        .class-table .col-schedule {
          width: 14%;
          text-align: center;
          font-size: 8px;
        }
        .class-table .col-count {
          width: 5%;
          text-align: center;
        }
        .class-table .col-students {
          width: 55%;
          font-size: 8px;
          line-height: 1.4;
        }
        .student-list {
          word-break: keep-all;
        }
        .summary-row {
          margin-top: 12px;
          padding: 8px 12px;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-around;
          font-size: 11px;
        }
        .summary-item {
          text-align: center;
        }
        .summary-label {
          color: #64748b;
          font-size: 9px;
        }
        .summary-value {
          font-weight: bold;
          font-size: 13px;
        }
      ` }} />

      <div className="header">
        <h1>반 현황표</h1>
        <div className="date">{formatDate(currentDate)} 기준</div>
      </div>

      {DEPARTMENT_ORDER.map(department => {
        const deptClasses = classesByDepartment[department]
        if (!deptClasses || deptClasses.length === 0) return null

        const stats = getDepartmentStats(deptClasses)

        return (
          <div key={department} className="department-section">
            <div className="department-header">
              <span>{department}</span>
              <span className="department-stats">
                {stats.classCount}개 반 / {stats.studentCount}명
              </span>
            </div>
            <table className="class-table">
              <thead>
                <tr>
                  <th className="col-name">반명</th>
                  <th className="col-teacher">담당</th>
                  <th className="col-schedule">시간표</th>
                  <th className="col-count">인원</th>
                  <th className="col-students">학생 명단</th>
                </tr>
              </thead>
              <tbody>
                {deptClasses.map(cls => {
                  const classStudentList = getClassStudents(cls.id)
                  const studentNames = classStudentList
                    .map(s => formatStudentName(s))
                    .join(', ')

                  return (
                    <tr key={cls.id}>
                      <td className="col-name">{cls.name}</td>
                      <td className="col-teacher">{getTeacherName(cls.teacher_id)}</td>
                      <td className="col-schedule">{formatSchedule(cls.schedules)}</td>
                      <td className="col-count">{classStudentList.length}</td>
                      <td className="col-students">
                        <span className="student-list">{studentNames || '-'}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}

      <div className="summary-row">
        <div className="summary-item">
          <div className="summary-label">총 반 수</div>
          <div className="summary-value">{classes.length}개</div>
        </div>
        <div className="summary-item">
          <div className="summary-label">총 학생 수 (재원)</div>
          <div className="summary-value">
            {students.filter(s => s.status === '재원').length}명
          </div>
        </div>
      </div>
    </div>
  )
}
