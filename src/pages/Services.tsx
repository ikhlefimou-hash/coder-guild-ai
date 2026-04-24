import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Star, Sparkles } from "lucide-react";

interface ServiceRow {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string | null;
  user_id: string;
  created_at: string;
  profiles: { username: string; avatar_url: string | null } | null;
}

interface RatingMap {
  [serviceId: string]: { avg: number; count: number };
}

export default function Services() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [ratings, setRatings] = useState<RatingMap>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = "سوق الخدمات | DevHub";
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("services")
      .select("id, title, description, price, category, user_id, created_at, profiles(username, avatar_url)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setServices(data as unknown as ServiceRow[]);
      const ids = data.map((s) => s.id);
      if (ids.length > 0) {
        const { data: revs } = await supabase.from("reviews").select("service_id, rating").in("service_id", ids);
        const map: RatingMap = {};
        revs?.forEach((r) => {
          const m = map[r.service_id] ?? { avg: 0, count: 0 };
          m.avg = (m.avg * m.count + r.rating) / (m.count + 1);
          m.count += 1;
          map[r.service_id] = m;
        });
        setRatings(map);
      }
    }
    setLoading(false);
  };

  const filtered = services.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      (s.category ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="container py-8">
      <section className="mb-10 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-foreground">منصة المبرمجين العربية</span>
        </div>
        <h1 className="mb-3 text-4xl font-bold tracking-tight md:text-5xl">
          اعثر على <span className="text-gradient">أفضل المبرمجين</span>
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          تصفح خدمات البرمجة، اطلب ما تحتاجه، وقيّم بكل أمان وشفافية
        </p>
      </section>

      <div className="mx-auto mb-8 flex max-w-2xl items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="ابحث عن خدمة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
            maxLength={100}
          />
        </div>
        <Button asChild className="bg-gradient-primary shadow-glow">
          <Link to="/services/new">عرض خدمة</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          {search ? "لا نتائج للبحث." : "لا توجد خدمات بعد. كن أول من يعرض خدمة!"}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => {
            const r = ratings[s.id];
            return (
              <Link key={s.id} to={`/services/${s.id}`}>
                <Card className="h-full transition-all hover:border-primary/50 hover:shadow-glow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-2 text-lg">{s.title}</CardTitle>
                      {s.category && (
                        <Badge variant="secondary" className="shrink-0">
                          {s.category}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-3 text-sm text-muted-foreground">{s.description}</p>
                  </CardContent>
                  <CardFooter className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm">
                      {r ? (
                        <>
                          <Star className="h-4 w-4 fill-warning text-warning" />
                          <span className="font-medium">{r.avg.toFixed(1)}</span>
                          <span className="text-muted-foreground">({r.count})</span>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">جديد</span>
                      )}
                    </div>
                    <div className="text-lg font-bold text-gradient">${s.price}</div>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
