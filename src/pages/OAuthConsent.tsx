import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Loader2, ShieldCheck } from "lucide-react";

const copy = {
  en: { title: "Connect", to: "to DevHub", loading: "Loading connection request…", missing: "This connection request is missing or expired. Start the connection again in your assistant.", failed: "Unable to complete this connection. Please try again.", approve: "Approve connection", deny: "Cancel connection", access: "This lets the assistant read your own profile and browse published lessons as you.", boundary: "DevHub permissions still apply. Messages, encryption keys, purchases and changes are not included.", account: "Signed in as", identity: "Requested identity permissions", profile: "Basic profile", email: "Email address", openid: "Account identity", retry: "Try again", back: "Back to DevHub", unknown: "Additional permission", redirect: "Client callback", switch: "Switch account" },
  ar: { title: "ربط", to: "بـ DevHub", loading: "جارٍ تحميل طلب الربط…", missing: "طلب الربط مفقود أو منتهي. ابدأ الربط مجدداً من مساعدك.", failed: "تعذر إكمال الربط. حاول مجدداً.", approve: "السماح بالربط", deny: "إلغاء الربط", access: "يسمح للمساعد بقراءة ملفك الشخصي واستعراض الدروس المنشورة نيابةً عنك.", boundary: "تبقى صلاحيات DevHub سارية. لا يشمل الرسائل أو مفاتيح التشفير أو المشتريات أو التعديلات.", account: "الحساب المستخدم", identity: "صلاحيات الهوية المطلوبة", profile: "الملف الأساسي", email: "البريد الإلكتروني", openid: "هوية الحساب", retry: "إعادة المحاولة", back: "العودة إلى DevHub", unknown: "صلاحية إضافية", redirect: "عنوان رجوع التطبيق", switch: "تغيير الحساب" },
  fr: { title: "Connecter", to: "à DevHub", loading: "Chargement de la demande…", missing: "Demande absente ou expirée. Relancez la connexion depuis votre assistant.", failed: "Impossible de terminer la connexion. Réessayez.", approve: "Autoriser la connexion", deny: "Annuler la connexion", access: "L’assistant pourra lire votre profil et consulter les cours publiés en votre nom.", boundary: "Les permissions DevHub restent actives. Messages, clés de chiffrement, achats et modifications sont exclus.", account: "Compte connecté", identity: "Autorisations d’identité demandées", profile: "Profil de base", email: "Adresse e-mail", openid: "Identité du compte", retry: "Réessayer", back: "Retour à DevHub", unknown: "Permission supplémentaire", redirect: "Adresse de retour", switch: "Changer de compte" },
};
type Details = { client?: { name?: string; client_name?: string }; scope?: string; scopes?: string[]; redirect_uri?: string; redirect_url?: string; redirect_to?: string };

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { lang, dir } = useI18n();
  const c = copy[lang];
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const returnUrl = location.pathname + location.search + location.hash;

  useEffect(() => {
    let active = true;
    setError(false);
    setDetails(null);
    if (!authorizationId) { setError(true); return; }
    if (loading) return;
    if (!user) { navigate(`/auth?next=${encodeURIComponent(returnUrl)}`, { replace: true }); return; }
    void (async () => {
      try {
        const { data, error: providerError } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (providerError || !data) { setError(true); return; }
        const result = data as Details;
        const redirect = result.redirect_url ?? result.redirect_to;
        if (redirect && !result.client) { window.location.assign(redirect); return; }
        setDetails(result);
      } catch { if (active) setError(true); }
    })();
    return () => { active = false; };
  }, [authorizationId, user, loading, navigate, returnUrl, retry]);

  async function decide(approve: boolean) {
    if (busy || !details || !authorizationId || !user) return;
    setBusy(true);
    setError(false);
    try {
      const { data, error: providerError } = approve
        ? await supabase.auth.oauth.approveAuthorization(authorizationId)
        : await supabase.auth.oauth.denyAuthorization(authorizationId);
      const result = data as Details | null;
      const target = result?.redirect_url ?? result?.redirect_to;
      if (providerError || !target) { setError(true); return; }
      window.location.assign(target);
    } catch { setError(true); }
    finally { setBusy(false); }
  }
  const clientName = details?.client?.name ?? details?.client?.client_name ?? "Assistant";
  const scopes = details?.scopes ?? details?.scope?.split(/\s+/).filter(Boolean) ?? [];
  return <main className="min-h-svh bg-background px-5 py-8" dir={dir}>
    <header className="mx-auto mb-8 flex max-w-lg items-center justify-between"><Link to="/dashboard" className="font-semibold">DevHub</Link><LanguageSwitcher /></header>
    <Card className="mx-auto max-w-lg">
      <CardHeader><ShieldCheck className="mb-3 h-8 w-8 text-primary" /><CardTitle className="break-words text-2xl">{c.title} {clientName} {c.to}</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {error && <p role="alert" className="text-sm text-destructive">{authorizationId ? c.failed : c.missing}</p>}
        {!details && !error && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{c.loading}</p>}
        {details && <>
          <div className="text-sm"><p className="text-muted-foreground">{c.account}</p><p className="break-words font-medium">{user?.email}</p><Button variant="link" className="h-auto px-0" disabled={busy} onClick={async () => { try { await signOut(); } catch { setError(true); } }}>{c.switch}</Button></div>
          <p className="text-sm">{c.access}</p>
          {details.redirect_uri && <div className="text-sm"><p className="text-muted-foreground">{c.redirect}</p><p className="break-all">{details.redirect_uri}</p></div>}
          {scopes.length > 0 && <div className="text-sm"><p className="mb-2 font-medium">{c.identity}</p><ul className="list-inside list-disc space-y-1">{scopes.map((scope) => <li key={scope}>{scope === "openid" ? c.openid : scope === "email" ? c.email : scope === "profile" ? c.profile : `${c.unknown}: ${scope}`}</li>)}</ul></div>}
          <p className="text-sm text-muted-foreground">{c.boundary}</p>
          <div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={() => decide(true)}>{busy && <Loader2 className="me-2 h-4 w-4 animate-spin" />}{c.approve}</Button><Button variant="outline" disabled={busy} onClick={() => decide(false)}>{c.deny}</Button></div>
        </>}
        {error && !details && authorizationId && <Button variant="outline" onClick={() => setRetry((n) => n + 1)}>{c.retry}</Button>}
        <Button variant="link" asChild><Link to="/dashboard">{c.back}</Link></Button>
      </CardContent>
    </Card>
  </main>;
}