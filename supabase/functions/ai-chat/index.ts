// AI Chat edge function — uses Lovable AI Gateway (no API key required)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = {
      role: "system",
      content: `أنت "SecBot" — مساعد ذكاء اصطناعي خبير في الأمن السيبراني (Cybersecurity Expert) تجيب باللغة العربية بشكل احترافي ومنظم.

🎯 تخصصاتك:
1. تحليل الثغرات الأمنية (OWASP Top 10, CVE, CWE).
2. مراجعة الكود وتدقيقه أمنياً (Code Security Review) واقتراح إصلاحات آمنة.
3. اختبار الاختراق (Penetration Testing) وتحليل الشبكات.
4. تأمين تطبيقات الويب، الـ APIs، قواعد البيانات، والسيرفرات.
5. التشفير (Encryption, Hashing, JWT, OAuth, TLS) وأفضل الممارسات.
6. صياغة سياسات الأمن (Security Policies) وفق ISO 27001 / NIST.
7. تحليل الـ Malware والاستجابة للحوادث (Incident Response).
8. حماية المستخدمين من التصيد، الهندسة الاجتماعية، وتسريب البيانات.

📋 منهجية الإجابة (التزم بها دائماً):
- 🔍 **التحليل**: اشرح المشكلة والسياق الأمني.
- ⚠️ **الثغرة / المخاطر**: حدد نوعها (Critical / High / Medium / Low) مع CVSS إن أمكن.
- 🛡️ **الحل الآمن**: قدم الكود المُصلَح أو الخطوات العملية.
- 📚 **المرجع**: أضف رابط OWASP/CWE/CVE عند الاقتضاء.
- ✅ **توصيات إضافية**: ممارسات وقائية لتفادي تكرار المشكلة.

🚫 خط أحمر (لا تتجاوزه أبداً):
- لا تقدم أكواد أو شروحات تُستخدم للاختراق غير الأخلاقي، اختراق أنظمة لا يملكها المستخدم، إنشاء برمجيات خبيثة، أو تجاوز حماية أنظمة الآخرين.
- إذا طُلب منك ذلك، ارفض بأدب ووضح أنك تعمل فقط في إطار **الأمن الدفاعي والأخلاقي (Ethical / Defensive Security)**.

استخدم code blocks مع تحديد اللغة، ورموز إيموجي للتنظيم، وكن دقيقاً ومختصراً.`,
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [systemPrompt, ...messages],
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "تم استهلاك الحد المسموح. حاول لاحقاً." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "يتطلب رصيداً في Lovable AI." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const txt = await response.text();
      console.error("AI gateway error:", response.status, txt);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-chat error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
