"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tag, Gift, Users, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DiscountDetail } from "@/services/campaign-service"

interface TuitionDiscountSectionProps {
  discountDetails: DiscountDetail[]
  siblingDiscount: boolean
  siblingDiscountAmount?: number
  loading?: boolean
  onRemoveDiscount?: (participantId: string) => Promise<void>
  readOnly?: boolean
}

const formatAmount = (amount: number, amountType?: string, isNegative = true) => {
  const prefix = isNegative ? "-" : ""
  if (amountType === "percent") {
    return `${prefix}${amount}%`
  }
  return `${prefix}${amount.toLocaleString()}원`
}

const DISCOUNT_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  sibling: {
    label: "형제 할인",
    icon: <Users className="w-4 h-4" />,
    color: "bg-blue-50 border-blue-200 text-blue-700",
  },
  event: {
    label: "이벤트 할인",
    icon: <Gift className="w-4 h-4" />,
    color: "bg-amber-50 border-amber-200 text-amber-700",
  },
  special: {
    label: "특별 할인",
    icon: <Tag className="w-4 h-4" />,
    color: "bg-purple-50 border-purple-200 text-purple-700",
  },
  other: {
    label: "기타 할인",
    icon: <Tag className="w-4 h-4" />,
    color: "bg-gray-50 border-gray-200 text-gray-700",
  },
}

export function TuitionDiscountSection({
  discountDetails,
  siblingDiscount,
  siblingDiscountAmount = 0,
  loading = false,
  onRemoveDiscount,
  readOnly = false,
}: TuitionDiscountSectionProps) {
  // 형제 할인을 discountDetails에 포함 (별도로 표시하기 위해 분리)
  const allDiscounts: Array<DiscountDetail & { isSystemDiscount?: boolean }> = [
    // 형제 할인
    ...(siblingDiscount
      ? [
          {
            type: "sibling" as const,
            amount: siblingDiscountAmount,
            description: "형제 할인 (5%)",
            isSystemDiscount: true,
          },
        ]
      : []),
    // discount_details의 할인들
    ...discountDetails,
  ]

  // 총 할인 금액
  const totalDiscount = allDiscounts.reduce((sum, d) => sum + d.amount, 0)

  if (allDiscounts.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Tag className="w-5 h-5" />
          할인 내역
        </h2>
        <div className="text-sm text-muted-foreground text-center py-6">
          적용된 할인이 없습니다
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Tag className="w-5 h-5" />
        할인 내역
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </h2>

      <div className="space-y-2">
        {allDiscounts.map((discount, index) => {
          const config = DISCOUNT_TYPE_CONFIG[discount.type] || DISCOUNT_TYPE_CONFIG.other

          return (
            <div
              key={`${discount.type}-${discount.participant_id || index}`}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                config.color
              )}
            >
              <div className="flex items-center gap-3">
                {config.icon}
                <div>
                  <div className="font-medium">{config.label}</div>
                  {discount.description && (
                    <div className="text-xs opacity-75">{discount.description}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{formatAmount(discount.amount, discount.amount_type)}</span>
                {/* 이벤트 할인만 삭제 가능 (형제 할인은 시스템 관리) */}
                {!readOnly &&
                  discount.participant_id &&
                  onRemoveDiscount &&
                  !(discount as any).isSystemDiscount && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onRemoveDiscount(discount.participant_id!)}
                      disabled={loading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
              </div>
            </div>
          )
        })}

        {/* 총 할인 금액 */}
        <div className="flex justify-between pt-3 mt-3 border-t border-dashed">
          <span className="font-medium text-muted-foreground">총 할인</span>
          <span className="font-bold text-lg text-green-600">
            {formatAmount(totalDiscount)}
          </span>
        </div>
      </div>
    </Card>
  )
}
