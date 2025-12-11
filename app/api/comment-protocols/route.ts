/**
 * 코멘트 프로토콜(키워드 뱅크) API
 * GET /api/comment-protocols - 프로토콜 목록 조회
 * POST /api/comment-protocols - 프로토콜 생성
 * PUT /api/comment-protocols - 프로토콜 수정
 * DELETE /api/comment-protocols - 프로토콜 삭제
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'
import type { CommentProtocol, GradeBand } from '@/types/comment-assistant'

// ============================================
// 인증 헬퍼 함수
// ============================================

async function checkEmployeeAuth() {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: '인증이 필요합니다.', status: 401, supabase: null, employee: null }
  }

  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('id')
    .eq('auth_id', user.id)
    .eq('status', '재직')
    .single()

  if (employeeError || !employee) {
    return { error: '선생님만 사용할 수 있는 기능입니다.', status: 403, supabase: null, employee: null }
  }

  return { error: null, status: 200, supabase, employee }
}

// ============================================
// GET Handler - 프로토콜 목록 조회
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { error, status, supabase } = await checkEmployeeAuth()
    if (error || !supabase) {
      return NextResponse.json({ success: false, error }, { status })
    }

    // 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const gradeBand = searchParams.get('grade_band') as GradeBand | null
    const includeInactive = searchParams.get('include_inactive') === 'true'

    // 프로토콜 조회
    let query = supabase
      .from('comment_protocols')
      .select('*')
      .order('category')
      .order('display_order')

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (gradeBand && gradeBand !== 'all') {
      query = query.or(`grade_band.eq.all,grade_band.eq.${gradeBand}`)
    }

    const { data: protocols, error: fetchError } = await query

    if (fetchError) {
      console.error('[Comment Protocols] Fetch error:', fetchError)
      return NextResponse.json(
        { success: false, error: '프로토콜 조회 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 카테고리별 그룹핑
    const groupedProtocols = (protocols || []).reduce((acc, protocol) => {
      const cat = protocol.category
      if (!acc[cat]) {
        acc[cat] = []
      }
      acc[cat].push(protocol)
      return acc
    }, {} as Record<string, CommentProtocol[]>)

    return NextResponse.json({
      success: true,
      data: {
        protocols: protocols || [],
        grouped: groupedProtocols,
        total: protocols?.length || 0,
      },
    })
  } catch (error) {
    console.error('[Comment Protocols] Error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// ============================================
// POST Handler - 프로토콜 생성
// ============================================

export async function POST(request: NextRequest) {
  try {
    const { error, status, supabase } = await checkEmployeeAuth()
    if (error || !supabase) {
      return NextResponse.json({ success: false, error }, { status })
    }

    const body = await request.json()
    const { category, phrase, severity = 'neutral', grade_band = 'all', display_order = 0 } = body

    if (!category || !phrase) {
      return NextResponse.json(
        { success: false, error: '카테고리와 문구는 필수입니다.' },
        { status: 400 }
      )
    }

    // 중복 확인
    const { data: existing } = await supabase
      .from('comment_protocols')
      .select('id')
      .eq('category', category)
      .eq('phrase', phrase)
      .single()

    if (existing) {
      return NextResponse.json(
        { success: false, error: '이미 존재하는 키워드입니다.' },
        { status: 409 }
      )
    }

    const { data: newProtocol, error: insertError } = await supabase
      .from('comment_protocols')
      .insert({
        category,
        phrase,
        severity,
        grade_band,
        display_order,
        is_active: true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[Comment Protocols] Insert error:', insertError)
      return NextResponse.json(
        { success: false, error: '키워드 추가 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: newProtocol,
    })
  } catch (error) {
    console.error('[Comment Protocols] Error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// ============================================
// PUT Handler - 프로토콜 수정
// ============================================

export async function PUT(request: NextRequest) {
  try {
    const { error, status, supabase } = await checkEmployeeAuth()
    if (error || !supabase) {
      return NextResponse.json({ success: false, error }, { status })
    }

    const body = await request.json()
    const { id, phrase, severity, grade_band, display_order, is_active } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID가 필요합니다.' },
        { status: 400 }
      )
    }

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    if (phrase !== undefined) updateData.phrase = phrase
    if (severity !== undefined) updateData.severity = severity
    if (grade_band !== undefined) updateData.grade_band = grade_band
    if (display_order !== undefined) updateData.display_order = display_order
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: updated, error: updateError } = await supabase
      .from('comment_protocols')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[Comment Protocols] Update error:', updateError)
      return NextResponse.json(
        { success: false, error: '키워드 수정 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    console.error('[Comment Protocols] Error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE Handler - 프로토콜 삭제
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const { error, status, supabase } = await checkEmployeeAuth()
    if (error || !supabase) {
      return NextResponse.json({ success: false, error }, { status })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID가 필요합니다.' },
        { status: 400 }
      )
    }

    // 소프트 삭제 (is_active = false)
    const { error: deleteError } = await supabase
      .from('comment_protocols')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (deleteError) {
      console.error('[Comment Protocols] Delete error:', deleteError)
      return NextResponse.json(
        { success: false, error: '키워드 삭제 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '키워드가 삭제되었습니다.',
    })
  } catch (error) {
    console.error('[Comment Protocols] Error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
