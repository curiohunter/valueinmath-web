import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export const createServerClient = async () => {
  const cookieStore = await cookies()
  return createServerComponentClient<Database>({ 
    cookies: () => cookieStore 
  })
}