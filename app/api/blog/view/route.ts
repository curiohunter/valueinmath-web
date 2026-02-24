import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { postId } = await request.json()
    if (!postId || typeof postId !== 'string') {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: post } = await supabase
      .from('content_posts')
      .select('view_count')
      .eq('id', postId)
      .single()

    if (post) {
      await supabase
        .from('content_posts')
        .update({ view_count: (post.view_count || 0) + 1 })
        .eq('id', postId)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
