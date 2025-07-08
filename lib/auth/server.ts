import { cookies } from "next/headers"
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import type { Database } from "@/types/database"

export const createServerClient = async () => {
  const cookieStore = await cookies()
  
  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (error) {
            // 서버 컴포넌트에서는 쿠키 설정이 실패할 수 있음
          }
        },
      },
    }
  )
}