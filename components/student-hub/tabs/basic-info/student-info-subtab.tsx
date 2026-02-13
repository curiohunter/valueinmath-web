"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Phone, School, Calendar, FileText, ClipboardList } from "lucide-react"

interface StudentInfoData {
  id: string
  name: string
  student_phone: string | null
  parent_phone: string | null
  parent_phone2: string | null
  payment_phone: string | null
  status: string
  department: string | null
  school: string | null
  school_type: string | null
  grade: number | null
  lead_source: string | null
  start_date: string | null
  end_date: string | null
  first_contact_date: string | null
  notes: string | null
  created_at: string
  left_at: string | null
  left_reason: string | null
  mathflat_student_id: string | null
  // from class_students join
  classes?: { name: string; teacher_name: string }[]
}

interface EntranceTest {
  id: number
  student_id: string
  test_date: string | null
  test1_score: number | null
  test2_score: number | null
  test1_level: string | null
  test2_level: string | null
  test_result: string | null
  status: string
  recommended_class: string | null
  notes: string | null
  created_at: string
}

const TEST_STATUS_COLORS: Record<string, string> = {
  "대기": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "완료": "bg-green-50 text-green-700 border-green-200",
  "불합격": "bg-red-50 text-red-700 border-red-200",
  "합격": "bg-green-50 text-green-700 border-green-200",
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start py-2 border-b last:border-b-0">
      <span className="w-28 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm flex-1">{value || <span className="text-muted-foreground">-</span>}</span>
    </div>
  )
}

export function StudentInfoSubTab({ studentId }: { studentId: string }) {
  const [info, setInfo] = useState<StudentInfoData | null>(null)
  const [classes, setClasses] = useState<{ name: string; teacher_name: string }[]>([])
  const [entranceTests, setEntranceTests] = useState<EntranceTest[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const supabase = createClient()

        const [studentRes, classesRes, testsRes] = await Promise.all([
          supabase
            .from("student_with_school_info")
            .select("*")
            .eq("id", studentId)
            .single(),
          supabase
            .from("class_students")
            .select(`
              classes (
                name,
                teacher:employees!classes_teacher_id_fkey ( name )
              )
            `)
            .eq("student_id", studentId),
          supabase
            .from("entrance_tests")
            .select("*")
            .eq("student_id", studentId)
            .order("created_at", { ascending: false }),
        ])

        if (studentRes.error) throw studentRes.error
        setInfo(studentRes.data as any)

        const mappedClasses = (classesRes.data || [])
          .filter((cs: any) => cs.classes)
          .map((cs: any) => ({
            name: cs.classes.name,
            teacher_name: cs.classes.teacher?.name || "",
          }))
        setClasses(mappedClasses)
        setEntranceTests(testsRes.data || [])
      } catch (error) {
        console.error("Failed to load student info:", error)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [studentId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!info) {
    return <p className="text-sm text-muted-foreground py-4">정보를 불러올 수 없습니다</p>
  }

  return (
    <div className="space-y-4">
      {/* 연락처 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">연락처</h3>
          </div>
          <InfoRow label="학생 전화" value={info.student_phone} />
          <InfoRow label="학부모 전화" value={info.parent_phone} />
          <InfoRow label="학부모 전화2" value={info.parent_phone2} />
          <InfoRow label="납부 전화" value={info.payment_phone} />
        </CardContent>
      </Card>

      {/* 학교 정보 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <School className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">학교 정보</h3>
          </div>
          <InfoRow label="학교" value={info.school} />
          <InfoRow label="학교 유형" value={info.school_type} />
          <InfoRow label="학년" value={info.grade ? `${info.grade}학년` : null} />
          <InfoRow label="부서" value={info.department} />
        </CardContent>
      </Card>

      {/* 반 정보 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold">소속 반</h3>
          </div>
          {classes.length === 0 ? (
            <p className="text-sm text-muted-foreground">배정된 반이 없습니다</p>
          ) : (
            <div className="space-y-2">
              {classes.map((cls, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Badge variant="outline">{cls.name}</Badge>
                  {cls.teacher_name && (
                    <span className="text-xs text-muted-foreground">({cls.teacher_name})</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 날짜 / 기타 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">날짜 / 기타</h3>
          </div>
          <InfoRow label="입원일" value={info.start_date} />
          <InfoRow label="퇴원일" value={info.end_date || info.left_at} />
          <InfoRow label="최초 상담일" value={info.first_contact_date} />
          <InfoRow label="유입 경로" value={info.lead_source} />
          <InfoRow label="등록일" value={info.created_at?.split("T")[0]} />
          {info.left_reason && <InfoRow label="퇴원 사유" value={info.left_reason} />}
        </CardContent>
      </Card>

      {/* 입학테스트 */}
      {entranceTests.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">입학테스트</h3>
            </div>
            <div className="space-y-3">
              {entranceTests.map((test) => (
                <div key={test.id} className="border-b last:border-b-0 pb-3 last:pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      variant="outline"
                      className={TEST_STATUS_COLORS[test.status] || ""}
                    >
                      {test.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {test.test_date?.split("T")[0] || test.created_at?.split("T")[0]}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {test.test1_score !== null && (
                      <InfoRow label="테스트1 점수" value={`${test.test1_score}점`} />
                    )}
                    {test.test1_level && (
                      <InfoRow label="테스트1 레벨" value={test.test1_level} />
                    )}
                    {test.test2_score !== null && (
                      <InfoRow label="테스트2 점수" value={`${test.test2_score}점`} />
                    )}
                    {test.test2_level && (
                      <InfoRow label="테스트2 레벨" value={test.test2_level} />
                    )}
                    {test.test_result && (
                      <InfoRow label="결과" value={test.test_result} />
                    )}
                    {test.recommended_class && (
                      <InfoRow label="추천반" value={test.recommended_class} />
                    )}
                  </div>
                  {test.notes && (
                    <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{test.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 메모 */}
      {info.notes && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">메모</h3>
            </div>
            <p className="text-sm whitespace-pre-wrap">{info.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
