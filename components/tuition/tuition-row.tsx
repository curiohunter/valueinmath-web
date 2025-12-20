// @ts-nocheck
"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Calendar, Save, ExternalLink, Gift, Users, ChevronDown } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { CLASS_TYPES, CLASS_TYPE_LABELS, PAYMENT_STATUS, type TuitionRow as TuitionRowType, type ClassType, type PaymentStatus } from "@/types/tuition"
import { PaymentStatusBadge } from "@/components/payssam"
import type { CampaignParticipant, Campaign } from "@/services/campaign-service"
import {
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

interface TuitionRowProps {
  row: TuitionRowType
  index: number
  isSelected?: boolean
  onChange?: (index: number, field: keyof TuitionRowType, value: any) => void
  onDelete?: (index: number) => void
  onSelect?: (index: number, selected: boolean) => void
  onSave?: (index: number) => void // 개별 저장 핸들러
  onRefresh?: () => void // 데이터 새로고침 핸들러
  isReadOnly?: boolean
  isHistoryMode?: boolean // 이력 모드 여부
  isDateColumnsCollapsed?: boolean // 연월+기간 컬럼 접힘 상태
  // 할인 알림 정보
  hasPendingRewards?: boolean // 마케팅 할인 대기 중
  pendingRewardsCount?: number // 대기 중인 보상 수
  hasSiblingCandidate?: boolean // 형제 할인 가능 (같은 학부모 전화번호)
  // 학생별 대기중 이벤트 목록
  pendingEvents?: CampaignParticipant[]
  onApplyEvent?: (participantId: string, discountAmount: number) => void
  // 할인 정책 목록
  availablePolicies?: Campaign[]
  onApplyPolicy?: (policy: Campaign, discountAmount: number) => void
}

export function TuitionRow({
  row,
  index,
  isSelected = false,
  onChange,
  onDelete,
  onSelect,
  onSave,
  onRefresh,
  isReadOnly = false,
  isHistoryMode = false,
  isDateColumnsCollapsed = false,
  hasPendingRewards = false,
  pendingRewardsCount = 0,
  hasSiblingCandidate = false,
  pendingEvents = [],
  onApplyEvent,
  availablePolicies = [],
  onApplyPolicy
}: TuitionRowProps) {
  const router = useRouter()

  // 상세 페이지로 이동
  const handleNavigateToDetail = () => {
    router.push(`/students/tuition-history/${row.id}`)
  }
  // 납부상태별 스타일링
  const getPaymentStatusStyle = (status: PaymentStatus): string => {
    switch (status) {
      case '완납':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
      case '미납':
        return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
      case '분할청구':
        return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
    }
  }

  // 수업유형별 스타일링
  const getClassTypeStyle = (type: ClassType): string => {
    switch (type) {
      case '정규':
        return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
      case '특강':
        return 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
      case '모의고사비':
        return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
      case '입학테스트비':
        return 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
      case '입학테스트비':
        return 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
    }
  }

  // 연월 포맷팅
  const formatYearMonth = () => {
    return `${row.year}-${row.month.toString().padStart(2, '0')}`
  }

  // 연월 변경 핸들러
  const handleYearMonthChange = (value: string) => {
    const [year, month] = value.split('-')
    onChange?.(index, 'year', parseInt(year))
    onChange?.(index, 'month', parseInt(month))
  }

  // 금액 포맷팅
  const formatAmount = (amount: number): string => {
    return amount.toLocaleString('ko-KR')
  }

  // 이벤트 할인 적용 핸들러
  const handleApplyEvent = (event: CampaignParticipant) => {
    if (!onChange || isReadOnly) return

    // 할인 금액 계산
    let discountAmount: number
    const amountType = event.reward_amount_type || "fixed"

    if (amountType === "percent") {
      // 퍼센트 할인: 현재 금액 * (할인율 / 100)
      discountAmount = Math.round(row.amount * (event.reward_amount / 100))
    } else {
      // 고정 금액 할인
      discountAmount = event.reward_amount
    }

    // 금액 차감
    const newAmount = Math.max(0, row.amount - discountAmount)
    onChange(index, 'amount', newAmount)

    // 비고에 이벤트 정보 추가
    const eventTitle = (event.campaign as any)?.title || "이벤트"
    const discountText = amountType === "percent"
      ? `${event.reward_amount}% (${discountAmount.toLocaleString()}원)`
      : `${discountAmount.toLocaleString()}원`
    const notePrefix = row.note ? `${row.note} / ` : ""
    onChange(index, 'note', `${notePrefix}${eventTitle} ${discountText} 적용`)

    // 콜백 호출 (상태 업데이트용)
    onApplyEvent?.(event.id, discountAmount)
  }

  // 할인 정책 적용 핸들러
  const handleApplyPolicy = (policy: Campaign) => {
    if (!onChange || isReadOnly) return

    // 할인 금액 계산
    let discountAmount: number
    const amountType = policy.reward_amount_type || "fixed"

    if (amountType === "percent") {
      // 퍼센트 할인: 현재 금액 * (할인율 / 100)
      discountAmount = Math.round(row.amount * (policy.reward_amount / 100))
    } else {
      // 고정 금액 할인
      discountAmount = policy.reward_amount
    }

    // 금액 차감
    const newAmount = Math.max(0, row.amount - discountAmount)
    onChange(index, 'amount', newAmount)

    // 비고에 정책 정보 추가
    const policyTitle = policy.title || "할인정책"
    const discountText = amountType === "percent"
      ? `${policy.reward_amount}% (${discountAmount.toLocaleString()}원)`
      : `${discountAmount.toLocaleString()}원`
    const notePrefix = row.note ? `${row.note} / ` : ""
    onChange(index, 'note', `${notePrefix}${policyTitle} ${discountText} 적용`)

    // 콜백 호출 (상태 업데이트용)
    onApplyPolicy?.(policy, discountAmount)
  }

  return (
    <tr className={cn(
      "group transition-all duration-200 ease-in-out border-b border-slate-100",
      "hover:bg-gradient-to-r hover:from-blue-50/50 hover:via-indigo-50/30 hover:to-purple-50/50",
      "hover:shadow-sm hover:border-blue-200",
      isSelected && "bg-gradient-to-r from-blue-50 via-indigo-50/50 to-purple-50/30 border-blue-200 shadow-sm"
    )}>
      {/* 선택 체크박스 */}
      {!isReadOnly && onSelect && (
        <td className="w-12 px-3 py-3 text-center">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect?.(index, checked as boolean)}
            className="transition-colors"
          />
        </td>
      )}
      
      {/* 반명 */}
      <td className="min-w-[100px] w-[12%] px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
          <span className="font-semibold text-slate-800 truncate" title={row.className}>
            {row.className}
          </span>
        </div>
      </td>
      
      {/* 학생명 */}
      <td className="min-w-[100px] w-[12%] px-3 py-3">
        <div className="flex items-center gap-1.5">
          {isHistoryMode ? (
            <button
              onClick={handleNavigateToDetail}
              className="font-medium text-slate-700 truncate hover:text-blue-600 hover:underline cursor-pointer transition-colors"
              title={`${row.studentName} 상세 보기`}
            >
              {row.studentName}
            </button>
          ) : (
            <span className="font-medium text-slate-700 truncate" title={row.studentName}>
              {row.studentName}
            </span>
          )}
          {/* 할인 적용 드롭다운 (이벤트 + 정책 통합) */}
          {!isReadOnly && (pendingEvents.length > 0 || availablePolicies.length > 0) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                >
                  <Gift className="w-3 h-3 mr-1" />
                  할인 {pendingEvents.length + availablePolicies.length}
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {/* 대기중 이벤트 */}
                {pendingEvents.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      🎁 이벤트 혜택
                    </DropdownMenuLabel>
                    {pendingEvents.map((event) => {
                      const campaign = event.campaign as any
                      const amountType = event.reward_amount_type || "fixed"
                      const displayAmount = amountType === "percent"
                        ? `${event.reward_amount}%`
                        : `${event.reward_amount.toLocaleString()}원`

                      return (
                        <DropdownMenuItem
                          key={event.id}
                          onClick={() => handleApplyEvent(event)}
                          className="flex flex-col items-start gap-1 cursor-pointer"
                        >
                          <div className="font-medium text-sm">
                            {campaign?.title || "이벤트"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            할인: {displayAmount}
                            {amountType === "percent" && (
                              <span className="ml-1">
                                (≈ {Math.round(row.amount * (event.reward_amount / 100)).toLocaleString()}원)
                              </span>
                            )}
                          </div>
                        </DropdownMenuItem>
                      )
                    })}
                    {availablePolicies.length > 0 && <DropdownMenuSeparator />}
                  </>
                )}
                {/* 할인 정책 */}
                {availablePolicies.length > 0 && (
                  <>
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      📋 할인 정책
                    </DropdownMenuLabel>
                    {availablePolicies.map((policy) => {
                      const amountType = policy.reward_amount_type || "fixed"
                      const displayAmount = amountType === "percent"
                        ? `${policy.reward_amount}%`
                        : `${policy.reward_amount.toLocaleString()}원`

                      return (
                        <DropdownMenuItem
                          key={policy.id}
                          onClick={() => handleApplyPolicy(policy)}
                          className="flex flex-col items-start gap-1 cursor-pointer"
                        >
                          <div className="font-medium text-sm">
                            {policy.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            할인: {displayAmount}
                            {amountType === "percent" && (
                              <span className="ml-1">
                                (≈ {Math.round(row.amount * (policy.reward_amount / 100)).toLocaleString()}원)
                              </span>
                            )}
                          </div>
                        </DropdownMenuItem>
                      )
                    })}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </td>
      
      {/* 연월 - 접힘 상태에 따라 표시 */}
      {isDateColumnsCollapsed ? (
        <td className="px-2 py-3">
          <span className="text-xs text-slate-500">
            {row.year}.{row.month.toString().padStart(2, '0')}
            {row.periodStartDate && (
              <span className="ml-1 text-slate-400">
                ({row.periodStartDate.substring(5, 10)}~)
              </span>
            )}
          </span>
        </td>
      ) : (
        <td className="min-w-[120px] w-[15%] px-3 py-3">
          <div className="relative">
            <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              type="month"
              value={formatYearMonth()}
              onChange={(e) => handleYearMonthChange(e.target.value)}
              className="pl-8 text-sm border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 transition-colors"
            />
          </div>
        </td>
      )}

      {/* 수업유형 */}
      <td className="min-w-[100px] w-[12%] px-3 py-3">
        <Select
          value={row.classType}
          onValueChange={(value: ClassType) => onChange?.(index, 'classType', value)}
        >
          <SelectTrigger className={cn(
            "text-sm font-medium border transition-all duration-200",
            getClassTypeStyle(row.classType)
          )}>
            <SelectValue>{CLASS_TYPE_LABELS[row.classType]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CLASS_TYPES.map(type => (
              <SelectItem key={type} value={type} className="font-medium">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    type === '정규' ? 'bg-blue-400' : 
                    type === '특강' ? 'bg-purple-400' :
                    type === '모의고사비' ? 'bg-green-400' :
                    type === '입학테스트비' ? 'bg-orange-400' :
                    type === '입학테스트비' ? 'bg-orange-400' :
                    'bg-slate-400'
                  )} />
                  {CLASS_TYPE_LABELS[type]}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      
      {/* 원비 */}
      <td className="min-w-[120px] w-[15%] px-3 py-3">
        <div className="relative">
          <Input
            type="text"
            value={formatAmount(row.amount)}
            onChange={(e) => {
              // 숫자와 쉼표만 허용하고 숫자로 변환
              const value = e.target.value.replace(/[^\d]/g, '')
              onChange?.(index, 'amount', parseInt(value) || 0)
            }}
            className="text-sm text-right font-medium border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 transition-colors pr-8"
            placeholder="0"
            disabled={isReadOnly}
          />
          <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-slate-500 font-medium pointer-events-none">
            원
          </span>
        </div>
      </td>

      {/* 수업 기간 - 펼침 상태에서만 표시 */}
      {!isDateColumnsCollapsed && (
        <td className="min-w-[240px] px-2 py-3">
          <div className="flex gap-1 items-center">
            <Input
              type="date"
              value={row.periodStartDate || ''}
              onChange={(e) => onChange?.(index, 'periodStartDate', e.target.value)}
              className="h-8 text-xs w-28 border-slate-200 focus:border-blue-400"
              disabled={isReadOnly}
            />
            <span className="text-xs text-slate-500">~</span>
            <Input
              type="date"
              value={row.periodEndDate || ''}
              onChange={(e) => onChange?.(index, 'periodEndDate', e.target.value)}
              className="h-8 text-xs w-28 border-slate-200 focus:border-blue-400"
              disabled={isReadOnly}
            />
          </div>
        </td>
      )}

      {/* 납부상태 */}
      <td className="min-w-[100px] w-[12%] px-3 py-3">
        <Select
          value={row.paymentStatus}
          onValueChange={(value: PaymentStatus) => onChange?.(index, 'paymentStatus', value)}
        >
          <SelectTrigger className={cn(
            "text-sm font-semibold border transition-all duration-200",
            getPaymentStatusStyle(row.paymentStatus)
          )}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_STATUS.map(status => (
              <SelectItem key={status} value={status} className="font-medium">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    status === '완납' ? 'bg-emerald-400' : 
                    status === '미납' ? 'bg-red-400' : 'bg-amber-400'
                  )} />
                  {status}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      
      {/* 비고 */}
      <td className="min-w-[150px] w-[18%] px-3 py-3">
        <Input
          type="text"
          value={row.note || ''}
          onChange={(e) => onChange?.(index, 'note', e.target.value)}
          className="text-sm border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 transition-colors"
          placeholder="비고사항을 입력하세요"
        />
      </td>

      {/* 청구 상태 (PaysSam) - 이력 모드에서만 표시 */}
      {isHistoryMode && (
        <td className="min-w-[100px] w-[10%] px-3 py-3">
          <PaymentStatusBadge
            status={row.paysSamRequestStatus || null}
            size="sm"
            showIcon={true}
          />
        </td>
      )}

      {/* 액션 버튼 */}
      {!isReadOnly && (
        <td className="min-w-[80px] w-[10%] px-3 py-3 text-center">
          <div className="flex items-center justify-center gap-1">
            {isHistoryMode && onSave && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onSave(index)}
                className="w-8 h-8 p-0 bg-green-100 hover:bg-green-200 transition-all duration-200 rounded-full"
                title="저장"
              >
                ✅
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete?.(index)}
              className="w-8 h-8 p-0 text-red-500 hover:bg-red-50 transition-all duration-200"
              title="삭제"
            >
              🗑️
            </Button>
          </div>
        </td>
      )}
    </tr>
  )
}