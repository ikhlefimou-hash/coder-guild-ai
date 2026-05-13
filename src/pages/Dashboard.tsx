import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Users, BookOpen, ShoppingBag, Code2, MessageSquare, Settings, Lightbulb } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const modules = [
  { title: "المساعد الذكي", desc: "اطرح أي سؤال برمجي واحصل على إجابة فورية.", url: "/dashboard/ai", icon: Bot },
  { title: "المجموعات", desc: "انضم لمجموعات عامة أو خاصة وشارك المعرفة.", url: "/dashboard/groups", icon: Users },
  { title: "الدروس", desc: "مسارات تعليمية من المبتدئ للمحترف.", url: "/dashboard/lessons", icon: BookOpen },
  { title: "الأفكار للبيع", desc: "أفكار وأكواد جاهزة للشراء.", url: "/dashboard/ideas", icon: Lightbulb },
  { title: "سوق المشاريع", desc: "تصفح وبيع مشاريع برمجية جاهزة.", url: "/dashboard/projects", icon: ShoppingBag },
  { title: "المبرمجون", desc: "اعثر على مبرمجين مميزين للتعاون.", url: "/dashboard/programmers", icon: Code2 },
  { title: "الرسائل", desc: "تواصل مباشر مع المبرمجين والعملاء.", url: "/dashboard/messages", icon: MessageSquare },
  { title: "الإعدادات", desc: "خصص حسابك والمظهر واللغة.", url: "/dashboard/settings", icon: Settings },
];

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <div className="container py-6" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">مرحباً بك في DevHub</h1>
        <p className="text-sm text-muted-foreground">
          {user?.email ? `مسجّل الدخول كـ ${user.email}` : "منصة المبرمجين للتعلم والتعاون"}
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
