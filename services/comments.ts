import { createClient } from "@/lib/supabase/client"
import {
  LearningComment,
  LearningCommentFormData,
} from "@/types/comments"

/**
 * 선생님용: 학습 코멘트 목록 조회
 * RLS: 재직 직원만 조회 가능
 */
export async function getCommentsByTeacher(teacherId: string): Promise<LearningComment[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("learning_comments")
    .select(`
      *,
      student:students!learning_comments_student_id_fkey (
        name
      )
    `)
    .eq("teacher_id", teacherId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })

  if (error) throw error

  return (data || []).map((comment) => ({
    id: comment.id,
    student_id: comment.student_id,
    teacher_id: comment.teacher_id,
    year: comment.year,
    month: comment.month,
    content: comment.content,
    is_public: comment.is_public ?? false,
    created_at: comment.created_at,
    updated_at: comment.updated_at,
    student_name: (comment.student as any)?.name || "알 수 없음",
  }))
}

/**
 * 선생님용: 특정 학생의 코멘트 목록 조회
 * RLS: 재직 직원만 조회 가능
 */
export async function getCommentsByStudent(studentId: string): Promise<LearningComment[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("learning_comments")
    .select(`
      *,
      teacher:employees!learning_comments_teacher_id_fkey (
        name
      )
    `)
    .eq("student_id", studentId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })

  if (error) throw error

  return (data || []).map((comment) => ({
    id: comment.id,
    student_id: comment.student_id,
    teacher_id: comment.teacher_id,
    year: comment.year,
    month: comment.month,
    content: comment.content,
    is_public: comment.is_public ?? false,
    created_at: comment.created_at,
    updated_at: comment.updated_at,
    teacher_name: (comment.teacher as any)?.name || "알 수 없음",
  }))
}

/**
 * 선생님용: 학습 코멘트 작성
 * RLS: 재직 직원만 작성 가능
 */
export async function createLearningComment(
  data: LearningCommentFormData,
  teacherId: string
): Promise<LearningComment> {
  const supabase = createClient()

  // 중복 체크 (같은 학생, 같은 년/월)
  const { data: existing } = await supabase
    .from("learning_comments")
    .select("id")
    .eq("student_id", data.student_id)
    .eq("year", data.year)
    .eq("month", data.month)
    .single()

  if (existing) {
    throw new Error(`${data.year}년 ${data.month}월 코멘트가 이미 존재합니다.`)
  }

  const { data: comment, error } = await supabase
    .from("learning_comments")
    .insert({
      student_id: data.student_id,
      teacher_id: teacherId,
      year: data.year,
      month: data.month,
      content: data.content,
      is_public: data.is_public ?? false,
    })
    .select()
    .single()

  if (error) throw error
  if (!comment) throw new Error("코멘트 작성에 실패했습니다.")

  return {
    id: comment.id,
    student_id: comment.student_id,
    teacher_id: comment.teacher_id,
    year: comment.year,
    month: comment.month,
    content: comment.content,
    is_public: comment.is_public ?? false,
    created_at: comment.created_at,
    updated_at: comment.updated_at,
  }
}

/**
 * 선생님용: 학습 코멘트 수정
 * RLS: 본인이 작성한 코멘트만 수정 가능
 */
export async function updateLearningComment(
  commentId: string,
  content: string
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from("learning_comments")
    .update({ content })
    .eq("id", commentId)

  if (error) throw error
}

/**
 * 선생님용: 학습 코멘트 삭제
 * RLS: 본인이 작성한 코멘트만 삭제 가능
 */
export async function deleteLearningComment(commentId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from("learning_comments")
    .delete()
    .eq("id", commentId)

  if (error) throw error
}

/**
 * 선생님용: 담당 학생 목록 조회 (코멘트 작성용)
 */
export async function getTeacherStudents(teacherId: string) {
  const supabase = createClient()

  // 선생님이 담당하는 반의 학생들 조회
  const { data, error } = await supabase
    .from("classes")
    .select(`
      id,
      name,
      class_students (
        student:students (
          id,
          name,
          grade,
          school,
          status
        )
      )
    `)
    .eq("teacher_id", teacherId)

  if (error) throw error

  // 학생 목록 평탄화 및 중복 제거
  const students = new Map()

  data?.forEach((cls) => {
    const classStudents = cls.class_students as any[]
    classStudents?.forEach((cs) => {
      const student = cs.student
      if (student && student.status === '재원' && !students.has(student.id)) {
        students.set(student.id, {
          id: student.id,
          name: student.name,
          grade: student.grade,
          school: student.school,
          status: student.status,
        })
      }
    })
  })

  return Array.from(students.values())
}

/**
 * 학생별 코멘트 작성 여부 확인
 */
export async function getStudentCommentStatus(
  studentId: string,
  year: number,
  month: number
): Promise<{ hasComment: boolean; comment?: LearningComment }> {
  const supabase = createClient()

  const { data: comment, error } = await supabase
    .from("learning_comments")
    .select("*")
    .eq("student_id", studentId)
    .eq("year", year)
    .eq("month", month)
    .single()

  if (error) {
    // 데이터가 없는 경우 (no rows)는 에러가 아님
    if (error.code === "PGRST116") {
      return { hasComment: false }
    }
    throw error
  }

  return {
    hasComment: true,
    comment: {
      id: comment.id,
      student_id: comment.student_id,
      teacher_id: comment.teacher_id,
      year: comment.year,
      month: comment.month,
      content: comment.content,
      is_public: comment.is_public ?? false,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
    },
  }
}

/**
 * 코멘트 작성 여부를 포함한 학생 목록 조회
 */
export async function getStudentsWithCommentStatus(
  year: number,
  month: number,
  teacherId?: string
): Promise<
  Array<{
    id: string
    name: string
    grade: string
    school: string
    status: string
    className?: string
    teacherName?: string
    hasComment: boolean
    comment?: LearningComment
  }>
> {
  const supabase = createClient()

  // 학생 목록 조회
  let studentsQuery = supabase
    .from("students")
    .select(`
      id,
      name,
      grade,
      school,
      status,
      class_students (
        classes (
          id,
          name,
          teacher_id,
          teacher:employees!classes_teacher_id_fkey (
            name
          )
        )
      )
    `)
    .eq("status", "재원")

  const { data: studentsData, error: studentsError } = await studentsQuery

  if (studentsError) throw studentsError

  // teacherId가 있으면 해당 선생님 담당 학생만 필터링
  let filteredStudents = studentsData || []
  if (teacherId) {
    filteredStudents = filteredStudents.filter((student) => {
      const classStudents = student.class_students as any[]
      return classStudents?.some(
        (cs) => cs.classes?.teacher_id === teacherId
      )
    })
  }

  // 해당 년/월의 모든 코멘트 조회
  const { data: commentsData } = await supabase
    .from("learning_comments")
    .select("*")
    .eq("year", year)
    .eq("month", month)

  // 코멘트를 학생 ID로 매핑
  const commentsMap = new Map<string, LearningComment>()
  commentsData?.forEach((comment) => {
    commentsMap.set(comment.student_id, {
      id: comment.id,
      student_id: comment.student_id,
      teacher_id: comment.teacher_id,
      year: comment.year,
      month: comment.month,
      content: comment.content,
      is_public: comment.is_public ?? false,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
    })
  })

  // 학생 목록에 코멘트 정보 추가
  // 한 학생이 여러 반에 속한 경우 각 반별로 별도의 행 생성
  const result: Array<{
    id: string
    name: string
    grade: string
    school: string
    status: string
    className?: string
    teacherName?: string
    hasComment: boolean
    comment?: LearningComment
  }> = []

  filteredStudents.forEach((student) => {
    const classStudents = student.class_students as any[]
    const comment = commentsMap.get(student.id)

    // 반 정보가 있는 경우
    if (classStudents && classStudents.length > 0) {
      // 각 반별로 별도의 행 생성
      classStudents.forEach((cs) => {
        if (cs.classes) {
          result.push({
            id: student.id,
            name: student.name,
            grade: student.grade,
            school: student.school,
            status: student.status,
            className: cs.classes.name,
            teacherName: cs.classes.teacher?.name || "",
            hasComment: !!comment,
            comment,
          })
        }
      })
    } else {
      // 반 정보가 없는 경우 (반 미배정 학생)
      result.push({
        id: student.id,
        name: student.name,
        grade: student.grade,
        school: student.school,
        status: student.status,
        className: "",
        teacherName: "",
        hasComment: !!comment,
        comment,
      })
    }
  })

  return result
}
