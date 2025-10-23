"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AuthState {
  user: (User & { profile?: { role?: string } }) | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<(User & { profile?: { role?: string } }) | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // 매번 새로운 클라이언트 인스턴스 생성
  const [supabase] = useState(() => {
    const { createBrowserClient } = require('@supabase/ssr')
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  })

  useEffect(() => {
    // Check active sessions and fetch profile
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        setUser({ ...session.user, profile: profile || undefined })
      } else {
        setUser(null)
      }
      setLoading(false)
    }

    loadUser()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // SIGNED_IN 이벤트는 쿠키 설정 전에 발생할 수 있으므로 loadUser()로 처리
      if (_event === 'SIGNED_IN') {
        setLoading(false)
        return
      }

      // INITIAL_SESSION과 다른 이벤트는 정상 처리
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        setUser({ ...session.user, profile: profile || undefined })
      } else {
        setUser(null)
      }
      setLoading(false)

      // Handle auth state changes
      if (_event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}