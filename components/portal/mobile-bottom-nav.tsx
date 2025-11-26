"use client"

import { Home, BookOpen, CreditCard, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export type PortalTab = "home" | "learning" | "tuition" | "comments"

interface MobileBottomNavProps {
  activeTab: PortalTab
  onTabChange: (tab: PortalTab) => void
  showTuition?: boolean // 학부모만 원비 탭 표시
}

const tabs: { id: PortalTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "home", label: "홈", icon: Home },
  { id: "learning", label: "학습", icon: BookOpen },
  { id: "tuition", label: "원비", icon: CreditCard },
  { id: "comments", label: "코멘트", icon: MessageCircle },
]

export function MobileBottomNav({
  activeTab,
  onTabChange,
  showTuition = true,
}: MobileBottomNavProps) {
  const visibleTabs = showTuition ? tabs : tabs.filter((tab) => tab.id !== "tuition")

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t pb-safe">
      <div className="flex items-center justify-around h-16">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full",
                "transition-colors duration-200",
                "min-w-[64px] min-h-[44px]", // Touch target size
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "h-5 w-5 mb-1",
                  isActive && "text-primary"
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium",
                  isActive && "text-primary"
                )}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
