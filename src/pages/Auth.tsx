import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Code2, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const { t, dir } = useI18n();

  const nameRule = z.string().trim().min(2, t("auth.err.shortName")).max(50);
  const signUpSchema = z.object({
    first_name: nameRule,
    last_name: nameRule,
    email: z.string().trim().email(t("auth.err.email")).max(255),
    password: z.string().min(8, t("auth.err.passwordMin")).max(72),
  });
  const signInSchema = z.object({
    email: z.string().trim().email(t("auth.err.email")).max(255),
    password: z.string().min(1, t("auth.err.passwordReq")).max(72),
  });

  useEffect(() => {
    if (!authLoading && user) navigate("/dashboard", { replace: true });
  }, [user, authLoading, navigate]);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      first_name: fd.get("first_name"),
      last_name: fd.get("last_name"),
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          first_name: parsed.data.first_name,
          last_name: parsed.data.last_name,
          full_name: `${parsed.data.first_name} ${parsed.data.last_name}`,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message.includes("already") ? t("auth.err.exists") : error.message);
      return;
    }
    toast.success(t("auth.ok.created"));
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);
    if (error) {
      toast.error(t("auth.err.bad"));
      return;
    }
    toast.success(t("auth.ok.welcomeBack"));
    navigate("/dashboard");
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth`,
    });
    if (result.redirected) return;
    setLoading(false);
    if (result.error) {
      toast.error(t("auth.err.google"));
      return;
    }
    navigate("/dashboard");
  };

  return (
    <div className="auth-page min-h-svh bg-background" dir={dir}>
      <header className="flex h-16 items-center justify-between border-b border-border/60 px-5 sm:px-10">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
          <Code2 className="h-5 w-5 text-primary" />
          <span>DevHub</span>
        </Link>
        <div className="flex items-center">
          <LanguageSwitcher />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[420px] px-5 pb-12 pt-10 sm:pt-16">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Code2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-semibold text-foreground">DevHub</h1>
          <p className="text-sm text-muted-foreground">{t("common.tagline")}</p>
        </div>

        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="px-0 pb-6 pt-0 text-center">
            <CardTitle className="text-2xl">{t("auth.welcome")}</CardTitle>
            <CardDescription>{t("auth.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogle}
              disabled={loading}
              className="mb-5 h-12 w-full gap-2"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
              </svg>
              {t("auth.continueGoogle")}
            </Button>
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground">{t("auth.or")}</span>
              </div>
            </div>
            <Tabs defaultValue="signin" className="w-full" dir={dir}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t("auth.signIn")}</TabsTrigger>
                <TabsTrigger value="signup">{t("auth.signUp")}</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">{t("auth.email")}</Label>
                    <Input id="signin-email" name="email" type="email" required maxLength={255} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">{t("auth.password")}</Label>
                    <Input id="signin-password" name="password" type="password" required maxLength={72} />
                  </div>
                  <Button type="submit" disabled={loading} className="h-12 w-full">
                    {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    {t("auth.enter")}
                  </Button>
                  <div className="text-center text-sm">
                    <Link to="/forgot-password" className="text-primary hover:underline">
                      {t("auth.forgot")}
                    </Link>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="signup-first">{t("auth.firstName")}</Label>
                      <Input id="signup-first" name="first_name" type="text" required minLength={2} maxLength={50} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-last">{t("auth.lastName")}</Label>
                      <Input id="signup-last" name="last_name" type="text" required minLength={2} maxLength={50} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t("auth.email")}</Label>
                    <Input id="signup-email" name="email" type="email" required maxLength={255} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t("auth.passwordHint")}</Label>
                    <Input id="signup-password" name="password" type="password" required minLength={8} maxLength={72} />
                  </div>
                  <Button type="submit" disabled={loading} className="h-12 w-full">
                    {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    {t("auth.create")}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
