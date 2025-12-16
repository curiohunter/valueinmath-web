import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/auth/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { studentId, status } = await request.json()

    if (!studentId || !status) {
      return NextResponse.json({ error: 'studentId and status are required' }, { status: 400 })
    }

    // 허용된 status 값 검증
    const allowedStatuses = ['신규상담', '테스트예정', '테스트완료', '등록유도', '미등록', '재원', '퇴원', '휴원']
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('students')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', studentId)

    if (updateError) {
      console.error('Failed to update student status:', updateError)
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      studentId,
      newStatus: status
    })

  } catch (error) {
    console.error('Update status API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
