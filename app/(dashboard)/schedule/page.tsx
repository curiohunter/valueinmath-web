import N8nChatSidebar from "@/components/schedules/N8nChatSidebar";
import GoogleCalendarEmbed from "@/components/schedules/GoogleCalendarEmbed";
import { Suspense } from "react";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export default async function SchedulesPage() {
  // 서버 컴포넌트에서 supabase user 정보 fetch
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex gap-6">
      {/* 메인: 구글 캘린더 embed */}
      <div className="flex-1 flex items-center justify-center min-h-[600px]">
        <GoogleCalendarEmbed
          width="100%"
          height="100%"
          style={{ minHeight: '600px', height: '100%' }}
        />
      </div>
      {/* 우측: n8n 챗봇 */}
      <div className="w-96">
        <Suspense fallback={null}>
          <N8nChatSidebar user={user} />
        </Suspense>
      </div>
    </div>
  );
}