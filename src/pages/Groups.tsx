import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Lock, Plus, Users as UsersIcon, Globe } from "lucide-react";
import { z } from "zod";
import { useI18n } from "@/lib/i18n";

type Visibility = "public" | "private";
interface Group {
  id: string;
  name: string;
  description: string | null;
  visibility: Visibility;
  created_by: string;
  created_at: string;
}

export default function Groups() {
  const { user } = useAuth();
  const { t, dir } = useI18n();
  const [groups, setGroups] = useState<Group[]>([]);
  const [myMemberships, setMyMemberships] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "public" | "private" | "mine">("all");
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);

  const createSchema = z.object({
    name: z.string().trim().min(3, t("groups.shortName")).max(80),
    description: z.string().trim().max(500).optional().or(z.literal("")),
    visibility: z.enum(["public", "private"]),
    allow_all_post: z.boolean().optional(),
  });

  const load = async () => {
    setLoading(true);
    const [{ data: gs }, { data: mems }] = await Promise.all([
      supabase.from("groups").select("*").order("created_at", { ascending: false }),
      user
        ? supabase.from("group_members").select("group_id").eq("user_id", user.id)
        : Promise.resolve({ data: [] as { group_id: string }[] }),
    ]);
    setGroups((gs ?? []) as Group[]);
    setMyMemberships(new Set((mems ?? []).map((m: any) => m.group_id)));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const parsed = createSchema.safeParse({
      name: fd.get("name"),
      description: fd.get("description") || "",
      visibility: fd.get("visibility"),
      allow_all_post: fd.get("allow_all_post") === "on",
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("groups").insert({
      name: parsed.data.name,
      description: parsed.data.description || null,
      visibility: parsed.data.visibility,
      allow_all_post: !!parsed.data.allow_all_post,
      created_by: user.id,
    });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("groups.created"));
    setOpen(false);
    load();
  };

  const visible = groups.filter((g) => {
    if (filter === "public") return g.visibility === "public";
    if (filter === "private") return g.visibility === "private";
    if (filter === "mine") return myMemberships.has(g.id);
    return true;
  });

  return (
    <div className="container py-6" dir={dir}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("groups.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("groups.sub")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary shadow-glow">
              <Plus className="ml-1 h-4 w-4" />
              {t("groups.new")}
            </Button>
          </DialogTrigger>
          <DialogContent dir={dir}>
            <DialogHeader>
              <DialogTitle>{t("groups.create")}</DialogTitle>
              <DialogDescription>{t("groups.createSub")}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="g-name">{t("groups.name")}</Label>
                <Input id="g-name" name="name" required minLength={3} maxLength={80} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="g-desc">{t("groups.desc")}</Label>
                <Textarea id="g-desc" name="description" maxLength={500} rows={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="g-vis">{t("groups.type")}</Label>
                <Select name="visibility" defaultValue="public">
                  <SelectTrigger id="g-vis">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">{t("groups.publicOpt")}</SelectItem>
                    <SelectItem value="private">{t("groups.privateOpt")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-start gap-2 rounded-md border p-3">
                <Checkbox id="g-allow" name="allow_all_post" />
                <div className="space-y-1">
                  <Label htmlFor="g-allow" className="cursor-pointer">{t("groups.allowAllPost")}</Label>
                  <p className="text-xs text-muted-foreground">{t("groups.allowAllPostHint")}</p>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={creating} className="bg-gradient-primary shadow-glow">
                  {creating && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  {t("common.create")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">{t("groups.tabAll")}</TabsTrigger>
          <TabsTrigger value="public">{t("groups.tabPublic")}</TabsTrigger>
          <TabsTrigger value="private">{t("groups.tabPrivate")}</TabsTrigger>
          <TabsTrigger value="mine">{t("groups.tabMine")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : visible.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{t("groups.empty")}</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((g) => (
            <Link key={g.id} to={`/dashboard/groups/${g.id}`}>
              <Card className="h-full transition-all hover:border-primary/50 hover:shadow-glow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
                      <UsersIcon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <Badge variant={g.visibility === "public" ? "secondary" : "outline"} className="gap-1">
                      {g.visibility === "public" ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      {g.visibility === "public" ? t("groups.public") : t("groups.private")}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{g.name}</CardTitle>
                  {g.description && <CardDescription className="line-clamp-2">{g.description}</CardDescription>}
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
