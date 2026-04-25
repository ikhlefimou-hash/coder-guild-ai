import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Code2, Loader2, ArrowRight } from "lucide-react";

const schema = z.object({ email: z.string().trim().email("بريد غير صحيح").max(255) });

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({ email: fd.get("email") });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("تم إرسال رابط استعادة كلمة المرور");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Code2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-gradient">DevHub</h1>
        </div>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>استعادة كلمة المرور</CardTitle>
            <CardDescription>أدخل بريدك وسنرسل لك رابط الاستعادة</CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  تحقق من بريدك الإلكتروني للحصول على رابط استعادة كلمة المرور.
                </p>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/auth">العودة لتسجيل الدخول</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4" dir="rtl">
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input id="email" name="email" type="email" required maxLength={255} />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-glow">
                  {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  إرسال الرابط
                </Button>
                <Link to="/auth" className="flex items-center justify-center gap-1 text-sm text-primary hover:underline">
                  <ArrowRight className="h-4 w-4" />
                  العودة لتسجيل الدخول
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
