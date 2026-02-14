import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import type { StudentDistribution } from "@/types/brand"

// GET: 학생 분포 통계 (students 테이블에서 자동 분석)
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    // 재원생 데이터 조회 (student_with_school_info 뷰 사용)
    const { data: students, error: studentsError } = await supabase
      .from("student_with_school_info")
      .select("school, school_type, grade")
      .eq("status", "재원")
      .eq("is_active", true)

    if (studentsError) {
      console.error("학생 조회 오류:", studentsError)
      throw studentsError
    }

    // 학교 유형별 집계
    const schoolTypeMap = new Map<string, number>()
    const gradeMap = new Map<string, number>()
    const schoolMap = new Map<string, { school_type: string; count: number }>()

    for (const s of students || []) {
      // 학교 유형별
      const type = s.school_type || "기타"
      schoolTypeMap.set(type, (schoolTypeMap.get(type) || 0) + 1)

      // 학년별
      if (s.school_type && s.grade) {
        const key = `${s.school_type}-${s.grade}`
        gradeMap.set(key, (gradeMap.get(key) || 0) + 1)
      }

      // 학교별
      if (s.school) {
        const existing = schoolMap.get(s.school)
        if (existing) {
          existing.count++
        } else {
          schoolMap.set(s.school, {
            school_type: s.school_type || "기타",
            count: 1,
          })
        }
      }
    }

    // 결과 포맷팅
    const distribution: StudentDistribution = {
      by_school_type: Array.from(schoolTypeMap.entries())
        .map(([school_type, count]) => ({ school_type, count }))
        .sort((a, b) => b.count - a.count),

      by_grade: Array.from(gradeMap.entries())
        .map(([key, count]) => {
          const [school_type, grade] = key.split("-")
          return { school_type, grade: parseInt(grade), count }
        })
        .sort((a, b) => {
          // 초등 < 중등 < 고등 순서, 그 안에서 학년순
          const typeOrder: Record<string, number> = { 초등학교: 1, 중학교: 2, 고등학교: 3 }
          const typeA = typeOrder[a.school_type] || 99
          const typeB = typeOrder[b.school_type] || 99
          if (typeA !== typeB) return typeA - typeB
          return a.grade - b.grade
        }),

      top_schools: Array.from(schoolMap.entries())
        .map(([school, data]) => ({
          school,
          school_type: data.school_type,
          count: data.count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),

      total_active: students?.length || 0,
    }

    return NextResponse.json({
      success: true,
      data: distribution,
    })
  } catch (error) {
    console.error("학생 분포 통계 조회 오류:", error)
    return NextResponse.json(
      { success: false, error: "학생 분포를 분석하는데 실패했습니다." },
      { status: 500 }
    )
  }
}
