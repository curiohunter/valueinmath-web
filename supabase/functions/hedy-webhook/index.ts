import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-hedy-signature",
};

// HMAC-SHA256 signature verification
async function verifySignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return computed === signature;
}

// Fetch Hedy API (returns .data from {success, data} wrapper)
async function hedyFetch(path: string, apiKey: string) {
  const res = await fetch(`https://api.hedy.bot${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    throw new Error(`Hedy API error: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return json.data || json;
}

// Send Telegram notification
async function sendTelegramNotification(title: string, duration?: number) {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");
  if (!botToken || !chatId) return;

  const durationText = duration ? ` (${duration}분)` : "";
  const message = `\uD83D\uDCDD \uD68C\uC758 \uB3D9\uAE30\uD654 \uC644\uB8CC\n\n\uD83D\uDCCB ${title}${durationText}`;

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message }),
  });
}

// Parse relative/absolute due date string into YYYY-MM-DD
function parseDueDate(raw: string | null, meetingDate: string): string | null {
  if (!raw) return null;

  const base = new Date(meetingDate);
  if (isNaN(base.getTime())) return null;

  const formatDate = (d: Date): string =>
    d.toISOString().split("T")[0];

  const addDays = (d: Date, days: number): string => {
    const result = new Date(d);
    result.setDate(result.getDate() + days);
    return formatDate(result);
  };

  const lower = raw.toLowerCase().trim();

  // Relative dates
  if (lower === "today") return formatDate(base);
  if (lower === "tomorrow") return addDays(base, 1);
  if (lower === "next week") return addDays(base, 7);
  if (lower === "next month") return addDays(base, 30);

  // "in N days"
  const inDaysMatch = lower.match(/^in (\d+) days?$/);
  if (inDaysMatch) {
    return addDays(base, parseInt(inDaysMatch[1], 10));
  }

  // "next Monday/Tuesday/..." — find the next occurrence of that weekday
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const nextDayMatch = lower.match(/^next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
  if (nextDayMatch) {
    const targetDay = dayNames.indexOf(nextDayMatch[1]);
    const currentDay = base.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    return addDays(base, daysUntil);
  }

  // Absolute: ISO date "2026-03-15"
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    const parsed = new Date(raw.trim() + "T00:00:00");
    if (!isNaN(parsed.getTime())) return formatDate(parsed);
  }

  // Absolute: "March 15", "March 15, 2026", etc.
  const monthNames = ["january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"];
  const monthDayMatch = lower.match(/^(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:,?\s*(\d{4}))?$/);
  if (monthDayMatch) {
    const month = monthNames.indexOf(monthDayMatch[1]);
    const day = parseInt(monthDayMatch[2], 10);
    const year = monthDayMatch[3] ? parseInt(monthDayMatch[3], 10) : base.getFullYear();
    const parsed = new Date(year, month, day);
    if (!isNaN(parsed.getTime())) return formatDate(parsed);
  }

  // Fallback: try Date.parse
  const directParse = new Date(raw);
  if (!isNaN(directParse.getTime())) return formatDate(directParse);

  return null; // Parsing failed — keep due_date_raw
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const hedyApiKey = Deno.env.get("HEDY_API_KEY");
    const hedyWebhookSecret = Deno.env.get("HEDY_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!hedyApiKey) {
      return new Response(
        JSON.stringify({ error: "HEDY_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    // Verify webhook signature if secret is configured
    if (hedyWebhookSecret) {
      const signature = req.headers.get("x-hedy-signature") || "";
      const valid = await verifySignature(rawBody, signature, hedyWebhookSecret);
      if (!valid) {
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Only process session.exported events
    const eventType = body.event || body.type;
    if (eventType !== "session.exported") {
      return new Response(
        JSON.stringify({ message: `Skipped event: ${eventType}` }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const sessionId = body.data?.sessionId || body.sessionId;
    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "No sessionId in payload" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch session detail, todos, and topic from Hedy API
    const session = await hedyFetch(`/sessions/${sessionId}`, hedyApiKey);
    const todosRes = await hedyFetch(`/sessions/${sessionId}/todos`, hedyApiKey);
    const todos = todosRes.todos || todosRes || [];

    // Extract topic info from first todo or session
    const hedyTopicId =
      todos[0]?.topic?.id || session.topicId || null;
    const topicName =
      todos[0]?.topic?.name || session.topicName || null;
    const topicColor =
      todos[0]?.topic?.color || session.topicColor || null;

    // Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert topic → get meeting_topics.id FK
    let topicFkId: string | null = null;
    if (hedyTopicId && topicName) {
      let topicOverview = null;
      try {
        const topic = await hedyFetch(`/topics/${hedyTopicId}`, hedyApiKey);
        topicOverview = topic.overview || null;
      } catch {
        // Topic fetch is optional
      }

      const { data: topicRow } = await supabase
        .from("meeting_topics")
        .upsert(
          {
            hedy_topic_id: hedyTopicId,
            name: topicName,
            color: topicColor,
            overview: topicOverview,
          },
          { onConflict: "hedy_topic_id" }
        )
        .select("id")
        .single();

      topicFkId = topicRow?.id || null;
    }

    // Sync meeting (preserve user edits on re-export)
    const hedyMeetingFields = {
      hedy_session_id: sessionId,
      meeting_date: session.startTime,
      start_time: session.startTime,
      end_time: session.endTime,
      duration_minutes: session.duration || null,
      topic_id: topicFkId,
      transcript: session.transcript || null,
      conversations: session.conversations || null,
      cleaned_transcript: session.cleaned_transcript || null,
    };

    // Check if meeting already exists
    const { data: existingMeeting } = await supabase
      .from("meetings")
      .select("id, title, recap, meeting_minutes, status")
      .eq("hedy_session_id", sessionId)
      .maybeSingle();

    let meetingId: string;

    if (existingMeeting) {
      // Update only Hedy-sourced fields, preserve user edits (title, recap, status, meeting_minutes)
      const { error: updateError } = await supabase
        .from("meetings")
        .update(hedyMeetingFields)
        .eq("id", existingMeeting.id);
      if (updateError) throw updateError;
      meetingId = existingMeeting.id;
    } else {
      // New meeting — insert with full data
      const { data: newMeeting, error: insertError } = await supabase
        .from("meetings")
        .insert({
          ...hedyMeetingFields,
          title: session.title || "Untitled Meeting",
          recap: session.recap || null,
          meeting_minutes: session.meeting_minutes || null,
          status: "synced" as const,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;
      meetingId = newMeeting.id;
    }

    // Sync action items from todos (preserve user edits)
    if (todos.length > 0) {
      for (let i = 0; i < todos.length; i++) {
        const todo = todos[i];
        const dueDateRaw = todo.dueDate || null;

        // Check if already exists
        const { data: existing } = await supabase
          .from("meeting_action_items")
          .select("id, status, due_date, completed_at, sort_order")
          .eq("hedy_todo_id", todo.id)
          .maybeSingle();

        if (existing) {
          // Only update Hedy-sourced fields, preserve user edits
          await supabase
            .from("meeting_action_items")
            .update({
              content: todo.text,
              due_date_raw: dueDateRaw,
              // Only set due_date if user hasn't manually set one
              ...(existing.due_date ? {} : {
                due_date: parseDueDate(dueDateRaw, session.startTime || hedyMeetingFields.meeting_date),
              }),
              // Never overwrite: status, completed_at, sort_order
            })
            .eq("id", existing.id);
        } else {
          // New item — insert with full data
          await supabase.from("meeting_action_items").insert({
            meeting_id: meetingId,
            hedy_todo_id: todo.id,
            content: todo.text,
            due_date_raw: dueDateRaw,
            due_date: parseDueDate(dueDateRaw, session.startTime || hedyMeetingFields.meeting_date),
            status: todo.completed ? ("completed" as const) : ("pending" as const),
            completed_at: todo.completed ? new Date().toISOString() : null,
            sort_order: i,
          });
        }
      }
    }

    // UPSERT highlights (if any)
    const highlights = session.highlights || [];
    if (highlights.length > 0) {
      for (const hl of highlights) {
        const highlightData = {
          meeting_id: meetingId,
          hedy_highlight_id: hl.id,
          title: hl.title || null,
          raw_quote: hl.rawQuote || null,
          cleaned_quote: hl.cleanedQuote || null,
          main_idea: hl.mainIdea || null,
          ai_insight: hl.aiInsight || null,
          time_index_ms: hl.timeIndexMs || null,
        };

        const { data: existingHl } = await supabase
          .from("meeting_highlights")
          .select("id")
          .eq("hedy_highlight_id", hl.id)
          .maybeSingle();

        if (existingHl) {
          await supabase
            .from("meeting_highlights")
            .update(highlightData)
            .eq("id", existingHl.id);
        } else {
          await supabase.from("meeting_highlights").insert(highlightData);
        }
      }
    }

    // Telegram notification
    await sendTelegramNotification(
      session.title || "Untitled",
      session.duration
    );

    return new Response(
      JSON.stringify({
        success: true,
        meeting_id: meetingId,
        action_items_count: todos.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("hedy-webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
