"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen, X, Loader2 } from "lucide-react"
import type { AdditionalDetail } from "@/types/textbook"

interface TuitionChargeSectionProps {
  additionalDetails: AdditionalDetail[]
  loading?: boolean
  onRemoveCharge?: (assignmentId: string) => Promise<void>
  readOnly?: boolean
}

const formatAmount = (amount: number) => {
  return `+${amount.toLocaleString()}원`
}

const CHARGE_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  textbook: {
    label: "교재비",
    icon: <BookOpen className="w-4 h-4" />,
    color: "bg-indigo-50 border-indigo-200 text-indigo-700",
  },
}

export function TuitionChargeSection({
  additionalDetails,
  loading = false,
  onRemoveCharge,
  readOnly = false,
}: TuitionChargeSectionProps) {
  const totalCharge = additionalDetails.reduce((sum, d) => sum + d.amount, 0)

  if (additionalDetails.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          추가비용 내역
        </h2>
        <div className="text-sm text-muted-foreground text-center py-6">
          적용된 추가비용이 없습니다
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <BookOpen className="w-5 h-5" />
        추가비용 내역
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </h2>

      <div className="space-y-2">
        {additionalDetails.map((detail, index) => {
          const config = CHARGE_TYPE_CONFIG[detail.type] || CHARGE_TYPE_CONFIG.textbook

          return (
            <div
              key={`${detail.type}-${detail.assignment_id || index}`}
              className={`flex items-center justify-between p-3 rounded-lg border ${config.color}`}
            >
              <div className="flex items-center gap-3">
                {config.icon}
                <div>
                  <div className="font-medium">{config.label}</div>
                  {detail.description && (
                    <div className="text-xs opacity-75">{detail.description}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{formatAmount(detail.amount)}</span>
                {!readOnly && detail.assignment_id && onRemoveCharge && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onRemoveCharge(detail.assignment_id)}
                    disabled={loading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}

        {/* 총 추가비용 */}
        <div className="flex justify-between pt-3 mt-3 border-t border-dashed">
          <span className="font-medium text-muted-foreground">총 추가비용</span>
          <span className="font-bold text-lg text-indigo-600">
            {formatAmount(totalCharge)}
          </span>
        </div>
      </div>
    </Card>
  )
}
