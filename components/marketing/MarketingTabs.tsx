"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"

export default function MarketingTabs() {
  const pathname = usePathname()

  return (
    <div className="flex gap-2 border-b mb-2">
      <Link
        href="/marketing/campaigns"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname.startsWith("/marketing/campaigns")
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        캠페인
      </Link>
      <Link
        href="/marketing/gallery"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname.startsWith("/marketing/gallery")
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        콘텐츠 갤러리
      </Link>
      <Link
        href="/marketing/reviews"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname.startsWith("/marketing/reviews")
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        후기 관리
      </Link>
      <Link
        href="/marketing/content-studio"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname.startsWith("/marketing/content-studio")
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        콘텐츠 스튜디오
      </Link>
      <Link
        href="/marketing/branding"
        className={clsx(
          "px-4 py-2 font-semibold",
          pathname.startsWith("/marketing/branding")
            ? "border-b-2 border-primary text-primary"
            : "text-muted-foreground"
        )}
      >
        브랜딩 설정
      </Link>
    </div>
  )
}
