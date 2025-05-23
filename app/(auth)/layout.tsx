import type { ReactNode } from "react"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
