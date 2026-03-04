"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface MeetingCollapsibleSectionProps {
  title: string
  icon?: React.ReactNode
  badge?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
  headerClassName?: string
  count?: number
}

export function MeetingCollapsibleSection({
  title,
  icon,
  badge,
  defaultOpen = true,
  children,
  className,
  headerClassName,
  count,
}: MeetingCollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Card className={className}>
      <CardHeader
        className={cn("pb-2 cursor-pointer select-none", headerClassName)}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <CardTitle className="text-sm flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          {icon}
          <span className="flex-1">{title}</span>
          {count !== undefined && (
            <span className="text-xs text-muted-foreground font-normal">
              {count}
            </span>
          )}
          {badge}
        </CardTitle>
      </CardHeader>
      {isOpen && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  )
}
