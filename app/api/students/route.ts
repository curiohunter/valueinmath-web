import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { getSupabaseAdmin } from "@/lib/supabase/admin"
import type { Database } from "@/types/database"
import type { Student, StudentFilters } from "@/types/student"

// 학생 데이터 변환 함수 (DB 타입 -> 앱 타입)
function mapStudentRowToStudent(row: Database["public"]["Tables"]["students"]["Row"]): Student {
  return {
    id: row.id,
    name: row.name,
    student_phone: row.student_phone,
    parent_phone: row.parent_phone,
    status: row.status as Student["status"],
    department: row.department as Student["department"],
    school: row.school,
    school_type: row.school_type as Student["school_type"],
    grade: row.grade,
    has_sibling: row.has_sibling,
    lead_source: row.lead_source as Student["lead_source"],
    start_date: row.start_date,
    end_date: row.end_date,
    first_contact_date: row.first_contact_date,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const supabase = createServerComponentClient<Database>({ cookies })
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 쿼리 파라미터 가져오기
    const searchParams = request.nextUrl.searchParams
    const page = Number.parseInt(searchParams.get("page") || "1")
    const pageSize = Number.parseInt(searchParams.get("pageSize") || "10")
    const search = searchParams.get("search") || ""
    const department = searchParams.get("department") || "all"
    const status = searchParams.get("status") || "all"

    // 필터 설정
    const filters: StudentFilters = {
      search,
      department,
      status,
    }

    // 서비스 역할 키를 사용하여 RLS 우회
    const adminClient = getSupabaseAdmin()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = adminClient.from("students").select("*", { count: "exact" })

    // 검색어 필터 적용
    if (filters.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,school.ilike.%${filters.search}%,student_phone.ilike.%${filters.search}%,parent_phone.ilike.%${filters.search}%`,
      )
    }

    // 부서 필터 적용
    if (filters.department !== "all") {
      query = query.eq("department", filters.department)
    }

    // 상태 필터 적용
    if (filters.status !== "all") {
      query = query.eq("status", filters.status)
    }

    // 정렬 적용
    // 상태가 "퇴원"인 경우 퇴원일(end_date) 기준 내림차순 정렬
    if (filters.status === "퇴원") {
      query = query.order("end_date", { ascending: false, nullsFirst: false })
    }
    // 상태가 "재원"인 경우 이름 기준 오름차순 정렬
    else if (filters.status === "재원" || filters.status === "all") {
      query = query.order("name", { ascending: true })
    }
    // 그 외 상태는 기본 정렬(업데이트 날짜 내림차순)
    else {
      query = query.order("updated_at", { ascending: false })
    }

    // 페이지네이션 적용
    const { data, error, count } = await query.range(from, to)

    if (error) {
      console.error("Error fetching students:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: (data || []).map(mapStudentRowToStudent),
      count: count || 0,
    })
  } catch (error) {
    console.error("Error in students API:", error)
    return NextResponse.json({ error: "학생 목록을 가져오는 중 오류가 발생했습니다." }, { status: 500 })
  }
}
