import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supaUser = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: uErr } = await supaUser.auth.getUser();
    if (uErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      bio = "",
      skills = [],
      portfolio_links = [],
      github_url = "",
      experience_years = 0,
      is_teacher = false,
      specialty = null,
    } = body ?? {};

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a strict reviewer evaluating a developer profile for verification on a programming community.
Score 0-100 based on:
- Bio quality and clarity
- Skills relevance to programming/cybersecurity
- Portfolio / GitHub presence
- Experience years
- Specialty consistency (if teacher)

Return ONLY JSON: {"score": number, "analysis": "short reason in Arabic", "approve": boolean}.
Approve only if score >= 70.`;

    const userPrompt = `Profile:
Bio: ${bio}
Skills: ${(skills as string[]).join(", ")}
Portfolio: ${(portfolio_links as string[]).join(", ")}
GitHub: ${github_url}
Years experience: ${experience_years}
Apply as teacher: ${is_teacher}
Specialty: ${specialty ?? "none"}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: { score: number; analysis: string; approve: boolean };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { score: 0, analysis: "تعذر التحليل", approve: false };
    }

    const status = parsed.approve ? "approved" : "rejected";

    const supaAdmin = createClient(supabaseUrl, supabaseService);

    await supaAdmin.from("verification_requests").insert({
      user_id: user.id,
      bio, skills, portfolio_links, github_url, experience_years,
      is_teacher, specialty,
      ai_score: parsed.score,
      ai_analysis: parsed.analysis,
      status,
      reviewed_at: new Date().toISOString(),
    });

    const profileUpdate: Record<string, unknown> = {
      verification_status: status,
      verification_score: parsed.score,
      verification_notes: parsed.analysis,
      verification_submitted_at: new Date().toISOString(),
      is_verified: parsed.approve,
    };
    if (parsed.approve && is_teacher) {
      profileUpdate.is_teacher = true;
      if (specialty) profileUpdate.specialty = specialty;
    }
    await supaAdmin.from("profiles").update(profileUpdate).eq("id", user.id);

    return new Response(JSON.stringify({
      approved: parsed.approve, score: parsed.score, analysis: parsed.analysis,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
