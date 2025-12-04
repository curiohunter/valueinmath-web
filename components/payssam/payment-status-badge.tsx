"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { PaysSamRequestStatus } from "@/types/tuition"
import { PAYSSAM_STATUS_LABELS } from "@/types/tuition"
import {
  Clock,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  Ban,
  Trash2,
} from "lucide-react"

interface PaymentStatusBadgeProps {
  status: PaysSamRequestStatus | null
  className?: string
  showIcon?: boolean
  size?: "sm" | "md" | "lg"
}

const STATUS_CONFIG: Record<
  PaysSamRequestStatus,
  {
    label: string
    color: string
    bgColor: string
    borderColor: string
    icon: React.ComponentType<{ className?: string }>
  }
> = {
  pending: {
    label: PAYSSAM_STATUS_LABELS.pending,
    color: "text-slate-600",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    icon: Clock,
  },
  created: {
    label: PAYSSAM_STATUS_LABELS.created,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    icon: FileText,
  },
  sent: {
    label: PAYSSAM_STATUS_LABELS.sent,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    icon: Send,
  },
  paid: {
    label: PAYSSAM_STATUS_LABELS.paid,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    icon: CheckCircle2,
  },
  failed: {
    label: PAYSSAM_STATUS_LABELS.failed,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: XCircle,
  },
  cancelled: {
    label: PAYSSAM_STATUS_LABELS.cancelled,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    icon: Ban,
  },
  destroyed: {
    label: PAYSSAM_STATUS_LABELS.destroyed,
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    icon: Trash2,
  },
}

const SIZE_CLASSES = {
  sm: "text-xs px-1.5 py-0.5",
  md: "text-xs px-2.5 py-0.5",
  lg: "text-sm px-3 py-1",
}

const ICON_SIZES = {
  sm: "w-3 h-3",
  md: "w-3.5 h-3.5",
  lg: "w-4 h-4",
}

export function PaymentStatusBadge({
  status,
  className,
  showIcon = true,
  size = "md",
}: PaymentStatusBadgeProps) {
  // null 또는 undefined인 경우 미발송 상태로 표시
  if (!status) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "font-medium border",
          "text-slate-400 bg-white border-slate-200",
          SIZE_CLASSES[size],
          className
        )}
      >
        {showIcon && <Clock className={cn("mr-1", ICON_SIZES[size])} />}
        미발송
      </Badge>
    )
  }

  const config = STATUS_CONFIG[status]
  if (!config) {
    return (
      <Badge variant="outline" className={cn(SIZE_CLASSES[size], className)}>
        {status}
      </Badge>
    )
  }

  const IconComponent = config.icon

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border",
        config.color,
        config.bgColor,
        config.borderColor,
        SIZE_CLASSES[size],
        className
      )}
    >
      {showIcon && <IconComponent className={cn("mr-1", ICON_SIZES[size])} />}
      {config.label}
    </Badge>
  )
}

// 결제 방법 표시용 배지
interface PaymentMethodBadgeProps {
  method: string | null
  className?: string
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  "01": "신용카드",
  "02": "계좌이체",
  "03": "간편결제",
  "04": "가상계좌",
}

export function PaymentMethodBadge({
  method,
  className,
}: PaymentMethodBadgeProps) {
  if (!method) return null

  const label = PAYMENT_METHOD_LABELS[method] || method

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium bg-purple-50 text-purple-600 border-purple-200",
        className
      )}
    >
      {label}
    </Badge>
  )
}
