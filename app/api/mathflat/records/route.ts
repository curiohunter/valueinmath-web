import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/auth/server';
import type { MathflatRecord, FilterOptions, PaginatedResponse } from '@/lib/mathflat/types';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 쿼리 파라미터 파싱
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const studentIds = searchParams.get('studentIds')?.split(',').filter(Boolean);
    const mathflatTypes = searchParams.get('mathflatTypes')?.split(',').filter(Boolean);
    const bookTitle = searchParams.get('bookTitle');
    const minCorrectRate = searchParams.get('minCorrectRate');
    const maxCorrectRate = searchParams.get('maxCorrectRate');
    const searchTerm = searchParams.get('search');

    // 기본 쿼리
    let query = supabase
      .from('mathflat_records')
      .select(`
        *,
        student:student_id(
          id,
          name,
          school,
          grade,
          class_students(
            classes(
              id,
              name
            )
          )
        )
      `, { count: 'exact' });

    // 필터 적용
    if (startDate) {
      query = query.gte('event_date', startDate);
    }
    if (endDate) {
      query = query.lte('event_date', endDate);
    }
    if (studentIds && studentIds.length > 0) {
      query = query.in('student_id', studentIds);
    }
    if (mathflatTypes && mathflatTypes.length > 0) {
      query = query.in('mathflat_type', mathflatTypes);
    }
    if (bookTitle) {
      query = query.ilike('book_title', `%${bookTitle}%`);
    }
    if (minCorrectRate) {
      query = query.gte('correct_rate', parseInt(minCorrectRate));
    }
    if (maxCorrectRate) {
      query = query.lte('correct_rate', parseInt(maxCorrectRate));
    }
    if (searchTerm) {
      query = query.or(`student_name.ilike.%${searchTerm}%,book_title.ilike.%${searchTerm}%`);
    }

    // 정렬 및 페이지네이션
    query = query
      .order('event_date', { ascending: false })
      .order('student_name')
      .range((page - 1) * pageSize, page * pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const totalPages = count ? Math.ceil(count / pageSize) : 0;

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        pageSize,
        totalCount: count || 0,
        totalPages
      }
    });

  } catch (error) {
    console.error('Records API error:', error);
    return NextResponse.json(
      {
        error: '레코드 조회 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// 레코드 추가
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const body: MathflatRecord = await request.json();

    // 필수 필드 검증
    if (!body.student_id || !body.event_date || !body.mathflat_type) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 학생 이름 가져오기 (student_name이 없는 경우)
    if (!body.student_name && body.student_id) {
      const { data: student } = await supabase
        .from('students')
        .select('name')
        .eq('id', body.student_id)
        .single();

      if (student) {
        body.student_name = student.name;
      }
    }

    const { data, error } = await supabase
      .from('mathflat_records')
      .insert({
        student_id: body.student_id,
        student_name: body.student_name,
        event_date: body.event_date,
        mathflat_type: body.mathflat_type,
        book_title: body.book_title || '',
        problem_solved: body.problem_solved || 0,
        correct_count: body.correct_count || 0,
        wrong_count: body.wrong_count || 0,
        correct_rate: body.correct_rate || 0
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data,
      message: '레코드가 성공적으로 추가되었습니다.'
    });

  } catch (error) {
    console.error('Create record error:', error);
    return NextResponse.json(
      {
        error: '레코드 생성 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// 레코드 수정
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: '레코드 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('mathflat_records')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data,
      message: '레코드가 성공적으로 수정되었습니다.'
    });

  } catch (error) {
    console.error('Update record error:', error);
    return NextResponse.json(
      {
        error: '레코드 수정 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// 레코드 삭제
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '레코드 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('mathflat_records')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: '레코드가 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('Delete record error:', error);
    return NextResponse.json(
      {
        error: '레코드 삭제 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}