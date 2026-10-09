import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpLeft, Bot, Users, BookOpen, ShoppingBag, GraduationCap, MessageSquare, Settings, Lightbulb } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";

export default function Dashboard() {
  const { user } = useAuth();
  const { t, dir } = useI18n();
  const modules = [
    { title: t("nav.ai"), desc: t("dashboard.mod.ai.desc"), url: "/dashboard/ai", icon: Bot },
    { title: t("nav.groups"), desc: t("dashboard.mod.groups.desc"), url: "/dashboard/groups", icon: Users },
    { title: t("nav.lessons"), desc: t("dashboard.mod.lessons.desc"), url: "/dashboard/lessons", icon: BookOpen },
    { title: t("nav.ideas"), desc: t("dashboard.mod.ideas.desc"), url: "/dashboard/ideas", icon: Lightbulb },
    { title: t("nav.projects"), desc: t("dashboard.mod.projects.desc"), url: "/dashboard/projects", icon: ShoppingBag },
    { title: t("nav.teachers"), desc: t("teachers.sub"), url: "/dashboard/teachers", icon: GraduationCap },
    { title: t("nav.messages"), desc: t("dashboard.mod.messages.desc"), url: "/dashboard/messages", icon: MessageSquare },
    { title: t("nav.settings"), desc: t("dashboard.mod.settings.desc"), url: "/dashboard/settings", icon: Settings },
  ];
  return (
    <div className="container py-8 sm:py-12" dir={dir}>
      <div className="mb-10 border-b border-border/70 pb-8">
        <p className="mb-3 text-sm font-semibold text-primary">DevHub</p>
        <h1 className="text-3xl font-semibold sm:text-4xl">{t("dashboard.welcome")}</h1>
        <p className="mt-3 break-words text-sm text-muted-foreground">
          {user?.email ? `${t("dashboard.loggedAs")} ${user.email}` : t("common.tagline")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {modules.map((m, i) => (
          <Link key={m.url} to={m.url} className="group min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-glow">
              <CardHeader className="p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${i % 3 === 0 ? "bg-primary/10 text-primary" : i % 3 === 1 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                    <m.icon className="h-5 w-5" />
                  </div>
                  <ArrowUpLeft className={`h-4 w-4 text-muted-foreground transition group-hover:text-primary ${dir === "ltr" ? "rotate-90" : ""}`} />
                </div>
                <CardTitle className="text-base">{m.title}</CardTitle>
                <CardDescription className="pt-1 leading-relaxed">{m.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
