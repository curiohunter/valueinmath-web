'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // 에러 메시지 한국어 변환
    let errorMessage = error.message
    if (error.message.includes('Invalid login credentials')) {
      errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'
    } else if (error.message.includes('rate limit')) {
      errorMessage = '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.'
    } else if (error.message.includes('Email not confirmed')) {
      errorMessage = '이메일 인증이 필요합니다. 이메일을 확인해주세요.'
    }
    redirect('/login?error=' + encodeURIComponent(errorMessage))
  }

  // 로그인 성공 후 프로필 확인
  if (data.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('approval_status, role')
      .eq('id', data.user.id)
      .single()

    // 승인 상태 확인
    if (profile?.approval_status !== 'approved') {
      redirect('/pending-approval')
    }

    // Role에 따라 리디렉션 경로 결정
    let redirectTo = '/dashboard'
    if (profile?.role === 'student' || profile?.role === 'parent') {
      redirectTo = '/portal'
    } else if (profile?.role === 'employee') {
      redirectTo = '/dashboard'
    }

    // 경로를 반환하여 클라이언트에서 hard navigation 처리
    return { success: true, redirectTo }
  }

  return { success: true, redirectTo: '/dashboard' }
}

export async function signInWithGoogle() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://valueinmath.vercel.app'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${siteUrl}/api/auth/callback`,
    },
  })

  if (error) {
    // 에러 메시지 한국어 변환
    let errorMessage = error.message
    if (error.message.includes('Invalid login credentials')) {
      errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'
    } else if (error.message.includes('rate limit')) {
      errorMessage = '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.'
    } else if (error.message.includes('Email not confirmed')) {
      errorMessage = '이메일 인증이 필요합니다. 이메일을 확인해주세요.'
    }
    redirect('/login?error=' + encodeURIComponent(errorMessage))
  }

  if (data.url) {
    redirect(data.url)
  }
}