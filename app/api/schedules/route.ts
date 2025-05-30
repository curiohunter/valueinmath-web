import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .order('start_datetime', { ascending: true });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('API /api/schedules error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
} 