import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Users, BookOpen, ShoppingBag, GraduationCap, MessageSquare, Settings, Lightbulb } from "lucide-react";
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
    <div className="container py-6" dir={dir}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("dashboard.welcome")}</h1>
        <p className="text-sm text-muted-foreground">
          {user?.email ? `${t("dashboard.loggedAs")} ${user.email}` : t("common.tagline")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {modules.map((m) => (
          <Link key={m.url} to={m.url}>
            <Card className="group h-full transition-all hover:border-primary/50 hover:shadow-glow">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
                  <m.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <CardTitle className="text-lg">{m.title}</CardTitle>
                <CardDescription>{m.desc}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
