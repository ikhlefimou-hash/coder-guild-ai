import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Code2, Bot, Users, BookOpen, ShoppingBag, Loader2 } from "lucide-react";

const features = [
  { icon: Bot, title: "مساعد ذكي", desc: "اطرح أي سؤال برمجي وتحصل على إجابة فورية." },
  { icon: Users, title: "مجموعات", desc: "تعاون مع المبرمجين في مجموعات مفتوحة وخاصة." },
  { icon: BookOpen, title: "دروس", desc: "مسارات تعليمية من البداية حتى الاحتراف." },
  { icon: ShoppingBag, title: "سوق المشاريع", desc: "بِع واشترِ مشاريع برمجية جاهزة." },
];

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b border-border/50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Code2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-gradient">DevHub</span>
          </div>
          <Button asChild className="bg-gradient-primary shadow-glow">
            <Link to="/auth">دخول</Link>
          </Button>
        </div>
      </header>

      <main className="container py-16">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold sm:text-5xl">
            <span className="text-gradient">منصة المبرمجين</span> للتعلم والتعاون
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            مجتمع مخصص للبرمجة فقط: دروس، مجموعات، مساعد ذكي، وسوق للمشاريع والخدمات.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-primary shadow-glow">
              <Link to="/auth">ابدأ مجاناً</Link>
            </Button>
          </div>
        </section>

        <section className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Card key={f.title}>
              <CardContent className="p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
                  <f.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="mb-1 font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
