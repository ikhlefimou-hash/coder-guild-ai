import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import VerifiedBadge from "@/components/VerifiedBadge";

interface T {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  skills: string[] | null;
  experience_level: string | null;
  specialty: string | null;
  is_verified: boolean;
}

export default function Teachers() {
  const { t, dir } = useI18n();
  const [list, setList] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio, skills, experience_level, specialty, is_verified")
        .eq("is_teacher", true)
        .eq("is_verified", true)
        .eq("is_suspended", false)
        .order("trust_score", { ascending: false });
      setList((data ?? []) as T[]);
      setLoading(false);
    })();
  }, []);

  const filterBySpec = (spec: string) =>
    list.filter((p) => {
      const matchSpec = spec === "all" || p.specialty === spec;
      if (!matchSpec) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return (
        p.username?.toLowerCase().includes(s) ||
        p.full_name?.toLowerCase().includes(s) ||
        (p.skills ?? []).some((sk) => sk.toLowerCase().includes(s))
      );
    });

  const initials = (n?: string | null, u?: string) => (n || u || "?").trim().charAt(0).toUpperCase();

  const renderGrid = (items: T[]) => {
    if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
    if (items.length === 0) return (
      <Card className="border-dashed"><CardContent className="py-10 text-center text-sm text-muted-foreground">{t("teachers.empty")}</CardContent></Card>
    );
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <Link key={p.id} to={`/users/${p.id}`} className="block">
            <Card className="h-full transition hover:border-primary">
              <CardContent className="flex gap-3 p-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={p.avatar_url ?? undefined} />
                  <AvatarFallback>{initials(p.full_name, p.username)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1">
                    <p className="truncate font-medium">{p.full_name ?? p.username}</p>
                    <VerifiedBadge />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
                  {p.bio && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.bio}</p>}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.specialty && <Badge className="text-[10px]">{t(`teachers.spec.${p.specialty}`)}</Badge>}
                    {(p.skills ?? []).slice(0, 3).map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    );
  };

  return (
    <div className="container py-4" dir={dir}>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">{t("teachers.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("teachers.sub")}</p>
      </div>
      <Input
        value={q} onChange={(e) => setQ(e.target.value)}
        placeholder={t("teachers.searchPh")} className="mb-3"
      />
      <Tabs defaultValue="all">
        <TabsList className="mb-3">
          <TabsTrigger value="all">{t("teachers.tabAll")}</TabsTrigger>
          <TabsTrigger value="programming">{t("teachers.spec.programming")}</TabsTrigger>
          <TabsTrigger value="cybersecurity">{t("teachers.spec.cybersecurity")}</TabsTrigger>
        </TabsList>
        <TabsContent value="all">{renderGrid(filterBySpec("all"))}</TabsContent>
        <TabsContent value="programming">{renderGrid(filterBySpec("programming"))}</TabsContent>
        <TabsContent value="cybersecurity">{renderGrid(filterBySpec("cybersecurity"))}</TabsContent>
      </Tabs>
    </div>
  );
}
