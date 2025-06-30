import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

// 클라이언트 컴포넌트에서 사용할 Supabase 클라이언트 (싱글턴 패턴)
let clientInstance: ReturnType<typeof createBrowserSupabaseClient> | null = null

// 브라우저 클라이언트 생성
export function createBrowserSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
}

// 싱글턴 패턴으로 클라이언트 인스턴스 관리
export function getSupabaseBrowserClient() {
  if (!clientInstance) {
    clientInstance = createBrowserSupabaseClient()
  }
  return clientInstance
}

// 클라이언트 인스턴스 재설정 (로그아웃 등에 사용)
export function resetSupabaseBrowserClient() {
  clientInstance = null
}

// 레거시 클라이언트 (일반 컴포넌트에서 사용)
export const supabaseClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);