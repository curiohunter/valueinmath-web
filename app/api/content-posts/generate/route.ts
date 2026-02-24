import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import {
  generateBlogPost,
  type BlogGenerateOptions,
  type BrandContext,
} from '@/services/blog-ai-service'

export async function POST(request: NextRequest) {
  try {
    const body: BlogGenerateOptions = await request.json()
    const { topic, customTopic, tone, length, includeReviews } = body

    if (!topic || !tone || !length) {
      return NextResponse.json(
        { success: false, error: '주제, 톤, 길이는 필수 항목입니다.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // 1. brand_settings 조회
    const { data: brandData } = await supabase
      .from('brand_settings')
      .select('academy_name, philosophy, differentiators, tone')
      .limit(1)
      .single()

    const brand: BrandContext = brandData || {
      academy_name: '밸류인수학학원',
      philosophy: null,
      differentiators: [],
      tone: 'professional',
    }

    // 2. 리뷰 조회 (옵션)
    let reviews: string[] | undefined
    if (includeReviews) {
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('content')
        .eq('can_use_marketing', true)
        .order('is_featured', { ascending: false })
        .limit(5)

      reviews = reviewData?.map((r) => r.content) || []
    }

    // 3. AI 생성
    const result = await generateBlogPost(
      { topic, customTopic, tone, length, includeReviews },
      brand,
      reviews
    )

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('블로그 AI 생성 오류:', error)
    return NextResponse.json(
      { success: false, error: 'AI 블로그 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}
