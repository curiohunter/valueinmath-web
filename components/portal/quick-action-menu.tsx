"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { BookOpen, DollarSign, ArrowUp, Menu } from "lucide-react"
import { cn } from "@/lib/utils"

export function QuickActionMenu() {
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Scroll to section helper
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }
    setIsMenuOpen(false)
  }

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
    setIsMenuOpen(false)
  }

  return (
    <>
      {/* Mobile: Fixed Button Stack */}
      <div className="md:hidden fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {showScrollTop && (
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90"
            onClick={scrollToTop}
            aria-label="맨 위로 이동"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        )}
        <Button
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700"
          onClick={() => scrollToSection("study-logs-section")}
          aria-label="학습 기록으로 이동"
        >
          <BookOpen className="h-5 w-5" />
        </Button>
        <Button
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg bg-green-600 hover:bg-green-700"
          onClick={() => scrollToSection("tuition-section")}
          aria-label="원비 내역으로 이동"
        >
          <DollarSign className="h-5 w-5" />
        </Button>
      </div>

      {/* Desktop: Floating Action Button with Expandable Menu */}
      <div className="hidden md:block fixed bottom-8 right-8 z-50">
        <div className="relative">
          {/* Expandable Menu Items */}
          <div
            className={cn(
              "absolute bottom-16 right-0 flex flex-col gap-3 transition-all duration-300",
              isMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
            )}
          >
            {showScrollTop && (
              <Button
                size="icon"
                className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90"
                onClick={scrollToTop}
                aria-label="맨 위로 이동"
              >
                <ArrowUp className="h-5 w-5" />
              </Button>
            )}
            <Button
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700"
              onClick={() => scrollToSection("study-logs-section")}
              aria-label="학습 기록으로 이동"
            >
              <BookOpen className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg bg-green-600 hover:bg-green-700"
              onClick={() => scrollToSection("tuition-section")}
              aria-label="원비 내역으로 이동"
            >
              <DollarSign className="h-5 w-5" />
            </Button>
          </div>

          {/* Main FAB Button */}
          <Button
            size="icon"
            className={cn(
              "h-14 w-14 rounded-full shadow-xl transition-transform",
              isMenuOpen ? "rotate-45 bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90"
            )}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "메뉴 닫기" : "빠른 이동 메뉴 열기"}
            aria-expanded={isMenuOpen}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Desktop: Click outside to close */}
      {isMenuOpen && (
        <div
          className="hidden md:block fixed inset-0 z-40"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  )
}
