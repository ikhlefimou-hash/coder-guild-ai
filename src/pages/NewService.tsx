import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const schema = z.object({
  title: z.string().trim().min(3, "العنوان قصير جداً").max(150),
  description: z.string().trim().min(10, "الوصف قصير جداً").max(5000),
  price: z.number().min(0).max(1000000),
  category: z.string().trim().max(50).optional(),
});

export default function NewService() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      title: fd.get("title"),
      description: fd.get("description"),
      price: Number(fd.get("price")),
      category: (fd.get("category") as string)?.trim() || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("services")
      .insert({
        user_id: user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        price: parsed.data.price,
        category: parsed.data.category ?? null,
      })
      .select("id")
      .single();
    setLoading(false);
    if (error) {
      toast.error("فشل إنشاء الخدمة. تحقق من حسابك.");
      return;
    }
    toast.success("تم نشر الخدمة!");
    navigate(`/services/${data.id}`);
  };

  return (
    <div className="container max-w-2xl py-8">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>عرض خدمة جديدة</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">عنوان الخدمة</Label>
              <Input id="title" name="title" required minLength={3} maxLength={150} placeholder="مثال: تطوير موقع React احترافي" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">التصنيف (اختياري)</Label>
              <Input id="category" name="category" maxLength={50} placeholder="Web, Mobile, AI..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">السعر ($)</Label>
              <Input id="price" name="price" type="number" required min={0} max={1000000} step="0.01" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">الوصف</Label>
              <Textarea
                id="description"
                name="description"
                required
                minLength={10}
                maxLength={5000}
                rows={6}
                placeholder="اشرح ما تقدمه، المدة المتوقعة، والتقنيات المستخدمة..."
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-glow">
              {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
              نشر الخدمة
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
