"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"

export default function SettingsTabs() {
  const pathname = usePathname()
  return (
    <div className="flex gap-2 border-b mb-2">
      <Link
        href="/settings"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname === "/settings"
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        AI 키워드
      </Link>
      <Link
        href="/settings/ai-logs"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname.startsWith("/settings/ai-logs")
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        AI 로그
      </Link>
      <Link
        href="/settings/ai-usage"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname.startsWith("/settings/ai-usage")
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        사용량 관리
      </Link>
    </div>
  )
}
