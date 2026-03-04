"use client"

import useSWR from "swr"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { getAllActionItems, type ActionItemFilter } from "@/services/meeting-service"

export function useAllActionItems(filter?: ActionItemFilter) {
  const { data, error, isLoading, mutate } = useSWR(
    ["all-action-items", filter],
    () => getAllActionItems(filter),
    { revalidateOnFocus: false }
  )

  return {
    items: data || [],
    isLoading,
    error,
    mutate,
  }
}

export function useCurrentEmployeeId() {
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: emp } = await supabase
          .from("employees")
          .select("id")
          .eq("auth_id", user.id)
          .single()

        if (emp) setEmployeeId(emp.id)
      } catch {
        // Silently fail — user may not be an employee
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  return { employeeId, isLoading }
}
