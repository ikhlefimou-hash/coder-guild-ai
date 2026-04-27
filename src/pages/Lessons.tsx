import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, BookOpen, Trash2, PlayCircle } from "lucide-react";
import { toast } from "sonner";

interface Lesson {
  id: string; author_id: string; title: string; description: string;
  category: string | null; cover_url: string | null; video_url: string | null;
  price: number; type: "free" | "paid"; created_at: string;
}

export default function Lessons() {
  const { user } = useAuth();
  const [list, setList] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "free" | "paid">("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", category: "", cover_url: "", video_url: "",
    price: "0", type: "free" as "free" | "paid",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("lessons").select("*").eq("is_published", true)
      .order("created_at", { ascending: false });
    setList((data ?? []) as Lesson[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = list.filter((l) => tab === "all" ? true : l.type === tab);

  const create = async () => {
    if (!user) return;
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("العنوان والوصف مطلوبان");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("lessons").insert({
      author_id: user.id,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim() || null,
      cover_url: form.cover_url.trim() || null,
      video_url: form.video_url.trim() || null,
      price: form.type === "free" ? 0 : Number(form.price) || 0,
      type: form.type,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم نشر الدرس");
    setOpen(false);
    setForm({ title: "", description: "", category: "", cover_url: "", video_url: "", price: "0", type: "free" });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف");
    load();
  };

  return (
    <div className="container py-4" dir="rtl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">الدروس والكورسات</h1>
          <p className="text-sm text-muted-foreground">كورسات مجانية ومدفوعة</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary shadow-glow"><Plus className="ml-1 h-4 w-4" /> أضف درس</Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader><DialogTitle>درس جديد</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Input placeholder="العنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input placeholder="التصنيف (مثل: JavaScript)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <Input placeholder="رابط الصورة (اختياري)" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} />
              <Input placeholder="رابط الفيديو (YouTube/Vimeo)" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} />
              <div className="flex gap-2">
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as "free" | "paid" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">مجاني</SelectItem>
                    <SelectItem value="paid">مدفوع</SelectItem>
                  </SelectContent>
                </Select>
                {form.type === "paid" && (
                  <Input type="number" placeholder="السعر" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={create} disabled={saving} className="bg-gradient-primary shadow-glow">
                {saving ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : null} نشر
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="all">الكل</TabsTrigger>
          <TabsTrigger value="free">مجانية</TabsTrigger>
          <TabsTrigger value="paid">مدفوعة</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="pt-4">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-10 text-center text-sm text-muted-foreground">لا دروس بعد.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((l) => (
                <Card key={l.id} className="overflow-hidden">
                  {l.cover_url ? (
                    <div className="aspect-video bg-muted">
                      <img src={l.cover_url} alt={l.title} loading="lazy" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-muted"><BookOpen className="h-10 w-10 text-muted-foreground" /></div>
                  )}
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="line-clamp-1 text-base">{l.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 p-3 pt-0">
                    <p className="line-clamp-2 text-xs text-muted-foreground">{l.description}</p>
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant={l.type === "free" ? "secondary" : "default"}>
                        {l.type === "free" ? "مجاني" : `${l.price} د.ج`}
                      </Badge>
                      {l.category && <Badge variant="outline">{l.category}</Badge>}
                    </div>
                    <div className="flex justify-between gap-2">
                      {l.video_url && (
                        <Button asChild size="sm" variant="outline">
                          <a href={l.video_url} target="_blank" rel="noreferrer"><PlayCircle className="ml-1 h-4 w-4" /> مشاهدة</a>
                        </Button>
                      )}
                      {user?.id === l.author_id && (
                        <Button size="icon" variant="ghost" onClick={() => remove(l.id)} aria-label="حذف">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
