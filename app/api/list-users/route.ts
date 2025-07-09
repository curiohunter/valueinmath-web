// @ts-nocheck
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/auth/server";

export async function GET() {
  try {
    const supabase = await createServerClient();
    
    // 1. Get all users from profiles (including those who haven't submitted registration yet)
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name, email, approval_status")
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return NextResponse.json({ users: [], error: profilesError.message }, { status: 500 });
    }

    // 2. Get currently linked employee auth_ids to exclude them (except when editing current employee)
    const { data: linkedEmployees, error: employeesError } = await supabase
      .from("employees")
      .select("auth_id")
      .not("auth_id", "is", null);

    if (employeesError) {
      console.error("Error fetching linked employees:", employeesError);
      return NextResponse.json({ users: [], error: employeesError.message }, { status: 500 });
    }

    const linkedAuthIds = linkedEmployees
  ?.map(e => e.auth_id)
  // ✅ (id): id is string 타입 가드를 사용하여 null 값을 걸러내고 타입을 string[]으로 확정합니다.
  .filter((id): id is string => id !== null && id !== undefined) 
  || [];

    // 3. Format users for the dropdown
    const users = profiles?.map(profile => profile ? {
      id: profile.id,
      email: profile.email || '',
      name: profile.name || profile.email || 'Unknown',
      isLinked: linkedAuthIds.includes(profile.id),
      approval_status: profile.approval_status
    } : null).filter(Boolean) || [];

    // console.log removed for security - do not log user data

    return NextResponse.json({ users, error: null });
  } catch (error: any) {
    console.error("Unexpected error in list-users:", error);
    return NextResponse.json({ users: [], error: error.message }, { status: 500 });
  }
} 