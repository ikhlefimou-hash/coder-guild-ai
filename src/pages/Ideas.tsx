import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, Lightbulb, Trash2, Code2 } from "lucide-react";
import { toast } from "sonner";

interface Idea {
  id: string; seller_id: string; title: string; description: string;
  category: string | null; cover_url: string | null; preview_code: string | null;
  price: number; created_at: string;
}

export default function Ideas() {
  const { user } = useAuth();
  const [list, setList] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<Idea | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", category: "", cover_url: "",
    preview_code: "", full_code: "", price: "0",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ideas")
      .select("id, seller_id, title, description, category, cover_url, preview_code, price, created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false });
    setList((data ?? []) as Idea[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!user) return;
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("العنوان والوصف مطلوبان");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("ideas").insert({
      seller_id: user.id,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category.trim() || null,
      cover_url: form.cover_url.trim() || null,
      preview_code: form.preview_code.trim() || null,
      full_code: form.full_code.trim() || null,
      price: Number(form.price) || 0,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم نشر الفكرة");
    setOpen(false);
    setForm({ title: "", description: "", category: "", cover_url: "", preview_code: "", full_code: "", price: "0" });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("ideas").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحذف");
    load();
  };

  return (
    <div className="container py-4" dir="rtl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">الأفكار للبيع</h1>
          <p className="text-sm text-muted-foreground">أفكار وأكواد جاهزة مع شرح</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary shadow-glow"><Plus className="ml-1 h-4 w-4" /> أضف فكرة</Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader><DialogTitle>فكرة جديدة</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Input placeholder="العنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="الوصف / الشرح" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input placeholder="التصنيف" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <Input placeholder="رابط الصورة" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} />
              <Textarea placeholder="معاينة الكود (تظهر للجميع)" value={form.preview_code} onChange={(e) => setForm({ ...form, preview_code: e.target.value })} className="font-mono text-xs" />
              <Textarea placeholder="الكود الكامل (مخفي)" value={form.full_code} onChange={(e) => setForm({ ...form, full_code: e.target.value })} className="font-mono text-xs" />
              <Input type="number" placeholder="السعر (0 = مجاني)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <DialogFooter>
              <Button onClick={create} disabled={saving} className="bg-gradient-primary shadow-glow">
                {saving ? <Loader2 className="ml-1 h-4 w-4 animate-spin" /> : null} نشر
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : list.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-10 text-center text-sm text-muted-foreground">لا أفكار بعد.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((i) => (
            <Card key={i.id} className="overflow-hidden">
              {i.cover_url ? (
                <div className="aspect-video bg-muted">
                  <img src={i.cover_url} alt={i.title} loading="lazy" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center bg-muted"><Lightbulb className="h-10 w-10 text-muted-foreground" /></div>
              )}
              <CardHeader className="p-3 pb-1">
                <CardTitle className="line-clamp-1 text-base">{i.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-3 pt-0">
                <p className="line-clamp-2 text-xs text-muted-foreground">{i.description}</p>
                <div className="flex flex-wrap items-center gap-1">
                  <Badge variant={i.price === 0 ? "secondary" : "default"}>
                    {i.price === 0 ? "مجاني" : `${i.price} د.ج`}
                  </Badge>
                  {i.category && <Badge variant="outline">{i.category}</Badge>}
                </div>
                <div className="flex justify-between gap-2">
                  <Button size="sm" variant="outline" onClick={() => setView(i)}>
                    <Code2 className="ml-1 h-4 w-4" /> عرض
                  </Button>
                  {user?.id === i.seller_id && (
                    <Button size="icon" variant="ghost" onClick={() => remove(i.id)} aria-label="حذف">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader><DialogTitle>{view?.title}</DialogTitle></DialogHeader>
          {view && (
            <div className="space-y-3">
              <p className="whitespace-pre-wrap text-sm">{view.description}</p>
              {view.preview_code && (
                <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs ltr:text-left" dir="ltr">
                  <code>{view.preview_code}</code>
                </pre>
              )}
              {view.price > 0 && (
                <p className="text-xs text-muted-foreground">الكود الكامل متاح بعد الشراء ({view.price} د.ج).</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
