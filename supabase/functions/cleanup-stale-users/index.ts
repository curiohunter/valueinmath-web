import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getSupabaseAdmin() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다");
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface CleanupResult {
  staleProfilesDeleted: string[];
  orphanAuthDeleted: string[];
  pendingRegistrationsCleaned: number;
  errors: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 인증: CRON_SECRET Bearer 토큰 또는 Supabase JWT
  const authHeader = req.headers.get("authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // OK - cron 인증 통과
  } else {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (supabaseUrl && anonKey && authHeader) {
      const supabase = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const result: CleanupResult = {
    staleProfilesDeleted: [],
    orphanAuthDeleted: [],
    pendingRegistrationsCleaned: 0,
    errors: [],
  };

  try {
    const supabase = getSupabaseAdmin();

    // Step 1: 48시간 이상 경과한 미승인 profiles 조회
    const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: staleProfiles, error: fetchError } = await supabase
      .from("profiles")
      .select("id, email, name, created_at")
      .neq("approval_status", "approved")
      .lt("created_at", cutoffTime);

    if (fetchError) {
      throw new Error(`미승인 프로필 조회 실패: ${fetchError.message}`);
    }

    // Step 2: auth.admin.deleteUser()로 삭제 (CASCADE로 profiles도 삭제)
    for (const profile of staleProfiles || []) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(
        profile.id
      );
      if (deleteError) {
        result.errors.push(
          `프로필 삭제 실패 (${profile.email}): ${deleteError.message}`
        );
      } else {
        result.staleProfilesDeleted.push(
          `${profile.email} (가입: ${profile.created_at})`
        );
      }
    }

    // Step 3: orphan auth.users 정리 (profiles 없는 auth 계정)
    const { data: authUsers, error: authListError } =
      await supabase.auth.admin.listUsers();

    if (authListError) {
      result.errors.push(`auth.users 조회 실패: ${authListError.message}`);
    } else {
      const authUserIds = (authUsers?.users || []).map((u) => u.id);

      if (authUserIds.length > 0) {
        const { data: existingProfiles, error: profileCheckError } =
          await supabase
            .from("profiles")
            .select("id")
            .in("id", authUserIds);

        if (profileCheckError) {
          result.errors.push(
            `프로필 확인 실패: ${profileCheckError.message}`
          );
        } else {
          const profileIdSet = new Set(
            (existingProfiles || []).map((p) => p.id)
          );
          const orphanUsers = (authUsers?.users || []).filter(
            (u) => !profileIdSet.has(u.id)
          );

          for (const orphan of orphanUsers) {
            const { error: orphanDeleteError } =
              await supabase.auth.admin.deleteUser(orphan.id);
            if (orphanDeleteError) {
              result.errors.push(
                `orphan 삭제 실패 (${orphan.email}): ${orphanDeleteError.message}`
              );
            } else {
              result.orphanAuthDeleted.push(orphan.email || orphan.id);
            }
          }
        }
      }
    }

    // Step 4: 삭제된 사용자의 pending_registrations 정리
    // 삭제된 user_id 목록
    const deletedUserIds = [
      ...(staleProfiles || []).map((p) => p.id),
      ...(authUsers?.users || [])
        .filter((u) => result.orphanAuthDeleted.includes(u.email || u.id))
        .map((u) => u.id),
    ];

    if (deletedUserIds.length > 0) {
      const { count, error: pendingError } = await supabase
        .from("pending_registrations")
        .delete({ count: "exact" })
        .in("user_id", deletedUserIds);

      if (pendingError) {
        result.errors.push(
          `pending_registrations 정리 실패: ${pendingError.message}`
        );
      } else {
        result.pendingRegistrationsCleaned = count || 0;
      }
    }

    // 오래된 orphan pending_registrations도 정리 (user_id가 null이고 48시간 경과)
    const { count: orphanPendingCount, error: orphanPendingError } =
      await supabase
        .from("pending_registrations")
        .delete({ count: "exact" })
        .is("user_id", null)
        .lt("created_at", cutoffTime);

    if (orphanPendingError) {
      result.errors.push(
        `orphan pending_registrations 정리 실패: ${orphanPendingError.message}`
      );
    } else {
      result.pendingRegistrationsCleaned += orphanPendingCount || 0;
    }

    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      staleProfilesDeleted: result.staleProfilesDeleted.length,
      orphanAuthDeleted: result.orphanAuthDeleted.length,
      pendingRegistrationsCleaned: result.pendingRegistrationsCleaned,
      details: result,
    };

    console.log("Cleanup completed:", JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Cleanup failed:", errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        details: result,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
