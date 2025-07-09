import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'
import type { Database } from '@/types/database'
import type { ClaudeRecommendation } from '@/types/claude'
import { z } from 'zod'

// 추천사항 스키마 정의
const RecommendationSchema = z.object({
  category: z.string().min(1, '카테고리는 필수입니다'),
  priority: z.enum(['highest', 'high', 'medium', 'low', 'info'], {
    errorMap: () => ({ message: '우선순위는 highest, high, medium, low, info 중 하나여야 합니다' })
  }),
  action: z.string().min(1, '액션은 필수입니다'),
  deadline: z.string().optional(),
  estimated_impact: z.string().optional(),
  required_resources: z.array(z.string()).optional()
})

const UpdateRecommendationsSchema = z.object({
  recommendations: z.array(RecommendationSchema)
})

const DeleteRecommendationSchema = z.object({
  index: z.number().min(0, '인덱스는 0 이상이어야 합니다')
})

// PUT - 전체 추천사항 배열 업데이트
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient() 
      cookies: () => cookieStore as any // Next.js 15 호환성을 위한 타입 캐스팅
    })

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const { id: insightId } = await params
    if (!insightId) {
      return NextResponse.json(
        { error: '인사이트 ID가 필요합니다' },
        { status: 400 }
      )
    }

    // 요청 본문 파싱 및 검증
    let requestBody
    try {
      requestBody = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: '잘못된 JSON 형식입니다' },
        { status: 400 }
      )
    }

    const validation = UpdateRecommendationsSchema.safeParse(requestBody)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: '데이터 검증 실패',
          details: validation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    const { recommendations } = validation.data

    // 인사이트 존재 확인
    const { data: insight, error: fetchError } = await supabase
      .from('claude_insights')
      .select('id')
      // @ts-ignore - Supabase 타입 복잡성 해결을 위한 임시 처리
      .eq('id', insightId)
      .single()

    if (fetchError || !insight) {
      return NextResponse.json(
        { error: '인사이트를 찾을 수 없습니다', details: fetchError?.message },
        { status: 404 }
      )
    }

    // 추천사항 업데이트
    const { data: updatedInsight, error: updateError } = await supabase
      .from('claude_insights')
      .update({ 
        recommendations: recommendations,
        updated_at: new Date().toISOString()
      } as any) // 데이터베이스 타입 복잡성으로 인한 타입 캐스팅
      // @ts-ignore - Supabase 타입 복잡성 해결을 위한 임시 처리
      .eq('id', insightId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: '추천사항 업데이트에 실패했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '추천사항이 성공적으로 업데이트되었습니다',
      data: updatedInsight
    })

  } catch (error) {
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// DELETE - 특정 인덱스의 추천사항 제거
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient() 
      cookies: () => cookieStore as any // Next.js 15 호환성을 위한 타입 캐스팅
    })

    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const { id: insightId } = await params
    if (!insightId) {
      return NextResponse.json(
        { error: '인사이트 ID가 필요합니다' },
        { status: 400 }
      )
    }

    // URL 쿼리 파라미터에서 인덱스 가져오기
    const searchParams = request.nextUrl.searchParams
    const indexParam = searchParams.get('index')

    if (indexParam === null) {
      return NextResponse.json(
        { error: '삭제할 추천사항의 인덱스가 필요합니다' },
        { status: 400 }
      )
    }

    const indexValidation = z.number().min(0).safeParse(Number(indexParam))
    if (!indexValidation.success) {
      return NextResponse.json(
        { error: '유효하지 않은 인덱스입니다' },
        { status: 400 }
      )
    }

    const deleteIndex = indexValidation.data

    // 인사이트 조회
    const { data: insight, error: fetchError } = await supabase
      .from('claude_insights')
      .select('id, recommendations')
      // @ts-ignore - Supabase 타입 복잡성 해결을 위한 임시 처리
      .eq('id', insightId)
      .single()

    if (fetchError || !insight) {
      return NextResponse.json(
        { error: '인사이트를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 현재 추천사항 배열 확인
    // @ts-ignore - insight 타입 복잡성 해결
    const currentRecommendations = insight.recommendations as ClaudeRecommendation[] || []
    
    if (deleteIndex >= currentRecommendations.length) {
      return NextResponse.json(
        { error: '존재하지 않는 추천사항 인덱스입니다' },
        { status: 400 }
      )
    }

    // 특정 인덱스의 추천사항 제거
    const updatedRecommendations = currentRecommendations.filter((_, index) => index !== deleteIndex)

    // 데이터베이스 업데이트
    const { data: updatedInsight, error: updateError } = await supabase
      .from('claude_insights')
      .update({ 
        recommendations: updatedRecommendations,
        updated_at: new Date().toISOString()
      } as any) // 데이터베이스 타입 복잡성으로 인한 타입 캐스팅
      // @ts-ignore - Supabase 타입 복잡성 해결을 위한 임시 처리
      .eq('id', insightId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: '추천사항 삭제에 실패했습니다' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '추천사항이 성공적으로 삭제되었습니다',
      data: updatedInsight,
      deletedIndex: deleteIndex
    })

  } catch (error) {
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// OPTIONS - CORS 지원
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}