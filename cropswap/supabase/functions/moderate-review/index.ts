// Moderates a review's text before it's shown publicly. Mirrors the original
// CropSwap artifact's client-side call to Claude, moved server-side because a
// deployed app can't safely call the Anthropic API with a bare API key from
// the browser. If no ANTHROPIC_API_KEY secret is configured on this project,
// reviews are auto-approved rather than left stuck in "pending" forever.
//
// Set the key with:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref <ref>
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function safeParseModeration(raw: string) {
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return { flagged: !!parsed.flagged, reason: typeof parsed.reason === "string" ? parsed.reason : "" };
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { text } = await req.json();
    if (typeof text !== "string" || !text.trim()) {
      return new Response(JSON.stringify({ flagged: false, reason: "" }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      // No moderation configured — auto-approve rather than stall every review.
      return new Response(JSON.stringify({ flagged: false, reason: "" }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const prompt = `You are a content moderation classifier for a community farmers-market app's review section. Read the review text between the triple quotes and decide if it contains vulgar language, sexual content, harassment, hate speech, or anything inappropriate for a public community platform. Respond with ONLY a JSON object and nothing else, no markdown formatting: {"flagged": true or false, "reason": "short reason, empty string if not flagged"}\n\nReview text: """${text}"""`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let raw = "";
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 200,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controller.signal,
      });
      const data = await res.json();
      raw = (data.content || []).map((b: { text?: string }) => b.text || "").join("").trim();
    } finally {
      clearTimeout(timer);
    }

    const parsed = safeParseModeration(raw);
    if (!parsed) {
      return new Response(JSON.stringify({ flagged: false, reason: "" }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(parsed), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (e) {
    // Fail open: an unreachable/broken moderator should not block reviews from
    // ever publishing.
    return new Response(JSON.stringify({ flagged: false, reason: "" }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
