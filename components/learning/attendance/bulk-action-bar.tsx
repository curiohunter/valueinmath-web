"use client"

import { Button } from "@/components/ui/button"
import { LogIn, LogOut, CheckSquare, Users, X } from "lucide-react"

interface Props {
  selectedCount: number
  pendingCount: number
  checkedInCount: number
  totalPendingCount: number
  totalCheckedInCount: number
  onSelectPending: () => void
  onSelectCheckedIn: () => void
  onClearSelection: () => void
  onBulkCheckIn: () => void
  onBulkCheckOut: () => void
}

export function BulkActionBar({
  selectedCount,
  pendingCount,
  checkedInCount,
  totalPendingCount,
  totalCheckedInCount,
  onSelectPending,
  onSelectCheckedIn,
  onClearSelection,
  onBulkCheckIn,
  onBulkCheckOut,
}: Props) {
  const hasSelection = selectedCount > 0

  return (
    <div className="sticky bottom-0 z-10 border-t bg-white/80 backdrop-blur-sm px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasSelection ? (
            <span className="text-sm font-medium text-slate-700">
              <CheckSquare className="w-4 h-4 inline mr-1 text-blue-600" />
              {selectedCount}명 선택
            </span>
          ) : (
            <span className="text-sm text-slate-400">
              <Users className="w-4 h-4 inline mr-1" />
              빠른 선택
            </span>
          )}
          <div className="flex items-center gap-1 ml-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectPending}
              disabled={totalPendingCount === 0}
              className="h-7 px-2 text-xs text-slate-600"
            >
              미처리({totalPendingCount})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectCheckedIn}
              disabled={totalCheckedInCount === 0}
              className="h-7 px-2 text-xs text-slate-600"
            >
              등원완료({totalCheckedInCount})
            </Button>
            {hasSelection && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="h-7 px-2 text-xs text-slate-500"
              >
                <X className="w-3 h-3 mr-1" />
                해제
              </Button>
            )}
          </div>
        </div>
        {hasSelection && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={onBulkCheckIn}
              disabled={pendingCount === 0}
              className="h-8 px-4 bg-green-600 hover:bg-green-700 text-white text-xs font-medium"
            >
              <LogIn className="w-3.5 h-3.5 mr-1.5" />
              일괄 등원({pendingCount})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onBulkCheckOut}
              disabled={checkedInCount === 0}
              className="h-8 px-4 border-slate-300 text-slate-700 text-xs font-medium"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              일괄 하원({checkedInCount})
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
