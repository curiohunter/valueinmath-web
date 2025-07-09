"use client"

import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { Database } from "@/types/database"

type MonthlyReportRow = Database["public"]["Tables"]["monthly_reports"]["Row"]
type MonthlyReportInsert = Database["public"]["Tables"]["monthly_reports"]["Insert"]
type MonthlyReportUpdate = Database["public"]["Tables"]["monthly_reports"]["Update"]

// 월간 보고서 저장 (클라이언트용)
export async function saveMonthlyReport(
  title: string,
  content: string,
  year: number,
  month: number,
  metadata?: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseBrowserClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("인증되지 않은 사용자입니다.")

    const reportData: MonthlyReportInsert = {
      title,
      content,
      year,
      month,
      metadata: metadata || {},
      created_by: user.id,
    }

    const { error } = await supabase
      .from("monthly_reports")
      .insert([reportData])

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error("Error saving monthly report:", error)
    return { success: false, error: error.message }
  }
}

// 저장된 월간 보고서 목록 조회 (클라이언트용)
export async function getSavedMonthlyReports(): Promise<MonthlyReportRow[]> {
  try {
    const supabase = getSupabaseBrowserClient()
    
    const { data, error } = await supabase
      .from("monthly_reports")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error("Error fetching saved reports:", error)
    return []
  }
}

// 특정 보고서 조회 (클라이언트용)
export async function getSavedReportById(id: string): Promise<MonthlyReportRow | null> {
  try {
    const supabase = getSupabaseBrowserClient()
    
    const { data, error } = await supabase
      .from("monthly_reports")
      .select("*")
      .eq("id", id)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error("Error fetching report by id:", error)
    return null
  }
}

// 보고서 삭제 (클라이언트용)
export async function deleteSavedReport(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseBrowserClient()
    
    const { error } = await supabase
      .from("monthly_reports")
      .delete()
      .eq("id", id)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error("Error deleting report:", error)
    return { success: false, error: error.message }
  }
}

// 보고서 업데이트 (클라이언트용)
export async function updateSavedReport(
  id: string,
  updates: Partial<MonthlyReportUpdate>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseBrowserClient()
    
    const { error } = await supabase
      .from("monthly_reports")
      .update(updates)
      .eq("id", id)

    if (error) throw error

    return { success: true }
  } catch (error: any) {
    console.error("Error updating report:", error)
    return { success: false, error: error.message }
  }
}