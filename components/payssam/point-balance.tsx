"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Coins, RefreshCw, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface PointBalanceProps {
  className?: string
  showRefresh?: boolean
  compact?: boolean
}

interface BalanceData {
  balance: string
  config: {
    environment: string
    member: string
    merchant: string
  }
}

export function PointBalance({
  className,
  showRefresh = true,
  compact = false,
}: PointBalanceProps) {
  const [balance, setBalance] = useState<BalanceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBalance = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/payssam/balance")
      const data = await response.json()

      if (data.success) {
        setBalance(data.data)
      } else {
        setError(data.error || "잔액 조회 실패")
      }
    } catch (err) {
      console.error("Balance fetch error:", err)
      setError("잔액 조회 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBalance()
  }, [])

  // 테스트 환경에서 에러가 나면 "테스트 모드" 표시
  if (error) {
    if (compact) {
      return (
        <div className={cn("flex items-center gap-2", className)}>
          <Badge
            variant="outline"
            className="font-medium bg-blue-50 text-blue-600 border-blue-200"
          >
            <Coins className="w-3 h-3 mr-1" />
            테스트 모드
          </Badge>
        </div>
      )
    }

    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 rounded-full">
            <Coins className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-xs text-blue-600 font-medium">쌤포인트</div>
            <div className="text-lg font-bold text-blue-800">테스트 모드</div>
          </div>
        </div>
        <div className="flex-1" />
        <div className="text-right text-xs text-blue-600">
          <div>개발 환경에서는 잔액 조회 불가</div>
          <Badge variant="outline" className="text-xs py-0 mt-1 bg-blue-50 text-blue-600 border-blue-200">
            개발
          </Badge>
        </div>
        {showRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchBalance}
            disabled={isLoading}
            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        )}
      </div>
    )
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Badge
          variant="outline"
          className={cn(
            "font-medium",
            isLoading
              ? "bg-gray-50 text-gray-400 border-gray-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          )}
        >
          <Coins className="w-3 h-3 mr-1" />
          {isLoading ? "로딩..." : `${Number(balance?.balance || 0).toLocaleString()}P`}
        </Badge>
        {balance?.config?.environment && (
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              balance.config.environment === "운영"
                ? "bg-green-50 text-green-600 border-green-200"
                : "bg-blue-50 text-blue-600 border-blue-200"
            )}
          >
            {balance.config.environment}
          </Badge>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <div className="p-2 bg-amber-100 rounded-full">
          <Coins className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <div className="text-xs text-amber-600 font-medium">쌤포인트 잔액</div>
          <div className="text-lg font-bold text-amber-800">
            {isLoading ? (
              <span className="text-gray-400">로딩 중...</span>
            ) : (
              `${Number(balance?.balance || 0).toLocaleString()}P`
            )}
          </div>
        </div>
      </div>

      <div className="flex-1" />

      {balance?.config && (
        <div className="text-right text-xs text-amber-600">
          <div>가맹점: {balance.config.merchant}</div>
          <div className="flex items-center gap-1 justify-end mt-1">
            환경:
            <Badge
              variant="outline"
              className={cn(
                "text-xs py-0",
                balance.config.environment === "운영"
                  ? "bg-green-50 text-green-600 border-green-200"
                  : "bg-blue-50 text-blue-600 border-blue-200"
              )}
            >
              {balance.config.environment}
            </Badge>
          </div>
        </div>
      )}

      {showRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchBalance}
          disabled={isLoading}
          className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
        >
          <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
        </Button>
      )}
    </div>
  )
}
