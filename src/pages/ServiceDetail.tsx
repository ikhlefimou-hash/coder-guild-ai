import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Flag, Loader2, Send, Star, User as UserIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string | null;
  user_id: string;
  is_active: boolean;
  profiles: { username: string; bio: string | null; avatar_url: string | null } | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
  profiles: { username: string } | null;
}

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t, dir } = useI18n();
  const [service, setService] = useState<Service | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const requestSchema = z.object({ message: z.string().trim().min(5, t("sd.msgShort")).max(2000) });
  const reportSchema = z.object({
    reason: z.string().trim().min(3).max(100),
    description: z.string().trim().max(2000).optional(),
  });

  useEffect(() => {
    if (!id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const load = async () => {
    setLoading(true);
    const { data: s } = await supabase
      .from("services")
      .select("id, title, description, price, category, user_id, is_active, profiles(username, bio, avatar_url)")
      .eq("id", id!)
      .maybeSingle();

    if (s) {
      setService(s as unknown as Service);
      document.title = `${s.title} | DevHub`;
      const { data: r } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, reviewer_id, profiles!reviews_reviewer_id_fkey(username)")
        .eq("service_id", id!)
        .order("created_at", { ascending: false });
      setReviews((r ?? []) as unknown as Review[]);
    }
    setLoading(false);
  };

  const handleRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !service) return;
    const fd = new FormData(e.currentTarget);
    const parsed = requestSchema.safeParse({ message: fd.get("message") });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("service_requests").insert({
      service_id: service.id,
      buyer_id: user.id,
      seller_id: service.user_id,
      message: parsed.data.message,
    });
    setSubmitting(false);
    if (error) {
      toast.error(t("sd.reqFail"));
      return;
    }
    toast.success(t("sd.reqSent"));
    setRequestDialogOpen(false);
  };

  const handleReport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !service) return;
    const fd = new FormData(e.currentTarget);
    const parsed = reportSchema.safeParse({
      reason: fd.get("reason"),
      description: (fd.get("description") as string)?.trim() || undefined,
    });
    if (!parsed.success) {
      toast.error(t("sd.repInvalid"));
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: "service",
      target_id: service.id,
      reason: parsed.data.reason,
      description: parsed.data.description ?? null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(t("sd.repFail"));
      return;
    }
    toast.success(t("sd.repSent"));
    setReportDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!service) {
    return <div className="container py-20 text-center text-muted-foreground">{t("sd.notFound")}</div>;
  }

  const avgRating = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
  const isOwner = user?.id === service.user_id;

  return (
    <div className="container max-w-4xl py-8" dir={dir}>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl">{service.title}</CardTitle>
                  {service.category && <Badge variant="secondary" className="mt-2">{service.category}</Badge>}
                </div>
                <div className="text-3xl font-bold text-gradient">${service.price}</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="whitespace-pre-wrap text-foreground/90">{service.description}</p>

              {reviews.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
                  <Star className="h-5 w-5 fill-warning text-warning" />
                  <span className="text-lg font-bold">{avgRating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">{reviews.length} {t("sd.ratingsCount")}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-6 shadow-card">
            <CardHeader>
              <CardTitle>{t("sd.reviews")}</CardTitle>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("sd.noReviews")}</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="rounded-lg border border-border p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <Link
                          to={`/users/${r.reviewer_id}`}
                          className="text-sm font-medium hover:text-primary"
                        >
                          @{r.profiles?.username ?? "user"}
                        </Link>
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${i < r.rating ? "fill-warning text-warning" : "text-muted"}`}
                            />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="text-sm text-foreground/80">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <Link to={`/users/${service.user_id}`} className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-primary">
                  <UserIcon className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <div className="font-semibold">@{service.profiles?.username}</div>
                  {service.profiles?.bio && (
                    <div className="line-clamp-1 text-xs text-muted-foreground">{service.profiles.bio}</div>
                  )}
                </div>
              </Link>
            </CardContent>
          </Card>

          {!isOwner && user && (
            <>
              <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-gradient-primary shadow-glow">
                    <Send className="ml-2 h-4 w-4" />
                    {t("sd.requestService")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("sd.requestService")}</DialogTitle>
                    <DialogDescription>{t("sd.explainNeed")}</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleRequest} className="space-y-4">
                    <Textarea name="message" required minLength={5} maxLength={2000} rows={5} placeholder={t("sd.yourMessage")} />
                    <DialogFooter>
                      <Button type="submit" disabled={submitting} className="bg-gradient-primary">
                        {submitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                        {t("common.send")}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Flag className="ml-2 h-4 w-4" />
                    {t("sd.report")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("sd.reportTitle")}</DialogTitle>
                    <DialogDescription>{t("sd.reportDesc")}</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleReport} className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t("sd.reason")}</Label>
                      <Select name="reason" required>
                        <SelectTrigger>
                          <SelectValue placeholder={t("sd.pickReason")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fraud">{t("sd.reason.fraud")}</SelectItem>
                          <SelectItem value="offensive">{t("sd.reason.offensive")}</SelectItem>
                          <SelectItem value="spam">{t("sd.reason.spam")}</SelectItem>
                          <SelectItem value="misleading">{t("sd.reason.misleading")}</SelectItem>
                          <SelectItem value="other">{t("sd.reason.other")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t("sd.details")}</Label>
                      <Textarea name="description" maxLength={2000} rows={4} />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={submitting} variant="destructive">
                        {submitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                        {t("sd.sendReport")}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}

          {!user && (
            <Button asChild className="w-full bg-gradient-primary">
              <Link to="/auth">{t("sd.signInToRequest")}</Link>
            </Button>
          )}
        </aside>
      </div>
    </div>
  );
}
