import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// @supabase/ssr의 createBrowserClient 사용
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// 싱글턴 패턴으로 클라이언트 인스턴스 관리
let clientInstance: ReturnType<typeof createClient> | null = null

export function getSupabaseBrowserClient() {
  if (!clientInstance) {
    clientInstance = createClient()
  }
  return clientInstance
}

// 클라이언트 인스턴스 재설정 (로그아웃 등에 사용)
export function resetSupabaseBrowserClient() {
  clientInstance = null
}