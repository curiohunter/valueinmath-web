"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PaginationProps {
  totalPages: number
  currentPage: number
}

export function Pagination({ totalPages, currentPage }: PaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Create a new URLSearchParams and update the router
  const createQueryString = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", page.toString())
    return params.toString()
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return
    router.push(`${pathname}?${createQueryString(page)}`)
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = []
    const maxPagesToShow = 5

    if (totalPages <= maxPagesToShow) {
      // Show all pages if total pages is less than or equal to maxPagesToShow
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      // Calculate start and end page numbers
      let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2))
      let endPage = startPage + maxPagesToShow - 1

      if (endPage > totalPages) {
        endPage = totalPages
        startPage = Math.max(1, endPage - maxPagesToShow + 1)
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i)
      }
    }

    return pageNumbers
  }

  return (
    <div className="flex items-center justify-center space-x-2 bg-card rounded-lg p-2 shadow-sm">
      <Button
        variant="outline"
        size="icon"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">이전 페이지</span>
      </Button>

      {getPageNumbers().map((page) => (
        <Button
          key={page}
          variant={page === currentPage ? "default" : "outline"}
          size="icon"
          onClick={() => handlePageChange(page)}
          aria-current={page === currentPage ? "page" : undefined}
        >
          {page}
        </Button>
      ))}

      <Button
        variant="outline"
        size="icon"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">다음 페이지</span>
      </Button>
    </div>
  )
}
