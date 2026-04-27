import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Loader2,
  Lock,
  Globe,
  Trash2,
  ArrowRight,
  Shield,
  ShieldOff,
  UserMinus,
  Send,
  Check,
  X,
  ImagePlus,
  Images,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { z } from "zod";

type Visibility = "public" | "private";
type GroupRole = "admin" | "moderator" | "member";

interface Group {
  id: string;
  name: string;
  description: string | null;
  visibility: Visibility;
  created_by: string;
  created_at: string;
}
interface Member {
  id: string;
  user_id: string;
  role: GroupRole;
  joined_at: string;
  profile: { username: string; full_name: string | null; avatar_url: string | null } | null;
}
interface Post {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profile: { username: string; full_name: string | null; avatar_url: string | null } | null;
}
interface JoinReq {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  profile: { username: string; full_name: string | null; avatar_url: string | null } | null;
}

const postSchema = z.string().trim().min(1).max(4000);

interface GroupImage {
  id: string;
  group_id: string;
  uploader_id: string;
  storage_path: string;
  public_url: string;
  caption: string | null;
  created_at: string;
  profile?: { username: string; full_name: string | null; avatar_url: string | null } | null;
}

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [requests, setRequests] = useState<JoinReq[]>([]);
  const [myRole, setMyRole] = useState<GroupRole | null>(null);
  const [myRequest, setMyRequest] = useState<JoinReq | null>(null);
  const [posting, setPosting] = useState(false);
  const [draft, setDraft] = useState("");
  const [images, setImages] = useState<GroupImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const isMember = myRole !== null;
  const isAdmin = myRole === "admin";
  const canPost = myRole === "admin" || myRole === "moderator";

  const fetchProfiles = async (ids: string[]) => {
    if (ids.length === 0) return new Map<string, any>();
    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", ids);
    return new Map((data ?? []).map((p: any) => [p.id, p]));
  };

  const load = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);

    const { data: g, error: gErr } = await supabase.from("groups").select("*").eq("id", id).maybeSingle();
    if (gErr || !g) {
      toast.error("لا يمكن الوصول لهذه المجموعة");
      setLoading(false);
      navigate("/dashboard/groups");
      return;
    }
    setGroup(g as Group);

    // membership of current user
    const { data: meMem } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    setMyRole((meMem?.role as GroupRole) ?? null);

    // my pending request (private)
    if (g.visibility === "private" && !meMem) {
      const { data: req } = await supabase
        .from("group_join_requests")
        .select("*")
        .eq("group_id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      setMyRequest(req ? ({ ...(req as any), profile: null } as JoinReq) : null);
    } else {
      setMyRequest(null);
    }

    // members + posts (RLS allows for public groups too)
    const [{ data: ms }, { data: ps }] = await Promise.all([
      supabase.from("group_members").select("*").eq("group_id", id).order("joined_at", { ascending: true }),
      supabase.from("group_posts").select("*").eq("group_id", id).order("created_at", { ascending: false }),
    ]);

    const userIds = Array.from(
      new Set([...(ms ?? []).map((m: any) => m.user_id), ...(ps ?? []).map((p: any) => p.author_id)]),
    );
    const profMap = await fetchProfiles(userIds);
    setMembers((ms ?? []).map((m: any) => ({ ...m, profile: profMap.get(m.user_id) ?? null })));
    setPosts((ps ?? []).map((p: any) => ({ ...p, profile: profMap.get(p.author_id) ?? null })));

    // join requests (admin only)
    if (meMem?.role === "admin") {
      const { data: reqs } = await supabase
        .from("group_join_requests")
        .select("*")
        .eq("group_id", id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      const reqIds = (reqs ?? []).map((r: any) => r.user_id);
      const reqProfMap = await fetchProfiles(reqIds);
      setRequests((reqs ?? []).map((r: any) => ({ ...r, profile: reqProfMap.get(r.user_id) ?? null })));
    } else {
      setRequests([]);
    }

    setLoading(false);
  }, [id, user, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: refresh posts when changes happen
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`group-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_posts", filter: `group_id=eq.${id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, load]);

  const handleJoinPublic = async () => {
    if (!user || !group) return;
    const { error } = await supabase
      .from("group_members")
      .insert({ group_id: group.id, user_id: user.id, role: "member" });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("انضممت للمجموعة");
    load();
  };

  const handleRequestJoin = async () => {
    if (!user || !group) return;
    const { error } = await supabase
      .from("group_join_requests")
      .insert({ group_id: group.id, user_id: user.id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم إرسال طلب الانضمام");
    load();
  };

  const handleLeave = async () => {
    if (!user || !group) return;
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", group.id)
      .eq("user_id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("غادرت المجموعة");
    setMyRole(null);
    load();
  };

  const handleDeleteGroup = async () => {
    if (!group) return;
    const { error } = await supabase.from("groups").delete().eq("id", group.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم حذف المجموعة");
    navigate("/dashboard/groups");
  };

  const handleKick = async (memberUserId: string) => {
    if (!group) return;
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", group.id)
      .eq("user_id", memberUserId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم إزالة العضو");
    load();
  };

  const handleSetRole = async (memberUserId: string, role: GroupRole) => {
    if (!group) return;
    const { error } = await supabase
      .from("group_members")
      .update({ role })
      .eq("group_id", group.id)
      .eq("user_id", memberUserId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم تحديث الصلاحية");
    load();
  };

  const handleApprove = async (req: JoinReq, approve: boolean) => {
    const { error } = await supabase
      .from("group_join_requests")
      .update({ status: approve ? "approved" : "rejected" })
      .eq("id", req.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(approve ? "تمت الموافقة" : "تم الرفض");
    load();
  };

  const handlePost = async () => {
    if (!user || !group) return;
    const parsed = postSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error("المنشور لا يمكن أن يكون فارغاً");
      return;
    }
    setPosting(true);
    const { error } = await supabase
      .from("group_posts")
      .insert({ group_id: group.id, author_id: user.id, content: parsed.data });
    setPosting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDraft("");
  };

  const handleDeletePost = async (postId: string) => {
    const { error } = await supabase.from("group_posts").delete().eq("id", postId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم حذف المنشور");
  };

  const initials = (name?: string | null, fallback?: string) =>
    (name || fallback || "?").trim().charAt(0).toUpperCase();

  const sortedMembers = useMemo(() => {
    const order: Record<GroupRole, number> = { admin: 0, moderator: 1, member: 2 };
    return [...members].sort((a, b) => order[a.role] - order[b.role]);
  }, [members]);

  if (loading || !group) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const canSeeContent = isMember || group.visibility === "public";

  return (
    <div className="container py-6" dir="rtl">
      <Button variant="ghost" size="sm" asChild className="mb-3">
        <Link to="/dashboard/groups">
          <ArrowRight className="ml-1 h-4 w-4" />
          المجموعات
        </Link>
      </Button>

      <Card className="mb-4">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-2xl">{group.name}</CardTitle>
                <Badge variant={group.visibility === "public" ? "secondary" : "outline"} className="gap-1">
                  {group.visibility === "public" ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {group.visibility === "public" ? "عامة" : "خاصة"}
                </Badge>
                {myRole && (
                  <Badge variant="outline">
                    {myRole === "admin" ? "مشرف" : myRole === "moderator" ? "ناشر" : "عضو"}
                  </Badge>
                )}
              </div>
              {group.description && <p className="text-sm text-muted-foreground">{group.description}</p>}
              <p className="text-xs text-muted-foreground">{members.length} عضو</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!isMember && group.visibility === "public" && (
                <Button onClick={handleJoinPublic} className="bg-gradient-primary shadow-glow">انضمام</Button>
              )}
              {!isMember && group.visibility === "private" && !myRequest && (
                <Button onClick={handleRequestJoin} className="bg-gradient-primary shadow-glow">طلب انضمام</Button>
              )}
              {!isMember && myRequest && (
                <Badge variant="secondary">طلبك قيد المراجعة</Badge>
              )}
              {isMember && !isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">مغادرة</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>مغادرة المجموعة؟</AlertDialogTitle>
                      <AlertDialogDescription>تستطيع الانضمام لاحقاً.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction onClick={handleLeave}>مغادرة</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="ml-1 h-4 w-4" />
                      حذف المجموعة
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>حذف المجموعة نهائياً؟</AlertDialogTitle>
                      <AlertDialogDescription>سيتم حذف المنشورات والأعضاء.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteGroup}>حذف</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {!canSeeContent ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            هذه مجموعة خاصة. أرسل طلب انضمام لرؤية المحتوى.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="posts">
          <TabsList>
            <TabsTrigger value="posts">المنشورات</TabsTrigger>
            <TabsTrigger value="members">الأعضاء</TabsTrigger>
            {isAdmin && <TabsTrigger value="requests">الطلبات ({requests.length})</TabsTrigger>}
          </TabsList>

          <TabsContent value="posts" className="space-y-4 pt-4">
            {canPost && (
              <Card>
                <CardContent className="space-y-3 p-4">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="اكتب منشوراً للمجموعة…"
                    maxLength={4000}
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button onClick={handlePost} disabled={posting || !draft.trim()} className="bg-gradient-primary shadow-glow">
                      {posting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Send className="ml-2 h-4 w-4" />}
                      نشر
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {posts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  لا منشورات بعد.
                </CardContent>
              </Card>
            ) : (
              posts.map((p) => {
                const canDelete = p.author_id === user?.id || isAdmin;
                return (
                  <Card key={p.id}>
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-center justify-between">
                        <Link to={`/users/${p.author_id}`} className="flex items-center gap-2 hover:text-primary">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={p.profile?.avatar_url ?? undefined} />
                            <AvatarFallback>{initials(p.profile?.full_name, p.profile?.username)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{p.profile?.full_name ?? p.profile?.username ?? "مستخدم"}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(p.created_at).toLocaleString("ar")}
                            </p>
                          </div>
                        </Link>
                        {canDelete && (
                          <Button variant="ghost" size="icon" onClick={() => handleDeletePost(p.id)} aria-label="حذف">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{p.content}</p>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-2 pt-4">
            {sortedMembers.map((m) => (
              <Card key={m.id}>
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <Link to={`/users/${m.user_id}`} className="flex items-center gap-3 hover:text-primary">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                      <AvatarFallback>{initials(m.profile?.full_name, m.profile?.username)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{m.profile?.full_name ?? m.profile?.username ?? "مستخدم"}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.role === "admin" ? "مشرف" : m.role === "moderator" ? "ناشر" : "عضو"}
                      </p>
                    </div>
                  </Link>
                  {isAdmin && m.user_id !== user?.id && (
                    <div className="flex gap-1">
                      {m.role === "moderator" ? (
                        <Button variant="ghost" size="icon" onClick={() => handleSetRole(m.user_id, "member")} aria-label="إزالة صلاحية النشر">
                          <ShieldOff className="h-4 w-4" />
                        </Button>
                      ) : m.role === "member" ? (
                        <Button variant="ghost" size="icon" onClick={() => handleSetRole(m.user_id, "moderator")} aria-label="منح صلاحية النشر">
                          <Shield className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {m.role !== "admin" && (
                        <Button variant="ghost" size="icon" onClick={() => handleKick(m.user_id)} aria-label="طرد">
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {isAdmin && (
            <TabsContent value="requests" className="space-y-2 pt-4">
              {requests.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    لا توجد طلبات معلّقة.
                  </CardContent>
                </Card>
              ) : (
                requests.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="flex items-center justify-between gap-3 p-3">
                      <Link to={`/users/${r.user_id}`} className="flex items-center gap-3 hover:text-primary">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={r.profile?.avatar_url ?? undefined} />
                          <AvatarFallback>{initials(r.profile?.full_name, r.profile?.username)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{r.profile?.full_name ?? r.profile?.username ?? "مستخدم"}</p>
                          <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("ar")}</p>
                        </div>
                      </Link>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleApprove(r, true)} aria-label="قبول">
                          <Check className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleApprove(r, false)} aria-label="رفض">
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
