import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function buildInquiryMessage(body: Record<string, string>): string {
  const { student_name, parent_phone, notes, lead_source, created_at } = body;

  const lines = [
    "\ud83d\udccb \uc0c8 \uc0c1\ub2f4 \uc2e0\uccad",
    "",
    `\ud83d\udc64 \uc774\ub984: ${student_name || "\ubbf8\uc785\ub825"}`,
  ];

  if (parent_phone) {
    lines.push(`\ud83d\udcf1 \uc5f0\ub77d\ucc98: ${parent_phone}`);
  }
  if (notes) {
    lines.push(`\ud83d\udcdd \ubb38\uc758: ${notes}`);
  }

  lines.push(`\ud83d\udd17 \uc720\uc785: ${lead_source || "\uc54c \uc218 \uc5c6\uc74c"}`);
  lines.push(`\u23f0 \uc2dc\uac01: ${created_at}`);

  return lines.join("\n");
}

function buildConsultationMessage(body: Record<string, string>): string {
  const { student_name, counselor_name, consultation_type, method, content, consultation_date, registered_at } = body;

  const lines = [
    "\ud83d\udde3\ufe0f \uc0c1\ub2f4 \ub0b4\uc5ed \ub4f1\ub85d",
    "",
    `\ud83d\udc68\u200d\ud83c\udfeb \ub2f4\ub2f9: ${counselor_name || "\ubbf8\uc9c0\uc815"}`,
    `\ud83d\udc64 \ud559\uc0dd: ${student_name || "\ubbf8\uc785\ub825"}`,
    `\ud83d\udccc \uc720\ud615: ${consultation_type || "\uae30\ud0c0"}`,
    `\ud83d\udcde \ubc29\ubc95: ${method || "-"}`,
  ];

  if (content) {
    lines.push(`\ud83d\udcdd \ub0b4\uc6a9: ${content}`);
  }

  lines.push(`\ud83d\udcc5 \uc0c1\ub2f4\uc2dc\uac04: ${consultation_date}`);
  lines.push(`\u23f0 \ub4f1\ub85d\uc2dc\uac01: ${registered_at}`);

  return lines.join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

    if (!botToken || !chatId) {
      console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
      return new Response(
        JSON.stringify({ error: "Telegram secrets not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    // Route to appropriate message builder
    const message = body.is_consultation
      ? buildConsultationMessage(body)
      : buildInquiryMessage(body);

    // Send to Telegram Bot API
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const telegramRes = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const telegramData = await telegramRes.json();

    if (!telegramData.ok) {
      console.error("Telegram API error:", telegramData);
      return new Response(
        JSON.stringify({ error: "Telegram send failed", details: telegramData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("notify-telegram error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
