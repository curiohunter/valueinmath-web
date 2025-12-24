import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'

// GET - 시즌 알림 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const activeOnly = searchParams.get('activeOnly') === 'true'

    let query = supabase
      .from('seasonal_alerts')
      .select('*')
      .order('month')
      .order('alert_type')

    if (month) {
      query = query.eq('month', parseInt(month))
    }

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch seasonal alerts:', error)
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
    }

    return NextResponse.json({ alerts: data || [] })
  } catch (error) {
    console.error('Seasonal alerts GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - 시즌 알림 생성
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { month, title, description, target_grades, target_school_types, alert_type } = body

    if (!month || !title) {
      return NextResponse.json({ error: 'Month and title are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('seasonal_alerts')
      .insert({
        month,
        title,
        description,
        target_grades,
        target_school_types,
        alert_type: alert_type || 'reminder',
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create seasonal alert:', error)
      return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
    }

    return NextResponse.json({ alert: data })
  } catch (error) {
    console.error('Seasonal alerts POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - 시즌 알림 수정
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, month, title, description, target_grades, target_school_types, alert_type, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('seasonal_alerts')
      .update({
        month,
        title,
        description,
        target_grades,
        target_school_types,
        alert_type,
        is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update seasonal alert:', error)
      return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
    }

    return NextResponse.json({ alert: data })
  } catch (error) {
    console.error('Seasonal alerts PUT error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - 시즌 알림 삭제
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('seasonal_alerts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete seasonal alert:', error)
      return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Seasonal alerts DELETE error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
