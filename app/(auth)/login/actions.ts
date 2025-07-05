'use server'

import { redirect } from 'next/navigation'
import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const cookieStore = await cookies()
  const supabase = createServerActionClient({ 
    cookies: () => cookieStore as any // Next.js 15 호환성을 위한 타입 캐스팅
  })

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message))
  }

  // 로그인 성공 후 프로필 확인
  if (data.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('approval_status')
      .eq('id', data.user.id)
      .single()

    // 승인 상태에 따라 리디렉션
    if (profile?.approval_status === 'approved') {
      redirect('/dashboard')
    } else {
      redirect('/pending-approval')
    }
  }

  redirect('/dashboard')
}

export async function signInWithGoogle() {
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ 
    cookies: () => cookieStore as any // Next.js 15 호환성을 위한 타입 캐스팅
  })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://valueinmath.vercel.app'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${siteUrl}/api/auth/callback`,
    },
  })

  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message))
  }

  if (data.url) {
    redirect(data.url)
  }
}