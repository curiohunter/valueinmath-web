// @ts-nocheck
"use client"

import React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Calendar, Save } from "lucide-react"
import { cn } from "@/lib/utils"
import { CLASS_TYPES, PAYMENT_STATUS, type TuitionRow as TuitionRowType, type ClassType, type PaymentStatus } from "@/types/tuition"

interface TuitionRowProps {
  row: TuitionRowType
  index: number
  isSelected?: boolean
  onChange?: (index: number, field: keyof TuitionRowType, value: any) => void
  onDelete?: (index: number) => void
  onSelect?: (index: number, selected: boolean) => void
  onSave?: (index: number) => void // 개별 저장 핸들러
  isReadOnly?: boolean
  isHistoryMode?: boolean // 이력 모드 여부
}

export function TuitionRow({
  row,
  index,
  isSelected = false,
  onChange,
  onDelete,
  onSelect,
  onSave,
  isReadOnly = false,
  isHistoryMode = false
}: TuitionRowProps) {
  // 납부상태별 스타일링
  const getPaymentStatusStyle = (status: PaymentStatus): string => {
    switch (status) {
      case '완납':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
      case '미납':
        return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
      case '부분납':
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

  // 형제할인 체크박스 변경 핸들러
  const handleSiblingDiscountChange = (checked: boolean) => {
    onChange?.(index, 'isSibling', checked)
    
    // 할인 적용/해제에 따른 금액 자동 조정
    if (!isReadOnly) {
      const currentAmount = row.amount
      let newAmount: number
      
      if (checked) {
        // 할인 적용: 현재 금액이 할인 전 금액이라고 가정하고 5% 할인
        newAmount = Math.floor(currentAmount * 0.95)
      } else {
        // 할인 해제: 현재 금액이 할인된 금액이라고 가정하고 원래 금액으로 복원
        newAmount = Math.floor(currentAmount / 0.95)
      }
      
      onChange?.(index, 'amount', newAmount)
    }
  }

  // 금액 포맷팅
  const formatAmount = (amount: number): string => {
    return amount.toLocaleString('ko-KR')
  }

  return (
    <tr className={cn(
      "group transition-all duration-200 ease-in-out border-b border-slate-100",
      "hover:bg-gradient-to-r hover:from-blue-50/50 hover:via-indigo-50/30 hover:to-purple-50/50",
      "hover:shadow-sm hover:border-blue-200",
      isSelected && "bg-gradient-to-r from-blue-50 via-indigo-50/50 to-purple-50/30 border-blue-200 shadow-sm"
    )}>
      {/* 선택 체크박스 - 이력 모드에서는 숨김 */}
      {!isReadOnly && !isHistoryMode && (
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
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-700 truncate" title={row.studentName}>
            {row.studentName}
          </span>
          {row.isSibling && (
            <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-orange-50 text-orange-600 border-orange-200">
              형제
            </Badge>
          )}
        </div>
      </td>
      
      {/* 연월 */}
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
      
      {/* 형제할인 */}
      <td className="min-w-[80px] w-[10%] px-3 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <Checkbox
            checked={row.isSibling}
            onCheckedChange={(checked) => handleSiblingDiscountChange(checked as boolean)}
            disabled={isReadOnly}
            className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
          />
          {row.isSibling && (
            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-200">
              5%
            </Badge>
          )}
        </div>
      </td>
      
      {/* 수업유형 */}
      <td className="min-w-[100px] w-[12%] px-3 py-3">
        <Select
          value={row.classType}
          onValueChange={(value: ClassType) => onChange(index, 'classType', value)}
        >
          <SelectTrigger className={cn(
            "text-sm font-medium border transition-all duration-200",
            getClassTypeStyle(row.classType)
          )}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CLASS_TYPES.map(type => (
              <SelectItem key={type} value={type} className="font-medium">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    type === '정규' ? 'bg-blue-400' : 'bg-purple-400'
                  )} />
                  {type}
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
      
      {/* 납부상태 */}
      <td className="min-w-[100px] w-[12%] px-3 py-3">
        <Select
          value={row.paymentStatus}
          onValueChange={(value: PaymentStatus) => onChange(index, 'paymentStatus', value)}
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
      <td className="min-w-[150px] w-[20%] px-3 py-3">
        <Input
          type="text"
          value={row.note || ''}
          onChange={(e) => onChange(index, 'note', e.target.value)}
          className="text-sm border-slate-200 focus:border-blue-400 focus:ring-blue-400/20 transition-colors"
          placeholder="비고사항을 입력하세요"
        />
      </td>
      
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