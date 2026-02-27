import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { student_name, parent_phone, notes, lead_source, created_at } = body;

    // Build Telegram message
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

    const message = lines.join("\n");

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
