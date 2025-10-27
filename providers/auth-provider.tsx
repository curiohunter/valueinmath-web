"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AuthState {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    // Check active sessions
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Handle auth state changes
      if (_event === 'SIGNED_IN') {
        router.refresh()
      } else if (_event === 'SIGNED_OUT') {
        router.push('/login')
      } else if (_event === 'TOKEN_REFRESHED') {
        // 토큰이 갱신되었을 때 user 정보 업데이트
        setUser(session?.user ?? null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

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