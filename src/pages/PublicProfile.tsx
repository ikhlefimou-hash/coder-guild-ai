import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface PublicProfile {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  skills: string[] | null;
  experience_level: string | null;
  trust_score: number;
}
interface SvcRow { id: string; title: string; price: number; }
interface RevRow { id: string; rating: number; comment: string | null; created_at: string; }

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { t, dir } = useI18n();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [services, setServices] = useState<SvcRow[]>([]);
  const [reviews, setReviews] = useState<RevRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: s }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("id, username, full_name, bio, skills, experience_level, trust_score").eq("id", id).maybeSingle(),
        supabase.from("services").select("id, title, price").eq("user_id", id).eq("is_active", true),
        supabase.from("reviews").select("id, rating, comment, created_at").eq("reviewee_id", id).order("created_at", { ascending: false }),
      ]);
      setProfile(p as PublicProfile | null);
      setServices((s ?? []) as SvcRow[]);
      setReviews((r ?? []) as RevRow[]);
      if (p) document.title = `@${p.username} | DevHub`;
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!profile) return <div className="container py-20 text-center text-muted-foreground">{t("common.userNotFound")}</div>;

  const avg = reviews.length ? reviews.reduce((a, x) => a + x.rating, 0) / reviews.length : 0;

  return (
    <div className="container max-w-4xl space-y-6 py-8" dir={dir}>
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-2xl">@{profile.username}</CardTitle>
          {profile.full_name && <p className="text-muted-foreground">{profile.full_name}</p>}
        </CardHeader>
        <CardContent className="space-y-3">
          {profile.bio && <p className="text-foreground/80">{profile.bio}</p>}
          <div className="flex flex-wrap gap-2">
            {profile.skills?.map((sk) => <Badge key={sk} variant="secondary">{sk}</Badge>)}
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>{t("profile.level")}: <strong className="text-foreground">{profile.experience_level}</strong></span>
            {reviews.length > 0 && (
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-warning text-warning" />
                <strong className="text-foreground">{avg.toFixed(1)}</strong> ({reviews.length})
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle>{t("pp.services")}</CardTitle></CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("pp.noServices")}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((s) => (
                <Link key={s.id} to={`/dashboard/projects/${s.id}`} className="flex items-center justify-between rounded-lg border border-border p-3 hover:border-primary/50">
                  <span>{s.title}</span>
                  <span className="text-gradient font-bold">${s.price}</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle>{t("pp.reviews")}</CardTitle></CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("pp.noReviews")}</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-lg border border-border p-3">
                  <div className="mb-1 flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-warning text-warning" : "text-muted"}`} />
                    ))}
                  </div>
                  {r.comment && <p className="text-sm text-foreground/80">{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
