"use client"

import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { SchoolExam, SchoolExamFilters, SchoolExamFormData } from "@/types/school-exam"

const STORAGE_BUCKET = "school-exam-pdfs"

// 학교 시험지 목록 조회
export async function getSchoolExams(
  page = 1,
  pageSize = 20,
  filters: Partial<SchoolExamFilters> = {}
): Promise<{ data: SchoolExam[]; count: number }> {
  try {
    const supabase = getSupabaseBrowserClient()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase.from("school_exams").select("*", { count: "exact" })

    // 검색어 필터
    if (filters.search) {
      query = query.ilike("school_name", `%${filters.search}%`)
    }

    // 학교 타입 필터
    if (filters.school_type && filters.school_type !== "all") {
      query = query.eq("school_type", filters.school_type)
    }

    // 학년 필터
    if (filters.grade && filters.grade !== "all") {
      query = query.eq("grade", filters.grade)
    }

    // 학기 필터
    if (filters.semester && filters.semester !== "all") {
      query = query.eq("semester", filters.semester)
    }

    // 시험 유형 필터
    if (filters.exam_type && filters.exam_type !== "all") {
      query = query.eq("exam_type", filters.exam_type)
    }

    // 출제연도 필터
    if (filters.exam_year && filters.exam_year !== "all") {
      query = query.eq("exam_year", filters.exam_year)
    }

    // 수집 상태 필터
    if (filters.is_collected !== undefined && filters.is_collected !== "all") {
      query = query.eq("is_collected", filters.is_collected)
    }

    // 매쓰플랫 업로드 상태 필터
    if (filters.is_uploaded_to_mathflat !== undefined && filters.is_uploaded_to_mathflat !== "all") {
      query = query.eq("is_uploaded_to_mathflat", filters.is_uploaded_to_mathflat)
    }

    // 정렬: 최신순 (출제연도 내림차순, 학교명 오름차순)
    query = query.order("exam_year", { ascending: false })
    query = query.order("school_name", { ascending: true })

    // 페이지네이션
    const { data, error, count } = await query.range(from, to)

    if (error) throw error

    return {
      data: (data as SchoolExam[]) || [],
      count: count || 0,
    }
  } catch (error) {
    console.error("Error fetching school exams:", error)
    throw error
  }
}

// 학교 시험지 단일 조회
export async function getSchoolExam(id: string): Promise<SchoolExam | null> {
  try {
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("school_exams")
      .select("*")
      .eq("id", id)
      .single()

    if (error) throw error
    return data as SchoolExam
  } catch (error) {
    console.error("Error fetching school exam:", error)
    return null
  }
}

// PDF 파일 업로드
export async function uploadPDF(file: File, examId: string): Promise<{ path: string; size: number }> {
  try {
    const supabase = getSupabaseBrowserClient()

    // 파일명 생성: {examId}_{timestamp}.pdf
    const timestamp = new Date().getTime()
    const fileName = `${examId}_${timestamp}.pdf`
    const filePath = `${fileName}`

    console.log("Uploading PDF:", { fileName, fileSize: file.size, bucket: STORAGE_BUCKET })

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

    if (error) {
      console.error("Supabase storage error:", error)
      throw new Error(`Storage upload failed: ${error.message || JSON.stringify(error)}`)
    }

    console.log("PDF uploaded successfully:", data)

    return {
      path: data.path,
      size: file.size,
    }
  } catch (error) {
    console.error("Error uploading PDF:", error)
    throw error
  }
}

// PDF 파일 삭제
export async function deletePDF(filePath: string): Promise<void> {
  try {
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([filePath])

    if (error) throw error
  } catch (error) {
    console.error("Error deleting PDF:", error)
    throw error
  }
}

// PDF 파일 다운로드 URL 생성 (signed URL, 1시간 유효)
export async function getPDFDownloadUrl(filePath: string): Promise<string> {
  try {
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, 3600) // 1시간

    if (error) throw error
    return data.signedUrl
  } catch (error) {
    console.error("Error getting PDF download URL:", error)
    throw error
  }
}

// 학교 시험지 생성
export async function createSchoolExam(formData: SchoolExamFormData): Promise<{ id: string; success: boolean }> {
  try {
    const supabase = getSupabaseBrowserClient()

    // 현재 사용자 정보 가져오기
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("User not authenticated")

    // 직원 ID 가져오기
    const { data: employee } = await supabase
      .from("employees")
      .select("id")
      .eq("auth_id", user.id)
      .eq("status", "재직")
      .single()

    if (!employee) throw new Error("Employee not found")

    // 시험지 데이터 생성
    const examData = {
      school_id: formData.school_id,
      school_type: formData.school_type,
      grade: formData.grade,
      semester: formData.semester,
      school_name: formData.school_name,
      exam_year: formData.exam_year,
      exam_type: formData.exam_type,
      is_collected: formData.is_collected,
      is_uploaded_to_mathflat: formData.is_uploaded_to_mathflat,
      notes: formData.notes || null,
      created_by: employee.id,
    }

    const { data, error } = await supabase
      .from("school_exams")
      .insert(examData)
      .select()
      .single()

    if (error) throw error

    const examId = data.id

    // PDF 파일이 있으면 업로드
    if (formData.pdf_file) {
      const { path, size } = await uploadPDF(formData.pdf_file, examId)

      // 파일 경로 업데이트
      const { error: updateError } = await supabase
        .from("school_exams")
        .update({
          pdf_file_path: path,
          pdf_file_size: size,
        })
        .eq("id", examId)

      if (updateError) throw updateError
    }

    return { id: examId, success: true }
  } catch (error) {
    console.error("Error creating school exam:", error)
    throw error
  }
}

// 학교 시험지 수정
export async function updateSchoolExam(id: string, formData: SchoolExamFormData): Promise<{ success: boolean }> {
  try {
    const supabase = getSupabaseBrowserClient()

    // 기존 데이터 조회 (PDF 삭제를 위해)
    const existing = await getSchoolExam(id)
    if (!existing) throw new Error("School exam not found")

    // 시험지 데이터 업데이트
    const examData = {
      school_id: formData.school_id,
      school_type: formData.school_type,
      grade: formData.grade,
      semester: formData.semester,
      school_name: formData.school_name,
      exam_year: formData.exam_year,
      exam_type: formData.exam_type,
      is_collected: formData.is_collected,
      is_uploaded_to_mathflat: formData.is_uploaded_to_mathflat,
      notes: formData.notes || null,
    }

    const { error } = await supabase
      .from("school_exams")
      .update(examData)
      .eq("id", id)

    if (error) throw error

    // 새 PDF 파일이 있으면 기존 파일 삭제 후 업로드
    if (formData.pdf_file) {
      // 기존 PDF 파일 삭제
      if (existing.pdf_file_path) {
        await deletePDF(existing.pdf_file_path)
      }

      // 새 PDF 업로드
      const { path, size } = await uploadPDF(formData.pdf_file, id)

      // 파일 경로 업데이트
      const { error: updateError } = await supabase
        .from("school_exams")
        .update({
          pdf_file_path: path,
          pdf_file_size: size,
        })
        .eq("id", id)

      if (updateError) throw updateError
    }

    return { success: true }
  } catch (error) {
    console.error("Error updating school exam:", error)
    throw error
  }
}

// 학교 시험지 삭제
export async function deleteSchoolExam(id: string): Promise<{ success: boolean }> {
  try {
    const supabase = getSupabaseBrowserClient()

    // 기존 데이터 조회 (PDF 삭제를 위해)
    const existing = await getSchoolExam(id)
    if (!existing) throw new Error("School exam not found")

    // PDF 파일 삭제
    if (existing.pdf_file_path) {
      await deletePDF(existing.pdf_file_path)
    }

    // 시험지 데이터 삭제
    const { error } = await supabase.from("school_exams").delete().eq("id", id)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error deleting school exam:", error)
    throw error
  }
}

// 출제연도 목록 조회 (필터용)
export async function getExamYears(): Promise<number[]> {
  try {
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("school_exams")
      .select("exam_year")
      .order("exam_year", { ascending: false })

    if (error) throw error

    // 중복 제거
    const years = Array.from(new Set(data.map((item) => item.exam_year)))
    return years
  } catch (error) {
    console.error("Error fetching exam years:", error)
    return []
  }
}
