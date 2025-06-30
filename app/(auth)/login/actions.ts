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

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message))
  }

  redirect('/dashboard')
}

export async function signInWithGoogle() {
  const cookieStore = await cookies()
  const supabase = createServerActionClient({ 
    cookies: () => cookieStore as any // Next.js 15 호환성을 위한 타입 캐스팅
  })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  console.log('Google login - Site URL:', siteUrl)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${siteUrl}/api/auth/callback`,
    },
  })

  if (error) {
    console.error('Google login error:', error)
    redirect('/login?error=' + encodeURIComponent(error.message))
  }

  console.log('Google login - OAuth data:', data)
  if (data.url) {
    redirect(data.url)
  }
}