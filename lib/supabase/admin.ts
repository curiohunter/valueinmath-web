import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

let adminClient: ReturnType<typeof createClient<Database>> | null = null

export function getSupabaseAdmin() {
  if (adminClient) return adminClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase URL or service role key")
    throw new Error("서버 설정 오류: Supabase 설정이 올바르지 않습니다.")
  }

  try {
    adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
    return adminClient
  } catch (error) {
    console.error("Error creating Supabase admin client:", error)
    throw new Error("Supabase 관리자 클라이언트 생성 실패")
  }
}
