import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Search, UserCog } from "lucide-react";

interface Programmer {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  skills: string[] | null;
  experience_level: string | null;
  trust_score: number;
}

export default function Programmers() {
  const [list, setList] = useState<Programmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio, skills, experience_level, trust_score")
        .eq("is_suspended", false)
        .order("trust_score", { ascending: false })
        .limit(100);
      setList((data ?? []) as Programmer[]);
      setLoading(false);
    })();
  }, []);

  const filtered = list.filter((p) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      p.username?.toLowerCase().includes(s) ||
      p.full_name?.toLowerCase().includes(s) ||
      (p.skills ?? []).some((sk) => sk.toLowerCase().includes(s))
    );
  });

  const initials = (n?: string | null, u?: string) => (n || u || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="container py-4" dir="rtl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">المبرمجون</h1>
          <p className="text-sm text-muted-foreground">دليل المبرمجين والخدمات</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/profile"><UserCog className="ml-1 h-4 w-4" /> هويتي</Link>
          </Button>
          <Button asChild className="bg-gradient-primary shadow-glow">
            <Link to="/dashboard/projects/new"><Plus className="ml-1 h-4 w-4" /> أضف خدمتي</Link>
          </Button>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو المهارة…" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-10 text-center text-sm text-muted-foreground">لا نتائج.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link key={p.id} to={`/users/${p.id}`} className="block">
              <Card className="h-full transition hover:border-primary">
                <CardContent className="flex gap-3 p-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={p.avatar_url ?? undefined} />
                    <AvatarFallback>{initials(p.full_name, p.username)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{p.full_name ?? p.username}</p>
                    <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
                    {p.bio && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.bio}</p>}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(p.skills ?? []).slice(0, 4).map((s) => (
                        <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                      ))}
                      {p.experience_level && <Badge variant="outline" className="text-[10px]">{p.experience_level}</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
