// @ts-nocheck
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/providers/auth-provider"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  ArrowLeft,
  Send,
  RefreshCw,
  RotateCcw,
  CreditCard,
  Ban,
  User,
  Phone,
  Receipt,
  CheckCircle2,
  ExternalLink,
  Copy,
  History,
  Scissors,
  Trash2,
} from "lucide-react"
import {
  removeDiscountFromTuition,
  type DiscountDetail,
} from "@/services/campaign-service"
import { TuitionDiscountSection } from "@/components/tuition/tuition-discount-section"
import { TuitionEventSection } from "@/components/tuition/tuition-event-section"
import { PaymentStatusBadge, PaymentMethodBadge } from "@/components/payssam"
import { SplitInvoiceModal } from "@/components/payssam/split-invoice-modal"
import type { PaysSamRequestStatus, PaymentStatus, ClassType } from "@/types/tuition"

// 활성 청구서 인터페이스
interface ActiveBill {
  id: string
  bill_id: string
  request_status: PaysSamRequestStatus | null
  short_url: string | null
  sent_at: string | null
  paid_at: string | null
  payment_method: string | null
  transaction_id: string | null
  cancelled_at: string | null
  destroyed_at: string | null
  last_sync_at: string | null
}

// 학원비 상세 데이터 인터페이스
interface TuitionDetail {
  id: string
  year: number
  month: number
  amount: number
  payment_status: PaymentStatus
  class_type: ClassType
  is_sibling: boolean
  note: string | null
  period_start_date: string | null
  period_end_date: string | null
  created_at: string
  updated_at: string
  // 조인된 데이터
  students: {
    id: string
    name: string
    grade: number | null
    school: string | null
    parent_phone: string | null
    payment_phone: string | null
    status: string
  } | null
  classes: {
    id: string
    name: string
  } | null
  // 스냅샷 (삭제된 경우)
  student_name_snapshot: string | null
  class_name_snapshot: string | null
  // 분할 청구 관련
  parent_tuition_fee_id: string | null
  is_split_child: boolean | null
  // payssam_bills JOIN 결과
  payssam_bills: any[]
}

// 이벤트 로그 인터페이스
interface PaysSamLog {
  id: string
  event_type: string
  event_data: Record<string, any>
  created_at: string
}

// 금액 포맷
const formatAmount = (amount: number) => amount.toLocaleString() + "원"

// 날짜 포맷
const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "-"
  const date = new Date(dateStr)
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

// 날짜+시간 포맷
const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return "-"
  const date = new Date(dateStr)
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// 이벤트 타입 라벨
const EVENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  invoice_sent: { label: "청구서 발송", color: "text-blue-600" },
  resent: { label: "청구서 재발송", color: "text-cyan-600" },
  payment_completed: { label: "결제 완료", color: "text-green-600" },
  cancelled: { label: "결제 취소", color: "text-orange-600" },
  destroyed: { label: "청구서 파기", color: "text-gray-600" },
  status_changed: { label: "상태 변경", color: "text-slate-600" },
  offline_payment: { label: "현장결제 완료", color: "text-purple-600" },
}

export default function TuitionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { user, loading: authLoading } = useAuth()

  const [data, setData] = useState<TuitionDetail | null>(null)
  const [logs, setLogs] = useState<PaysSamLog[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [splitModalOpen, setSplitModalOpen] = useState(false)

  // 할인 관련 상태
  const [discountDetails, setDiscountDetails] = useState<DiscountDetail[]>([])
  const [discountLoading, setDiscountLoading] = useState(false)

  const tuitionId = params.id as string

  // 데이터 조회
  const fetchData = async () => {
    setLoading(true)
    try {
      // 학원비 상세 조회 (payssam_bills JOIN 포함)
      const { data: tuitionData, error: tuitionError } = await supabase
        .from("tuition_fees")
        .select(`
          id, year, month, amount, payment_status, class_type, is_sibling,
          note, period_start_date, period_end_date, created_at, updated_at,
          student_name_snapshot, class_name_snapshot,
          parent_tuition_fee_id, is_split_child,
          students!left(id, name, grade, school, parent_phone, payment_phone, status),
          classes!left(id, name),
          payssam_bills(id, bill_id, request_status, short_url, sent_at, paid_at, payment_method, transaction_id, cancelled_at, destroyed_at, last_sync_at)
        `)
        .eq("id", tuitionId)
        .single()

      if (tuitionError) throw tuitionError
      setData(tuitionData)

      // 활성 청구서가 있으면 이벤트 로그 조회
      const bills = (tuitionData?.payssam_bills || []) as any[]
      if (bills.length > 0) {
        const { data: logsData } = await supabase
          .from("payssam_logs")
          .select("*")
          .eq("tuition_fee_id", tuitionId)
          .order("created_at", { ascending: false })
          .limit(20)

        setLogs(logsData || [])
      }
    } catch (error) {
      console.error("데이터 조회 오류:", error)
      toast.error("데이터를 불러오는 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  // 할인 데이터 조회 (discount_details JSONB에서 로드)
  const fetchDiscounts = async () => {
    if (!tuitionId) return

    setDiscountLoading(true)
    try {
      const { data: tuitionData } = await supabase
        .from("tuition_fees")
        .select("discount_details")
        .eq("id", tuitionId)
        .single()

      setDiscountDetails((tuitionData?.discount_details as DiscountDetail[]) || [])
    } catch (error) {
      console.error("할인 데이터 조회 오류:", error)
    } finally {
      setDiscountLoading(false)
    }
  }

  // 할인 제거 핸들러
  const handleRemoveDiscount = async (participantId: string) => {
    const confirm = window.confirm("이 할인을 제거하시겠습니까?")
    if (!confirm) return

    setDiscountLoading(true)
    try {
      const result = await removeDiscountFromTuition(supabase, tuitionId, participantId)
      if (result.success) {
        toast.success("할인이 제거되었습니다")
        await fetchDiscounts()
        await fetchData()
      } else {
        toast.error(result.error || "할인 제거에 실패했습니다")
      }
    } catch (error: any) {
      console.error("할인 제거 오류:", error)
      toast.error(error.message || "할인 제거 중 오류가 발생했습니다")
    } finally {
      setDiscountLoading(false)
    }
  }

  useEffect(() => {
    if (tuitionId && user) {
      fetchData()
    }
  }, [tuitionId, user])

  // 데이터 로드 후 할인 정보 조회
  useEffect(() => {
    if (tuitionId && data) {
      fetchDiscounts()
    }
  }, [tuitionId, data])

  // 청구서 발송
  const handleSendInvoice = async () => {
    if (!data) return

    setActionLoading("send")
    try {
      const response = await fetch("/api/payssam/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tuitionFeeId: data.id }),
      })
      const result = await response.json()

      if (result.success) {
        toast.success("청구서가 발송되었습니다.")
        fetchData()
      } else {
        toast.error(result.error || "청구서 발송에 실패했습니다.")
      }
    } catch (error) {
      toast.error("청구서 발송 중 오류가 발생했습니다.")
    } finally {
      setActionLoading(null)
    }
  }

  // 상태 동기화
  const handleSync = async () => {
    if (!data) return

    setActionLoading("sync")
    try {
      const response = await fetch("/api/payssam/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tuitionFeeIds: [data.id] }),
      })
      const result = await response.json()

      if (result.success) {
        toast.success("상태가 동기화되었습니다.")
        fetchData()
      } else {
        toast.error(result.error || "동기화에 실패했습니다.")
      }
    } catch (error) {
      toast.error("동기화 중 오류가 발생했습니다.")
    } finally {
      setActionLoading(null)
    }
  }

  // 현장결제 완료
  const handleOfflinePayment = async () => {
    if (!data) return

    const confirm = window.confirm(
      "현장결제가 완료되었습니까?\n\n" +
      "※ 결제선생 앱에서 실제 결제를 먼저 진행해주세요.\n" +
      "※ DB에서 완납 처리만 됩니다."
    )
    if (!confirm) return

    setActionLoading("offline")
    try {
      const response = await fetch("/api/payssam/offline-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tuitionFeeIds: [data.id] }),
      })
      const result = await response.json()

      if (result.success) {
        toast.success("현장결제 완료 처리되었습니다.")
        fetchData()
      } else {
        toast.error(result.error || "처리에 실패했습니다.")
      }
    } catch (error) {
      toast.error("처리 중 오류가 발생했습니다.")
    } finally {
      setActionLoading(null)
    }
  }

  // 결제 취소
  const handleCancel = async () => {
    if (!data) return

    const confirm = window.confirm(
      "결제를 취소하시겠습니까?\n\n" +
      "※ 결제 완료된 건만 취소 가능합니다.\n" +
      "※ 취소 후 환불 처리됩니다."
    )
    if (!confirm) return

    setActionLoading("cancel")
    try {
      const response = await fetch("/api/payssam/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tuitionFeeId: data.id }),
      })
      const result = await response.json()

      if (result.success) {
        toast.success("결제가 취소되었습니다.")
        fetchData()
      } else {
        toast.error(result.error || "취소에 실패했습니다.")
      }
    } catch (error) {
      toast.error("취소 중 오류가 발생했습니다.")
    } finally {
      setActionLoading(null)
    }
  }

  // 청구서 파기
  const handleDestroy = async () => {
    if (!data) return

    const confirm = window.confirm(
      "청구서를 파기하시겠습니까?\n\n" +
      "※ 미결제 청구서만 파기 가능합니다.\n" +
      "※ 파기 후 새로 발송해야 합니다."
    )
    if (!confirm) return

    setActionLoading("destroy")
    try {
      const response = await fetch("/api/payssam/destroy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tuitionFeeId: data.id }),
      })
      const result = await response.json()

      if (result.success) {
        toast.success("청구서가 파기되었습니다.")
        fetchData()
      } else {
        toast.error(result.error || "파기에 실패했습니다.")
      }
    } catch (error) {
      toast.error("파기 중 오류가 발생했습니다.")
    } finally {
      setActionLoading(null)
    }
  }

  // 청구서 재발송
  const handleResend = async () => {
    if (!data) return

    const confirm = window.confirm(
      "청구서를 재발송하시겠습니까?\n\n" +
      "※ 카카오톡으로 결제 안내가 다시 발송됩니다.\n" +
      "※ 기존 청구서 URL은 유지됩니다."
    )
    if (!confirm) return

    setActionLoading("resend")
    try {
      const response = await fetch("/api/payssam/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tuitionFeeId: data.id }),
      })
      const result = await response.json()

      if (result.success) {
        toast.success("청구서가 재발송되었습니다.")
        fetchData()
      } else {
        toast.error(result.error || "재발송에 실패했습니다.")
      }
    } catch (error) {
      toast.error("재발송 중 오류가 발생했습니다.")
    } finally {
      setActionLoading(null)
    }
  }

  // URL 복사
  const handleCopyUrl = () => {
    // activeBill은 렌더링 시점에 계산됨
    const bills = (data?.payssam_bills || []) as any[]
    const bill = bills.find(
      (b: any) => !['destroyed', 'cancelled', 'failed'].includes(b.request_status || '')
    )
    if (bill?.short_url) {
      navigator.clipboard.writeText(bill.short_url)
      toast.success("결제 URL이 복사되었습니다.")
    }
  }

  // 분할 청구
  const handleSplitInvoice = async (amounts: number[]) => {
    if (!data) return

    setActionLoading("split")
    try {
      const response = await fetch("/api/payssam/split", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tuitionFeeId: data.id,
          amounts,
        }),
      })
      const result = await response.json()

      if (result.success) {
        toast.success(result.message || "분할 청구가 완료되었습니다.")
        setSplitModalOpen(false)
        // 목록 페이지로 이동 (분할된 청구서들을 보여주기 위해)
        router.push("/students/tuition-history")
      } else {
        toast.error(result.error || "분할 청구에 실패했습니다.")
      }
    } catch (error) {
      toast.error("분할 청구 중 오류가 발생했습니다.")
    } finally {
      setActionLoading(null)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
        <div className="text-gray-400">로딩 중...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-400 text-4xl mb-4">🔒</div>
        <div className="text-red-500">로그인이 필요합니다</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-400 text-4xl mb-4">📄</div>
        <div className="text-gray-500">학원비 정보를 찾을 수 없습니다</div>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          돌아가기
        </Button>
      </div>
    )
  }

  const studentName = data.students?.name || data.student_name_snapshot || "(알 수 없음)"
  const className = data.classes?.name || data.class_name_snapshot || "(반 정보 없음)"
  const phone = data.students?.payment_phone || data.students?.parent_phone || "-"

  // 활성 청구서 찾기 (payssam_bills JOIN 결과에서)
  const bills = (data.payssam_bills || []) as ActiveBill[]
  const activeBill: ActiveBill | null = bills.find(
    (b) => !['destroyed', 'cancelled', 'failed'].includes(b.request_status || '')
  ) || null

  // 버튼 활성화 조건 (활성 청구서 기반)
  const canSend = !activeBill && data.payment_status !== "완납"
  const canSync = !!activeBill && activeBill.request_status === "sent"
  const canResend = activeBill?.request_status === "sent"
  const canOfflinePayment = activeBill?.request_status === "sent"
  const canCancel = activeBill?.request_status === "paid"
  const canDestroy = activeBill?.request_status === "sent"
  // 분할 청구: 미납 상태 + 분할 자식이 아닌 경우 + 완납이 아닌 경우
  const canSplit = data.payment_status !== "완납" && !data.is_split_child && data.amount >= 20000

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{studentName}</h1>
            <p className="text-sm text-muted-foreground">
              {data.year}년 {data.month}월 학원비
            </p>
          </div>
        </div>
        <PaymentStatusBadge status={activeBill?.request_status || null} size="lg" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 기본 정보 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 학생/반 정보 */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              학생 정보
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">학생명</div>
                <div className="font-medium">{studentName}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">학년</div>
                <div className="font-medium">
                  {data.students?.grade ? `${data.students.grade}학년` : "-"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">학교</div>
                <div className="font-medium">{data.students?.school || "-"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">상태</div>
                <div className="font-medium">{data.students?.status || "-"}</div>
              </div>
              <div className="col-span-2">
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  청구 전화번호
                </div>
                <div className="font-medium">{phone}</div>
              </div>
            </div>
          </Card>

          {/* 청구 정보 */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              청구 정보
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">반명</div>
                <div className="font-medium">{className}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">수업 유형</div>
                <div className="font-medium">{data.class_type}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">청구 금액</div>
                <div className="text-xl font-bold text-blue-600">
                  {formatAmount(data.amount)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">납부 상태</div>
                <Badge
                  variant={
                    data.payment_status === "완납" ? "default" :
                    data.payment_status === "미납" ? "destructive" : "secondary"
                  }
                >
                  {data.payment_status}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">형제 할인</div>
                <div className="font-medium">{data.is_sibling ? "적용 (5%)" : "미적용"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">청구 기간</div>
                <div className="font-medium">
                  {data.year}년 {data.month}월
                </div>
              </div>
              {(data.period_start_date || data.period_end_date) && (
                <div className="col-span-2">
                  <div className="text-sm text-muted-foreground">수업 기간</div>
                  <div className="font-medium">
                    {formatDate(data.period_start_date)} ~ {formatDate(data.period_end_date)}
                  </div>
                </div>
              )}
              {data.note && (
                <div className="col-span-2">
                  <div className="text-sm text-muted-foreground">비고</div>
                  <div className="font-medium">{data.note}</div>
                </div>
              )}
            </div>
          </Card>

          {/* 할인 내역 - 새로운 컴포넌트 사용 */}
          <TuitionDiscountSection
            discountDetails={discountDetails}
            siblingDiscount={data.is_sibling}
            siblingDiscountAmount={data.is_sibling ? Math.round(data.amount * 0.05 / 0.95) : 0}
            loading={discountLoading}
            onRemoveDiscount={handleRemoveDiscount}
          />

          {/* 이벤트 참여 관리 - 새로운 컴포넌트 */}
          {data.students?.id && (
            <TuitionEventSection
              studentId={data.students.id}
              studentName={studentName}
              tuitionFeeId={tuitionId}
              onDiscountApplied={async () => {
                await fetchDiscounts()
                await fetchData()
              }}
            />
          )}

          {/* 이벤트 로그 */}
          {logs.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <History className="w-5 h-5" />
                결제 이력
              </h2>
              <div className="space-y-3">
                {logs.map((log) => {
                  const eventConfig = EVENT_TYPE_LABELS[log.event_type] || {
                    label: log.event_type,
                    color: "text-gray-600",
                  }
                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="w-2 h-2 mt-2 rounded-full bg-current shrink-0"
                           style={{ color: eventConfig.color.replace("text-", "").includes("600") ?
                             `var(--${eventConfig.color.replace("text-", "").replace("-600", "-500")})` : undefined }} />
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium ${eventConfig.color}`}>
                          {eventConfig.label}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(log.created_at)}
                        </div>
                        {log.event_data?.appr_num && (
                          <div className="text-xs text-muted-foreground mt-1">
                            승인번호: {log.event_data.appr_num}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>

        {/* 우측: PaysSam 정보 & 액션 */}
        <div className="space-y-6">
          {/* PaysSam 결제 정보 */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              결제선생 정보
            </h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">청구서 ID</div>
                <div className="font-mono text-sm">
                  {activeBill?.bill_id || "-"}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">청구 상태</div>
                <div className="mt-1">
                  <PaymentStatusBadge status={activeBill?.request_status || null} />
                </div>
              </div>

              {activeBill?.sent_at && (
                <div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Send className="w-3 h-3" />
                    발송일시
                  </div>
                  <div className="text-sm">{formatDateTime(activeBill.sent_at)}</div>
                </div>
              )}

              {activeBill?.paid_at && (
                <div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    결제일시
                  </div>
                  <div className="text-sm">{formatDateTime(activeBill.paid_at)}</div>
                </div>
              )}

              {activeBill?.payment_method && (
                <div>
                  <div className="text-sm text-muted-foreground">결제수단</div>
                  <div className="mt-1">
                    <PaymentMethodBadge method={activeBill.payment_method} />
                  </div>
                </div>
              )}

              {activeBill?.transaction_id && (
                <div>
                  <div className="text-sm text-muted-foreground">승인번호</div>
                  <div className="font-mono text-sm">{activeBill.transaction_id}</div>
                </div>
              )}

              {activeBill?.cancelled_at && (
                <div>
                  <div className="text-sm text-muted-foreground text-orange-600">
                    취소일시
                  </div>
                  <div className="text-sm">{formatDateTime(activeBill.cancelled_at)}</div>
                </div>
              )}

              {activeBill?.destroyed_at && (
                <div>
                  <div className="text-sm text-muted-foreground text-gray-600">
                    파기일시
                  </div>
                  <div className="text-sm">{formatDateTime(activeBill.destroyed_at)}</div>
                </div>
              )}

              {activeBill?.short_url && (
                <div>
                  <div className="text-sm text-muted-foreground">결제 URL</div>
                  <div className="flex items-center gap-2 mt-1">
                    <a
                      href={activeBill.short_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate max-w-[150px]"
                    >
                      {activeBill.short_url}
                    </a>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyUrl}>
                      <Copy className="w-3 h-3" />
                    </Button>
                    <a
                      href={activeBill.short_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </a>
                  </div>
                </div>
              )}

              {activeBill?.last_sync_at && (
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    마지막 동기화: {formatDateTime(activeBill.last_sync_at)}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* 액션 버튼 */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">액션</h2>
            <div className="space-y-2">
              {/* 청구서 발송 */}
              {canSend && (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={handleSendInvoice}
                  disabled={actionLoading === "send"}
                >
                  <Send className={`w-4 h-4 mr-2 ${actionLoading === "send" ? "animate-pulse" : ""}`} />
                  {actionLoading === "send" ? "발송 중..." : "청구서 발송"}
                </Button>
              )}

              {/* 상태 동기화 */}
              {canSync && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSync}
                  disabled={actionLoading === "sync"}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${actionLoading === "sync" ? "animate-spin" : ""}`} />
                  {actionLoading === "sync" ? "동기화 중..." : "상태 동기화"}
                </Button>
              )}

              {/* 청구서 재발송 */}
              {canResend && (
                <Button
                  variant="outline"
                  className="w-full text-cyan-600 border-cyan-200 hover:bg-cyan-50"
                  onClick={handleResend}
                  disabled={actionLoading === "resend"}
                >
                  <RotateCcw className={`w-4 h-4 mr-2 ${actionLoading === "resend" ? "animate-spin" : ""}`} />
                  {actionLoading === "resend" ? "재발송 중..." : "청구서 재발송"}
                </Button>
              )}

              {/* 현장결제 완료 */}
              {canOfflinePayment && (
                <Button
                  variant="outline"
                  className="w-full text-green-600 border-green-200 hover:bg-green-50"
                  onClick={handleOfflinePayment}
                  disabled={actionLoading === "offline"}
                >
                  <CreditCard className={`w-4 h-4 mr-2 ${actionLoading === "offline" ? "animate-pulse" : ""}`} />
                  {actionLoading === "offline" ? "처리 중..." : "현장결제 완료"}
                </Button>
              )}

              {/* 결제 취소 */}
              {canCancel && (
                <Button
                  variant="outline"
                  className="w-full text-orange-600 border-orange-200 hover:bg-orange-50"
                  onClick={handleCancel}
                  disabled={actionLoading === "cancel"}
                >
                  <Ban className={`w-4 h-4 mr-2 ${actionLoading === "cancel" ? "animate-pulse" : ""}`} />
                  {actionLoading === "cancel" ? "취소 중..." : "결제 취소"}
                </Button>
              )}

              {/* 청구서 파기 */}
              {canDestroy && (
                <Button
                  variant="outline"
                  className="w-full text-gray-600 border-gray-200 hover:bg-gray-50"
                  onClick={handleDestroy}
                  disabled={actionLoading === "destroy"}
                >
                  <Trash2 className={`w-4 h-4 mr-2 ${actionLoading === "destroy" ? "animate-pulse" : ""}`} />
                  {actionLoading === "destroy" ? "파기 중..." : "청구서 파기"}
                </Button>
              )}

              {/* 분할 청구 */}
              {canSplit && (
                <Button
                  variant="outline"
                  className="w-full text-purple-600 border-purple-200 hover:bg-purple-50"
                  onClick={() => setSplitModalOpen(true)}
                  disabled={actionLoading === "split"}
                >
                  <Scissors className={`w-4 h-4 mr-2 ${actionLoading === "split" ? "animate-pulse" : ""}`} />
                  분할 청구
                </Button>
              )}

              {/* 액션 없음 안내 */}
              {!canSend && !canSync && !canResend && !canOfflinePayment && !canCancel && !canDestroy && !canSplit && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  현재 상태에서 가능한 액션이 없습니다.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* 분할 청구 모달 */}
      <SplitInvoiceModal
        open={splitModalOpen}
        onClose={() => setSplitModalOpen(false)}
        onConfirm={handleSplitInvoice}
        originalAmount={data.amount}
        studentName={studentName}
        yearMonth={`${data.year}년 ${data.month}월`}
        isLoading={actionLoading === "split"}
      />
    </div>
  )
}
