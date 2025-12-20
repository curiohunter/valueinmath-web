"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"

export default function AnalyticsTabs() {
  const pathname = usePathname()

  return (
    <div className="flex gap-2 border-b mb-4">
      <Link
        href="/analytics"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname === "/analytics"
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        운영 통계
      </Link>
      <Link
        href="/analytics/funnel"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname === "/analytics/funnel"
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        퍼널 분석
      </Link>
      <Link
        href="/analytics/funnel-v2"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname === "/analytics/funnel-v2"
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        액션 센터
        <span className="ml-1 text-xs text-amber-600 font-medium">Beta</span>
      </Link>
      <Link
        href="/analytics/risk"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname === "/analytics/risk"
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        위험도 분석
      </Link>
      <Link
        href="/analytics/alerts"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname === "/analytics/alerts"
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        알림 관리
      </Link>
    </div>
  )
}
