"use server"

// @ts-nocheck
import { createServerClient } from "@/lib/auth/server"
import type { Database } from "@/types/database"
import type {
  TuitionFee,
  TuitionRow,
  TuitionFeeInput,
  ClassWithStudents,
  StudentInfo,
  TuitionApiResponse,
  TuitionStats,
  TuitionSummary,
  BulkTuitionGeneration
} from "@/types/tuition"

type TuitionFeeRow = Database["public"]["Tables"]["tuition_fees"]["Row"]
type ClassRow = Database["public"]["Tables"]["classes"]["Row"]
type StudentRow = Database["public"]["Tables"]["students"]["Row"]

// DB 타입을 앱 타입으로 변환하는 함수들
function mapTuitionFeeRowToTuitionFee(row: TuitionFeeRow): TuitionFee {
  return {
    id: row.id,
    class_id: row.class_id,
    student_id: row.student_id,
    year: row.year,
    month: row.month,
    is_sibling: row.is_sibling,
    class_type: (row.class_type as any) || '정규',
    amount: row.amount,
    note: row.note,
    payment_status: (row.payment_status as any) || '미납',
    payment_date: row.payment_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function mapStudentRowToInfo(row: StudentRow): StudentInfo {
  return {
    id: row.id,
    name: row.name,
    grade: row.grade,
    school: row.school,
    has_sibling: row.has_sibling,
    status: row.status,
  }
}

// 형제 할인 계산 함수
function calculateSiblingDiscount(baseAmount: number, hasSibling: boolean): number {
  if (!hasSibling) return baseAmount
  // 형제 할인 5% 적용
  return Math.floor(baseAmount * 0.95)
}

// 월별 학원비 통계 계산
function calculateTuitionStats(tuitionFees: TuitionRow[]): TuitionStats {
  const totalStudents = tuitionFees.length
  const totalAmount = tuitionFees.reduce((sum, fee) => sum + fee.amount, 0)
  
  const paidCount = tuitionFees.filter(fee => fee.paymentStatus === '완납').length
  const unpaidCount = tuitionFees.filter(fee => fee.paymentStatus === '미납').length
  const partialPaidCount = tuitionFees.filter(fee => fee.paymentStatus === '부분납').length
  
  const collectionRate = totalStudents > 0 ? (paidCount / totalStudents) * 100 : 0
  const avgAmount = totalStudents > 0 ? totalAmount / totalStudents : 0
  const siblingDiscountCount = tuitionFees.filter(fee => fee.isSibling).length
  
  return {
    totalStudents,
    totalAmount,
    paidCount,
    unpaidCount,
    partialPaidCount,
    collectionRate: Math.round(collectionRate * 10) / 10,
    avgAmount: Math.round(avgAmount),
    siblingDiscountCount,
  }
}

// 학원비 데이터 조회 (월별, 선택적 필터링)
export async function getTuitionFees(
  year: number,
  month: number,
  classId?: string,
  studentId?: string
): Promise<TuitionApiResponse<TuitionRow[]>> {
  try {
    const supabase = await createServerClient()
    
    let query = supabase
      .from("tuition_fees")
      .select(`
        *,
        class:classes(id, name, subject),
        student:students(id, name, grade, school, has_sibling)
      `)
      .eq("year", year)
      .eq("month", month)
      .order("created_at", { ascending: false })
    
    if (classId) {
      query = query.eq("class_id", classId)
    }
    
    if (studentId) {
      query = query.eq("student_id", studentId)
    }
    
    const { data, error } = await query
    
    if (error) {
      return { success: false, error: "학원비 데이터 조회 중 오류가 발생했습니다." }
    }
    
    // 데이터 변환
    const tuitionRows: TuitionRow[] = (data || []).map((row: any) => ({
      id: row.id,
      classId: row.class_id || '',
      className: row.class?.name || '',
      studentId: row.student_id || '',
      studentName: row.student?.name || '',
      year: row.year,
      month: row.month,
      isSibling: row.is_sibling || false,
      classType: row.class_type || '정규',
      amount: row.amount,
      note: row.note || '',
      paymentStatus: row.payment_status || '미납',
      periodStartDate: row.period_start_date,
      periodEndDate: row.period_end_date,
    }))
    
    return { success: true, data: tuitionRows }
    
  } catch (error) {
    console.error("getTuitionFees 오류:", error)
    return { 
      success: false, 
      error: "학원비 데이터 조회 중 오류가 발생했습니다." 
    }
  }
}

// 학원비 데이터 조회 (월 범위)
export async function getTuitionFeesByRange(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number,
  classId?: string,
  studentId?: string
): Promise<TuitionApiResponse<TuitionRow[]>> {
  try {
    const supabase = await createServerClient()
    
    let query = supabase
      .from("tuition_fees")
      .select(`
        *,
        class:classes(id, name, subject),
        student:students(id, name, grade, school, has_sibling)
      `)
      .order("year", { ascending: true })
      .order("month", { ascending: true })
      .order("created_at", { ascending: false })
    
    // 월 범위 필터링
    if (startYear === endYear) {
      // 같은 년도 내 월 범위
      query = query
        .eq("year", startYear)
        .gte("month", startMonth)
        .lte("month", endMonth)
    } else {
      // 년도를 넘나드는 범위
      query = query.or(
        `and(year.eq.${startYear},month.gte.${startMonth}),` +
        `and(year.eq.${endYear},month.lte.${endMonth})` +
        (endYear - startYear > 1 ? `,and(year.gt.${startYear},year.lt.${endYear})` : '')
      )
    }
    
    if (classId) {
      query = query.eq("class_id", classId)
    }
    
    if (studentId) {
      query = query.eq("student_id", studentId)
    }
    
    const { data, error } = await query
    
    if (error) {
      return { success: false, error: "학원비 데이터 조회 중 오류가 발생했습니다." }
    }
    
    // 데이터 변환
    const tuitionRows: TuitionRow[] = (data || []).map((row: any) => ({
      id: row.id,
      classId: row.class_id || '',
      className: row.class?.name || '',
      studentId: row.student_id || '',
      studentName: row.student?.name || '',
      year: row.year,
      month: row.month,
      isSibling: row.is_sibling || false,
      classType: row.class_type || '정규',
      amount: row.amount,
      note: row.note || '',
      paymentStatus: row.payment_status || '미납',
      periodStartDate: row.period_start_date,
      periodEndDate: row.period_end_date,
    }))
    
    return { success: true, data: tuitionRows }
    
  } catch (error) {
    console.error("getTuitionFeesByRange 오류:", error)
    return { 
      success: false, 
      error: "학원비 데이터 조회 중 오류가 발생했습니다." 
    }
  }
}

// 학원비 저장/수정
export async function saveTuitionFee(
  data: TuitionFeeInput
): Promise<TuitionApiResponse<{ id: string }>> {
  try {
    const supabase = await createServerClient()
    
    // 학생과 반 이름 조회 (스냅샷용)
    const { data: studentData } = await supabase
      .from("students")
      .select("name")
      .eq("id", data.student_id)
      .single()
    
    const { data: classData } = await supabase
      .from("classes")
      .select("name")
      .eq("id", data.class_id)
      .single()
    
    const { error } = await supabase
      .from("tuition_fees")
      .upsert({
        class_id: data.class_id,
        student_id: data.student_id,
        year: data.year,
        month: data.month,
        is_sibling: data.is_sibling || false,
        class_type: data.class_type || '정규',
        amount: data.amount,
        note: data.note || null,
        payment_status: data.payment_status || '미납',
        period_start_date: data.period_start_date || null,
        period_end_date: data.period_end_date || null,
        student_name_snapshot: studentData?.name || null,
        class_name_snapshot: classData?.name || null,
      }, {
        onConflict: "class_id,student_id,year,month,class_type"
      })
    
    if (error) {
      throw error
    }
    
    return { success: true, data: { id: "saved" } }
    
  } catch (error) {
    console.error("saveTuitionFee 오류:", error)
    return { 
      success: false, 
      error: "학원비 저장 중 오류가 발생했습니다." 
    }
  }
}

// 일괄 학원비 저장
export async function saveTuitionFees(
  tuitionFees: TuitionFeeInput[]
): Promise<TuitionApiResponse<{ saved: number }>> {
  try {
    const supabase = await createServerClient()
    
    // 모든 학생과 반 ID 수집 (NULL class_id 제외)
    const studentIds = [...new Set(tuitionFees.map(t => t.student_id))]
    const classIds = [...new Set(tuitionFees.map(t => t.class_id).filter(id => id))]
    
    // 학생과 반 이름 일괄 조회
    const { data: students } = await supabase
      .from("students")
      .select("id, name")
      .in("id", studentIds)
    
    // 반 이름 조회 (class_id가 있는 경우만)
    let classNameMap = new Map()
    if (classIds.length > 0) {
      const { data: classes } = await supabase
        .from("classes")
        .select("id, name")
        .in("id", classIds)
      
      classNameMap = new Map(classes?.map(c => [c.id, c.name]) || [])
    }
    
    // ID-이름 매핑 생성
    const studentNameMap = new Map(students?.map(s => [s.id, s.name]) || [])
    
    const insertData = tuitionFees.map(data => ({
      class_id: data.class_id || null, // NULL 허용
      student_id: data.student_id,
      year: data.year,
      month: data.month,
      is_sibling: data.is_sibling || false,
      class_type: data.class_type || '정규',
      amount: data.amount,
      note: data.note || null,
      payment_status: data.payment_status || '미납',
      period_start_date: data.period_start_date || null,
      period_end_date: data.period_end_date || null,
      student_name_snapshot: studentNameMap.get(data.student_id) || null,
      class_name_snapshot: data.class_id ? classNameMap.get(data.class_id) || null : null,
    }))
    
    // UNIQUE 제약조건이 제거되었으므로 insert 사용
    // @ts-ignore - Supabase 타입 복잡성 해결을 위한 임시 처리
    const { error } = await supabase
      .from("tuition_fees")
      .insert(insertData as any)
    
    if (error) {
      console.error("Supabase insert error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      throw error
    }
    
    return { success: true, data: { saved: tuitionFees.length } }
    
  } catch (error) {
    console.error("saveTuitionFees 오류:", error)
    return { 
      success: false, 
      error: "일괄 학원비 저장 중 오류가 발생했습니다." 
    }
  }
}

// 반별 학생 조회 (학원비 생성용)
export async function getClassesWithStudents(): Promise<TuitionApiResponse<ClassWithStudents[]>> {
  try {
    const supabase = await createServerClient()
    
    // 활성 반 조회 (teacher_id 포함)
    const { data: classesData, error: classesError } = await supabase
      .from("classes")
      .select("*")
      .order("name", { ascending: true })
    
    if (classesError) {
      throw classesError
    }
    
    // 반별 학생 조회
    const { data: classStudentsData, error: classStudentsError } = await supabase
      .from("class_students")
      .select(`
        class_id,
        student:students(id, name, grade, school, has_sibling, status)
      `)
    
    if (classStudentsError) {
      throw classStudentsError
    }
    
    // 데이터 조합
    const classesWithStudents: ClassWithStudents[] = (classesData || []).map(classRow => {
      const students = (classStudentsData || [])
        .filter((cs: any) => cs.class_id === classRow.id && cs.student?.status?.includes('재원'))
        .map((cs: any) => mapStudentRowToInfo(cs.student))
        .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      
      return {
        // @ts-ignore - classRow 타입 복잡성 해결
        id: classRow.id,
        // @ts-ignore - classRow 타입 복잡성 해결
        name: classRow.name,
        // @ts-ignore - classRow 타입 복잡성 해결
        subject: classRow.subject,
        // @ts-ignore - classRow 타입 복잡성 해결
        teacher_id: classRow.teacher_id,
        // @ts-ignore - classRow 타입 복잡성 해결
        monthly_fee: classRow.monthly_fee,
        students,
      }
    })
    
    return { success: true, data: classesWithStudents }
    
  } catch (error) {
    console.error("getClassesWithStudents 오류:", error)
    return { 
      success: false, 
      error: "반별 학생 데이터 조회 중 오류가 발생했습니다." 
    }
  }
}

// 월별 학원비 자동 생성
export async function generateMonthlyTuition(
  params: BulkTuitionGeneration
): Promise<TuitionApiResponse<{ total: number; success: number; failed: number }>> {
  try {
    const { year, month, classIds, applyDiscount = true } = params
    
    // 반별 학생 데이터 조회
    const classesResult = await getClassesWithStudents()
    if (!classesResult.success || !classesResult.data) {
      return { success: false, error: classesResult.error }
    }
    
    let targetClasses = classesResult.data
    
    // 특정 반만 생성할 경우 필터링
    if (classIds && classIds.length > 0) {
      targetClasses = targetClasses.filter(cls => classIds.includes(cls.id))
    }
    
    let successCount = 0
    let failedCount = 0
    let totalCount = 0
    
    const tuitionFeesToCreate: TuitionFeeInput[] = []
    
    // 각 반별로 학원비 생성
    for (const classData of targetClasses) {
      if (!classData.monthly_fee || classData.monthly_fee <= 0) {
        console.warn(`반 ${classData.name}의 월 수강료가 설정되지 않았습니다.`)
        continue
      }
      
      for (const student of classData.students) {
        totalCount++
        
        try {
          let amount = classData.monthly_fee
          
          // 형제 할인 적용
          if (applyDiscount && student.has_sibling) {
            amount = calculateSiblingDiscount(amount, true)
          }
          
          tuitionFeesToCreate.push({
            class_id: classData.id,
            student_id: student.id,
            year,
            month,
            is_sibling: student.has_sibling || false,
            class_type: '정규',
            amount,
            note: undefined,
            payment_status: '미납',
          })
          
          successCount++
        } catch (error) {
          console.error(`학생 ${student.name} 학원비 생성 실패:`, error)
          failedCount++
        }
      }
    }
    
    // 일괄 저장
    if (tuitionFeesToCreate.length > 0) {
      const saveResult = await saveTuitionFees(tuitionFeesToCreate)
      if (!saveResult.success) {
        return { success: false, error: saveResult.error }
      }
    }
    
    return { 
      success: true, 
      data: { 
        total: totalCount,
        success: successCount,
        failed: failedCount
      }
    }
    
  } catch (error) {
    console.error("generateMonthlyTuition 오류:", error)
    return { 
      success: false, 
      error: "월별 학원비 자동 생성 중 오류가 발생했습니다." 
    }
  }
}

// 학원비 삭제
export async function deleteTuitionFee(id: string): Promise<TuitionApiResponse<{ deleted: boolean }>> {
  try {
    const supabase = await createServerClient()
    
    const { error } = await supabase
      .from("tuition_fees")
      .delete()
      // @ts-ignore - Supabase 타입 복잡성 해결을 위한 임시 처리
      .eq("id", id)
    
    if (error) {
      throw error
    }
    
    return { success: true, data: { deleted: true } }
    
  } catch (error) {
    console.error("deleteTuitionFee 오류:", error)
    return { 
      success: false, 
      error: "학원비 삭제 중 오류가 발생했습니다." 
    }
  }
}

// 월별 학원비 요약 조회
export async function getTuitionSummary(
  year: number,
  month: number
): Promise<TuitionApiResponse<TuitionSummary>> {
  try {
    // 해당 월의 학원비 데이터 조회
    const tuitionResult = await getTuitionFees(year, month)
    if (!tuitionResult.success || !tuitionResult.data) {
      return { success: false, error: tuitionResult.error }
    }
    
    const tuitionFees = tuitionResult.data
    const stats = calculateTuitionStats(tuitionFees)
    
    // 반별 통계 계산
    const classMap = new Map<string, { 
      classId: string; 
      className: string; 
      studentCount: number; 
      totalAmount: number; 
      collectedAmount: number; 
    }>()
    
    tuitionFees.forEach(fee => {
      const key = fee.classId
      if (!classMap.has(key)) {
        classMap.set(key, {
          classId: fee.classId,
          className: fee.className,
          studentCount: 0,
          totalAmount: 0,
          collectedAmount: 0,
        })
      }
      
      const classStats = classMap.get(key)!
      classStats.studentCount++
      classStats.totalAmount += fee.amount
      
      if (fee.paymentStatus === '완납') {
        classStats.collectedAmount += fee.amount
      }
    })
    
    const summary: TuitionSummary = {
      yearMonth: `${year}-${month.toString().padStart(2, '0')}`,
      stats,
      classList: Array.from(classMap.values()).sort((a, b) => a.className.localeCompare(b.className, 'ko')),
    }
    
    return { success: true, data: summary }
    
  } catch (error) {
    console.error("getTuitionSummary 오류:", error)
    return { 
      success: false, 
      error: "학원비 요약 조회 중 오류가 발생했습니다." 
    }
  }
}