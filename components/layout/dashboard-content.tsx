"use client"

import type React from "react"

export function DashboardContent({ children }: { children: React.ReactNode }) {
  return <main className="flex-1 overflow-auto p-4">{children}</main>
}
