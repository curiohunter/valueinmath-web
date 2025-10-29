import { createClient } from "@/lib/supabase/client"
import {
  PortalData,
  StudentOverviewStats,
  ActivityTimelineItem,
  StudyLogItem,
  TestLogItem,
  SchoolExamScoreItem,
  MakeupClassItem,
  ConsultationItem,
  MathflatRecordItem,
  TuitionFeeItem,
  MonthlyAggregation,
  ClassInfo,
  MathflatStats,
  MonthlyMathflatStats,
} from "@/types/portal"

export async function getPortalData(studentId: string): Promise<PortalData> {
  const supabase = createClient()

  // Fetch all data in parallel
  const [
    studentData,
    classesData,
    studyLogsData,
    testLogsData,
    examScoresData,
    makeupClassesData,
    consultationsData,
    mathflatData,
    tuitionFeesData,
  ] = await Promise.all([
    supabase.from("students").select("*").eq("id", studentId).single(),
    supabase
      .from("class_students")
      .select(`
        classes (
          id,
          name,
          subject,
          monthly_fee,
          teacher:employees!classes_teacher_id_fkey (
            name
          )
        )
      `)
      .eq("student_id", studentId),
    supabase
      .from("study_logs")
      .select("*")
      .eq("student_id", studentId)
      .order("date", { ascending: false })
      .limit(50),
    supabase
      .from("test_logs")
      .select("*")
      .eq("student_id", studentId)
      .order("date", { ascending: false })
      .limit(50),
    supabase
      .from("school_exam_scores")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("makeup_classes")
      .select("*")
      .eq("student_id", studentId)
      .order("absence_date", { ascending: false })
      .limit(50),
    supabase
      .from("consultations")
      .select("*")
      .eq("student_id", studentId)
      .order("date", { ascending: false })
      .limit(50),
    supabase
      .from("mathflat_records")
      .select("*")
      .eq("student_id", studentId)
      .order("event_date", { ascending: false })
      .limit(50),
    supabase
      .from("tuition_fees")
      .select("*")
      .eq("student_id", studentId)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(12), // 최근 12개월
  ])

  if (studentData.error) throw studentData.error
  if (classesData.error) throw classesData.error
  if (studyLogsData.error) throw studyLogsData.error
  if (testLogsData.error) throw testLogsData.error
  if (examScoresData.error) throw examScoresData.error
  if (makeupClassesData.error) throw makeupClassesData.error
  if (consultationsData.error) throw consultationsData.error
  if (mathflatData.error) throw mathflatData.error
  if (tuitionFeesData.error) throw tuitionFeesData.error

  // Map classes data with teacher information
  const classes: ClassInfo[] = classesData.data
    .map((item: any) => {
      const classInfo = item.classes
      if (!classInfo) return null
      return {
        id: classInfo.id,
        name: classInfo.name,
        subject: classInfo.subject,
        teacher_name: classInfo.teacher?.name || null,
        monthly_fee: classInfo.monthly_fee,
      }
    })
    .filter((item): item is ClassInfo => item !== null)

  const studyLogs: StudyLogItem[] = studyLogsData.data.map((log) => ({
    id: log.id,
    date: log.date,
    class_name: log.class_name_snapshot,
    attendance_status: log.attendance_status,
    homework: log.homework,
    focus: log.focus,
    book1: log.book1,
    book1log: log.book1log,
    book2: log.book2,
    book2log: log.book2log,
    note: log.note,
  }))

  const testLogs: TestLogItem[] = testLogsData.data.map((log) => ({
    id: log.id,
    date: log.date,
    class_name: log.class_name_snapshot,
    test_type: log.test_type,
    test: log.test,
    test_score: log.test_score,
    note: log.note,
  }))

  const examScores: SchoolExamScoreItem[] = examScoresData.data.map((score) => ({
    id: score.id,
    exam_year: score.exam_year,
    semester: score.semester,
    exam_type: score.exam_type,
    school_name: score.school_name,
    grade: score.grade,
    subject: score.subject,
    score: score.score,
    created_at: score.created_at || "",
  }))

  const makeupClasses: MakeupClassItem[] = makeupClassesData.data.map((cls) => ({
    id: cls.id,
    absence_date: cls.absence_date,
    absence_reason: cls.absence_reason,
    makeup_date: cls.makeup_date,
    makeup_type: cls.makeup_type,
    status: cls.status,
    class_name: cls.class_name_snapshot,
    content: cls.content,
    notes: cls.notes,
  }))

  const consultations: ConsultationItem[] = consultationsData.data.map((consult) => ({
    id: consult.id,
    date: consult.date,
    type: consult.type,
    method: consult.method,
    status: consult.status || "",
    counselor_name: consult.counselor_name_snapshot,
    content: consult.content,
    next_action: consult.next_action,
    next_date: consult.next_date,
  }))

  const mathflatRecords: MathflatRecordItem[] = mathflatData.data.map((record) => ({
    id: record.id,
    event_date: record.event_date,
    mathflat_type: record.mathflat_type,
    book_title: record.book_title,
    problem_solved: record.problem_solved,
    correct_count: record.correct_count,
    wrong_count: record.wrong_count,
    correct_rate: record.correct_rate,
  }))

  const tuitionFees: TuitionFeeItem[] = tuitionFeesData.data.map((fee) => ({
    id: fee.id,
    year: fee.year,
    month: fee.month,
    amount: fee.amount,
    payment_status: fee.payment_status,
    class_name: fee.class_name_snapshot,
    is_sibling: fee.is_sibling,
    period_start_date: fee.period_start_date,
    period_end_date: fee.period_end_date,
  }))

  // Calculate stats
  const stats: StudentOverviewStats = calculateStats(
    studyLogs,
    testLogs,
    consultations,
    makeupClasses,
    mathflatRecords
  )

  // Generate recent activities timeline
  const recent_activities: ActivityTimelineItem[] = generateTimeline(
    studyLogs.slice(0, 10),
    testLogs.slice(0, 10),
    examScores.slice(0, 10),
    makeupClasses.slice(0, 10),
    consultations.slice(0, 10),
    mathflatRecords.slice(0, 10)
  )

  // Calculate monthly aggregations (last 6 months)
  const monthly_aggregations: MonthlyAggregation[] = calculateMonthlyAggregations(
    studyLogs,
    testLogs
  )

  // Calculate monthly mathflat stats (for each month in aggregations)
  const monthly_mathflat_stats: MonthlyMathflatStats[] = monthly_aggregations.map((monthData) => ({
    year: monthData.year,
    month: monthData.month,
    stats: calculateMathflatStats(mathflatRecords, monthData.year, monthData.month),
  }))

  return {
    student: {
      id: studentData.data.id,
      name: studentData.data.name,
      grade: studentData.data.grade,
      school: studentData.data.school,
      status: studentData.data.status,
    },
    classes,
    stats,
    recent_activities,
    study_logs: studyLogs,
    test_logs: testLogs,
    school_exam_scores: examScores,
    makeup_classes: makeupClasses,
    consultations,
    mathflat_records: mathflatRecords,
    tuition_fees: tuitionFees,
    monthly_aggregations,
    monthly_mathflat_stats,
  }
}

function calculateStats(
  studyLogs: StudyLogItem[],
  testLogs: TestLogItem[],
  consultations: ConsultationItem[],
  makeupClasses: MakeupClassItem[],
  mathflatRecords: MathflatRecordItem[]
): StudentOverviewStats {
  // Attendance rate (출석률)
  const attendanceLogs = studyLogs.filter((log) => log.attendance_status !== null)
  const attendanceRate =
    attendanceLogs.length > 0
      ? (attendanceLogs.filter((log) => (log.attendance_status || 0) >= 4).length /
          attendanceLogs.length) *
        100
      : 0

  // Average test score (평균 점수)
  const testScores = testLogs.filter((log) => log.test_score !== null)
  const averageScore =
    testScores.length > 0
      ? testScores.reduce((sum, log) => sum + (log.test_score || 0), 0) / testScores.length
      : 0

  // Mathflat stats
  const totalProblems = mathflatRecords.reduce(
    (sum, record) => sum + (record.problem_solved || 0),
    0
  )
  const totalCorrect = mathflatRecords.reduce(
    (sum, record) => sum + (record.correct_count || 0),
    0
  )
  const mathflatAccuracyRate = totalProblems > 0 ? (totalCorrect / totalProblems) * 100 : 0

  return {
    attendance_rate: Math.round(attendanceRate * 10) / 10,
    average_score: Math.round(averageScore * 10) / 10,
    total_study_logs: studyLogs.length,
    total_tests: testLogs.length,
    total_consultations: consultations.length,
    total_makeup_classes: makeupClasses.length,
    mathflat_total_problems: totalProblems,
    mathflat_accuracy_rate: Math.round(mathflatAccuracyRate * 10) / 10,
  }
}

function generateTimeline(
  studyLogs: StudyLogItem[],
  testLogs: TestLogItem[],
  examScores: SchoolExamScoreItem[],
  makeupClasses: MakeupClassItem[],
  consultations: ConsultationItem[],
  mathflatRecords: MathflatRecordItem[]
): ActivityTimelineItem[] {
  const activities: ActivityTimelineItem[] = []

  // Add study logs
  studyLogs.forEach((log) => {
    activities.push({
      id: log.id,
      date: log.date,
      type: "study",
      title: "학습 일지",
      description: `${log.class_name || "수업"} - ${log.book1 || ""} ${log.book1log || ""}`.trim(),
      color: "bg-blue-500",
    })
  })

  // Add test logs
  testLogs.forEach((log) => {
    activities.push({
      id: log.id,
      date: log.date,
      type: "test",
      title: "테스트",
      description: `${log.test || "테스트"} - ${log.test_score || ""}점`,
      color: "bg-green-500",
    })
  })

  // Add exam scores
  examScores.forEach((score) => {
    activities.push({
      id: score.id,
      date: score.created_at.split("T")[0],
      type: "exam",
      title: "학교 시험",
      description: `${score.subject} - ${score.score}점`,
      color: "bg-purple-500",
    })
  })

  // Add makeup classes
  makeupClasses.forEach((cls) => {
    activities.push({
      id: cls.id,
      date: cls.makeup_date || cls.absence_date || "",
      type: "makeup",
      title: "보강 수업",
      description: `${cls.class_name || ""} - ${cls.status}`,
      color: "bg-orange-500",
    })
  })

  // Add consultations
  consultations.forEach((consult) => {
    activities.push({
      id: consult.id,
      date: consult.date,
      type: "consultation",
      title: "상담",
      description: `${consult.type} - ${consult.method}`,
      color: "bg-pink-500",
    })
  })

  // Add mathflat records
  mathflatRecords.forEach((record) => {
    activities.push({
      id: record.id,
      date: record.event_date || "",
      type: "mathflat",
      title: "매쓰플랫",
      description: `${record.problem_solved || 0}문제 풀이 - ${record.correct_rate || 0}% 정답률`,
      color: "bg-cyan-500",
    })
  })

  // Sort by date descending
  return activities.sort((a, b) => b.date.localeCompare(a.date))
}

function calculateMonthlyAggregations(
  studyLogs: StudyLogItem[],
  testLogs: TestLogItem[]
): MonthlyAggregation[] {
  const now = new Date()
  const monthlyData: Map<string, any> = new Map()

  // Initialize last 6 months
  for (let i = 0; i < 6; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth() + 1
    const key = `${year}-${month}`

    monthlyData.set(key, {
      year,
      month,
      attendance_count_5: 0,
      attendance_count_4: 0,
      attendance_count_3: 0,
      attendance_count_2: 0,
      attendance_count_1: 0,
      homework_sum: 0,
      homework_count: 0,
      focus_sum: 0,
      focus_count: 0,
      total_study_days: 0,
      total_tests: 0,
      test_score_sum: 0,
    })
  }

  // Process study logs
  studyLogs.forEach((log) => {
    const logDate = new Date(log.date)
    const year = logDate.getFullYear()
    const month = logDate.getMonth() + 1
    const key = `${year}-${month}`

    const data = monthlyData.get(key)
    if (data) {
      data.total_study_days++

      // Count attendance by score (1-5)
      if (log.attendance_status !== null) {
        if (log.attendance_status === 5) data.attendance_count_5++
        else if (log.attendance_status === 4) data.attendance_count_4++
        else if (log.attendance_status === 3) data.attendance_count_3++
        else if (log.attendance_status === 2) data.attendance_count_2++
        else if (log.attendance_status === 1) data.attendance_count_1++
      }

      // Accumulate homework scores for average
      if (log.homework !== null) {
        data.homework_sum += log.homework
        data.homework_count++
      }

      // Accumulate focus scores for average
      if (log.focus !== null) {
        data.focus_sum += log.focus
        data.focus_count++
      }
    }
  })

  // Process test logs
  testLogs.forEach((log) => {
    const logDate = new Date(log.date)
    const year = logDate.getFullYear()
    const month = logDate.getMonth() + 1
    const key = `${year}-${month}`

    const data = monthlyData.get(key)
    if (data && log.test_score !== null) {
      data.total_tests++
      data.test_score_sum += log.test_score
    }
  })

  // Calculate averages
  const results: MonthlyAggregation[] = []
  monthlyData.forEach((data) => {
    results.push({
      year: data.year,
      month: data.month,
      attendance_count_5: data.attendance_count_5,
      attendance_count_4: data.attendance_count_4,
      attendance_count_3: data.attendance_count_3,
      attendance_count_2: data.attendance_count_2,
      attendance_count_1: data.attendance_count_1,
      homework_avg: data.homework_count > 0
        ? Math.round((data.homework_sum / data.homework_count) * 10) / 10
        : 0,
      focus_avg: data.focus_count > 0
        ? Math.round((data.focus_sum / data.focus_count) * 10) / 10
        : 0,
      total_study_days: data.total_study_days,
      total_tests: data.total_tests,
      average_score: data.total_tests > 0
        ? Math.round((data.test_score_sum / data.total_tests) * 10) / 10
        : 0,
    })
  })

  // Sort by year and month descending
  return results.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return b.month - a.month
  })
}

function calculateMathflatStats(
  mathflatRecords: MathflatRecordItem[],
  year?: number,
  month?: number
): MathflatStats {
  let recentRecords: MathflatRecordItem[]

  if (year !== undefined && month !== undefined) {
    // Filter by specific month
    recentRecords = mathflatRecords.filter((record) => {
      if (!record.event_date) return false
      const recordDate = new Date(record.event_date)
      return recordDate.getFullYear() === year && recordDate.getMonth() + 1 === month
    })
  } else {
    // Get records from last 30 days (fallback)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    recentRecords = mathflatRecords.filter((record) => {
      if (!record.event_date) return false
      const recordDate = new Date(record.event_date)
      return recordDate >= thirtyDaysAgo
    })
  }

  // Separate by mathflat_type
  const textbookRecords = recentRecords.filter((r) => r.mathflat_type === "교재")
  const worksheetRecords = recentRecords.filter((r) => r.mathflat_type === "학습지")
  const challengeRecords = recentRecords.filter((r) =>
    r.mathflat_type === "챌린지" || r.mathflat_type === "챌린지오답"
  )

  // Calculate textbook stats
  const textbook_problems = textbookRecords.reduce(
    (sum, r) => sum + (r.problem_solved || 0),
    0
  )
  const textbook_correct = textbookRecords.reduce(
    (sum, r) => sum + (r.correct_count || 0),
    0
  )
  const textbook_accuracy = textbook_problems > 0
    ? Math.round((textbook_correct / textbook_problems) * 1000) / 10
    : 0

  // Calculate worksheet stats
  const worksheet_problems = worksheetRecords.reduce(
    (sum, r) => sum + (r.problem_solved || 0),
    0
  )
  const worksheet_correct = worksheetRecords.reduce(
    (sum, r) => sum + (r.correct_count || 0),
    0
  )
  const worksheet_accuracy = worksheet_problems > 0
    ? Math.round((worksheet_correct / worksheet_problems) * 1000) / 10
    : 0

  // Calculate challenge stats
  const challenge_problems = challengeRecords.reduce(
    (sum, r) => sum + (r.problem_solved || 0),
    0
  )
  const challenge_correct = challengeRecords.reduce(
    (sum, r) => sum + (r.correct_count || 0),
    0
  )
  const challenge_accuracy = challenge_problems > 0
    ? Math.round((challenge_correct / challenge_problems) * 1000) / 10
    : 0

  return {
    textbook_accuracy,
    textbook_problems,
    worksheet_accuracy,
    worksheet_problems,
    challenge_accuracy,
    challenge_problems,
  }
}
