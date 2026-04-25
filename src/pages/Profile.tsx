import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CheckCircle2, Clock, Loader2, Star, XCircle } from "lucide-react";
import { z } from "zod";

interface Profile {
  username: string;
  full_name: string | null;
  bio: string | null;
  skills: string[] | null;
  experience_level: string | null;
  trust_score: number;
}
interface MyService { id: string; title: string; price: number; is_active: boolean; }
interface Request {
  id: string;
  service_id: string;
  buyer_id: string;
  seller_id: string;
  message: string;
  status: string;
  created_at: string;
  services: { title: string } | null;
}

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [services, setServices] = useState<MyService[]>([]);
  const [incoming, setIncoming] = useState<Request[]>([]);
  const [outgoing, setOutgoing] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<Request | null>(null);

  useEffect(() => {
    document.title = "ملفي الشخصي | DevHub";
    if (user) load();
  }, [user]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: p }, { data: s }, { data: inReq }, { data: outReq }] = await Promise.all([
      supabase.from("profiles").select("username, full_name, bio, skills, experience_level, trust_score").eq("id", user.id).maybeSingle(),
      supabase.from("services").select("id, title, price, is_active").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("service_requests").select("id, service_id, buyer_id, seller_id, message, status, created_at, services(title)").eq("seller_id", user.id).order("created_at", { ascending: false }),
      supabase.from("service_requests").select("id, service_id, buyer_id, seller_id, message, status, created_at, services(title)").eq("buyer_id", user.id).order("created_at", { ascending: false }),
    ]);
    setProfile(p as Profile | null);
    setServices((s ?? []) as MyService[]);
    setIncoming((inReq ?? []) as unknown as Request[]);
    setOutgoing((outReq ?? []) as unknown as Request[]);
    setLoading(false);
  };

  const updateRequest = async (req: Request, status: string) => {
    const { error } = await supabase.from("service_requests").update({ status: status as any }).eq("id", req.id);
    if (error) toast.error("تعذّر التحديث");
    else {
      toast.success("تم التحديث");
      load();
    }
  };

  const saveProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const fullName = (fd.get("full_name") as string).trim().slice(0, 100);
    const bio = (fd.get("bio") as string).trim().slice(0, 500);
    const skills = (fd.get("skills") as string).split(",").map((x) => x.trim()).filter(Boolean).slice(0, 20);
    const level = fd.get("experience_level") as string;

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName || null, bio: bio || null, skills, experience_level: level as any })
      .eq("id", user.id);
    if (error) toast.error("فشل الحفظ");
    else {
      toast.success("تم الحفظ");
      setEditOpen(false);
      load();
    }
  };

  const submitReview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !reviewTarget) return;
    const fd = new FormData(e.currentTarget);
    const parsed = reviewSchema.safeParse({
      rating: Number(fd.get("rating")),
      comment: (fd.get("comment") as string)?.trim() || undefined,
    });
    if (!parsed.success) {
      toast.error("التقييم غير صحيح");
      return;
    }
    const { error } = await supabase.from("reviews").insert({
      request_id: reviewTarget.id,
      service_id: reviewTarget.service_id,
      reviewer_id: user.id,
      reviewee_id: reviewTarget.seller_id,
      rating: parsed.data.rating,
      comment: parsed.data.comment ?? null,
    });
    if (error) toast.error("تعذّر إرسال التقييم (قد يكون مرسلاً مسبقاً)");
    else {
      toast.success("شكراً على تقييمك!");
      setReviewTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl space-y-6 py-8">
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">@{profile?.username}</CardTitle>
              {profile?.full_name && <p className="mt-1 text-muted-foreground">{profile.full_name}</p>}
            </div>
            <Button variant="outline" onClick={() => setEditOpen(true)}>تعديل الملف</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile?.bio && <p className="text-foreground/80">{profile.bio}</p>}
          <div className="flex flex-wrap gap-2">
            {profile?.skills?.map((sk) => (
              <Badge key={sk} variant="secondary">{sk}</Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 pt-2 text-sm text-muted-foreground">
            <span>المستوى: <strong className="text-foreground">{profile?.experience_level}</strong></span>
            <span>•</span>
            <span>درجة الثقة: <strong className="text-success">{profile?.trust_score}</strong></span>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle>خدماتي</CardTitle></CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا خدمات بعد. <Link to="/dashboard/projects/new" className="text-primary">عرض خدمة</Link></p>
          ) : (
            <div className="space-y-2">
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
        <CardHeader><CardTitle>طلبات واردة على خدماتي</CardTitle></CardHeader>
        <CardContent>
          {incoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا طلبات.</p>
          ) : (
            <div className="space-y-3">
              {incoming.map((r) => (
                <div key={r.id} className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium">{r.services?.title}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mb-3 text-sm text-foreground/80">{r.message}</p>
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateRequest(r, "accepted")}>قبول</Button>
                      <Button size="sm" variant="outline" onClick={() => updateRequest(r, "rejected")}>رفض</Button>
                    </div>
                  )}
                  {r.status === "accepted" && (
                    <Button size="sm" variant="secondary" onClick={() => updateRequest(r, "completed")}>وضع كمكتمل</Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader><CardTitle>طلباتي</CardTitle></CardHeader>
        <CardContent>
          {outgoing.length === 0 ? (
            <p className="text-sm text-muted-foreground">لم تطلب خدمات بعد.</p>
          ) : (
            <div className="space-y-3">
              {outgoing.map((r) => (
                <div key={r.id} className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <Link to={`/dashboard/projects/${r.service_id}`} className="font-medium hover:text-primary">
                      {r.services?.title}
                    </Link>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.status === "completed" && (
                    <Button size="sm" variant="outline" onClick={() => setReviewTarget(r)}>
                      <Star className="ml-2 h-4 w-4" />
                      أضف تقييماً
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit profile */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>تعديل الملف الشخصي</DialogTitle></DialogHeader>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <input name="full_name" defaultValue={profile?.full_name ?? ""} maxLength={100} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <Label>نبذة</Label>
              <Textarea name="bio" defaultValue={profile?.bio ?? ""} maxLength={500} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>المهارات (مفصولة بفواصل)</Label>
              <input name="skills" defaultValue={profile?.skills?.join(", ") ?? ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="React, Node.js, Python" />
            </div>
            <div className="space-y-2">
              <Label>المستوى</Label>
              <select name="experience_level" defaultValue={profile?.experience_level ?? "beginner"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="beginner">مبتدئ</option>
                <option value="intermediate">متوسط</option>
                <option value="advanced">متقدم</option>
                <option value="expert">خبير</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-gradient-primary">حفظ</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review */}
      <Dialog open={!!reviewTarget} onOpenChange={(o) => !o && setReviewTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>تقييم الخدمة</DialogTitle></DialogHeader>
          <form onSubmit={submitReview} className="space-y-4">
            <div className="space-y-2">
              <Label>التقييم (1-5)</Label>
              <select name="rating" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>{n} نجوم</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>تعليق (اختياري)</Label>
              <Textarea name="comment" maxLength={1000} rows={4} />
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-gradient-primary">إرسال</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; icon: any; className: string }> = {
    pending: { label: "قيد الانتظار", icon: Clock, className: "bg-warning/20 text-warning" },
    accepted: { label: "مقبول", icon: CheckCircle2, className: "bg-accent/20 text-accent" },
    rejected: { label: "مرفوض", icon: XCircle, className: "bg-destructive/20 text-destructive" },
    completed: { label: "مكتمل", icon: CheckCircle2, className: "bg-success/20 text-success" },
    cancelled: { label: "ملغى", icon: XCircle, className: "bg-muted text-muted-foreground" },
  };
  const v = map[status] ?? map.pending;
  const Icon = v.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${v.className}`}>
      <Icon className="h-3 w-3" />
      {v.label}
    </span>
  );
}
