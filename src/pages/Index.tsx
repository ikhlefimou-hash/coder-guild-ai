import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Code2, Bot, Users, BookOpen, ShoppingBag, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function Index() {
  const { user, loading } = useAuth();
  const { t, dir } = useI18n();

  const features = [
    { icon: Bot, title: t("index.feat.ai.title"), desc: t("index.feat.ai.desc") },
    { icon: Users, title: t("index.feat.groups.title"), desc: t("index.feat.groups.desc") },
    { icon: BookOpen, title: t("index.feat.lessons.title"), desc: t("index.feat.lessons.desc") },
    { icon: ShoppingBag, title: t("index.feat.market.title"), desc: t("index.feat.market.desc") },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <header className="border-b border-border/50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Code2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-gradient">DevHub</span>
          </div>
          <Button asChild className="bg-gradient-primary shadow-glow">
            <Link to="/auth">{t("index.signIn")}</Link>
          </Button>
        </div>
      </header>

      <main className="container py-16">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold sm:text-5xl">
            <span className="text-gradient">{t("index.heroTitle")}</span> {t("index.heroTitle2")}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{t("index.heroSub")}</p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-primary shadow-glow">
              <Link to="/auth">{t("index.startFree")}</Link>
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
