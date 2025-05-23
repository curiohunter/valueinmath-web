import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const { data, error } = await supabaseServer.auth.admin.listUsers();
  if (error) {
    return NextResponse.json({ users: [], error: error.message }, { status: 500 });
  }
  return NextResponse.json({ users: data.users, error: null });
} 