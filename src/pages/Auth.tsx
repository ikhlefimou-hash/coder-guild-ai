import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Code2, Loader2 } from "lucide-react";

const signUpSchema = z.object({
  email: z.string().trim().email("بريد غير صحيح").max(255),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل").max(72),
  username: z
    .string()
    .trim()
    .min(3, "اسم المستخدم 3 أحرف على الأقل")
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "حروف إنجليزية وأرقام و _ فقط"),
});

const signInSchema = z.object({
  email: z.string().trim().email("بريد غير صحيح").max(255),
  password: z.string().min(1, "كلمة المرور مطلوبة").max(72),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate("/", { replace: true });
  }, [user, authLoading, navigate]);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      email: fd.get("email"),
      password: fd.get("password"),
      username: fd.get("username"),
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
        emailRedirectTo: `${window.location.origin}/`,
        data: { username: parsed.data.username },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message.includes("already") ? "هذا البريد مسجل مسبقاً" : error.message);
      return;
    }
    toast.success("تم إنشاء الحساب! تحقق من بريدك للتفعيل.");
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
      toast.error("بيانات الدخول غير صحيحة");
      return;
    }
    toast.success("مرحباً بعودتك!");
    navigate("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Code2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-gradient">DevHub</h1>
          <p className="text-sm text-muted-foreground">منصة المبرمجين لعرض الخدمات والتعاون</p>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>أهلاً بك</CardTitle>
            <CardDescription>سجّل الدخول أو أنشئ حساباً جديداً</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full" dir="rtl">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">تسجيل الدخول</TabsTrigger>
                <TabsTrigger value="signup">حساب جديد</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">البريد الإلكتروني</Label>
                    <Input id="signin-email" name="email" type="email" required maxLength={255} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">كلمة المرور</Label>
                    <Input id="signin-password" name="password" type="password" required maxLength={72} />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-glow">
                    {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    دخول
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">اسم المستخدم</Label>
                    <Input id="signup-username" name="username" type="text" required minLength={3} maxLength={30} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">البريد الإلكتروني</Label>
                    <Input id="signup-email" name="email" type="email" required maxLength={255} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">كلمة المرور (8 أحرف على الأقل)</Label>
                    <Input id="signup-password" name="password" type="password" required minLength={8} maxLength={72} />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-glow">
                    {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    إنشاء حساب
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
