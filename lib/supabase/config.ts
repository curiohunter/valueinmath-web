// Supabase client configuration
export const supabaseConfig = {
  auth: {
    cookieOptions: {
      name: 'valuein-auth',
      lifetime: 60 * 60 * 24 * 7, // 1 week
      domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined,
      path: '/',
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production'
    }
  }
}