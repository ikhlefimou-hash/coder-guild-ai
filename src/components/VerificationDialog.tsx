import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { BadgeCheck, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function VerificationDialog({
  defaultBio = "",
  defaultSkills = [],
  onDone,
}: { defaultBio?: string; defaultSkills?: string[]; onDone?: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bio, setBio] = useState(defaultBio);
  const [skills, setSkills] = useState((defaultSkills ?? []).join(", "));
  const [github, setGithub] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [years, setYears] = useState(1);
  const [asTeacher, setAsTeacher] = useState(false);
  const [specialty, setSpecialty] = useState("programming");

  const submit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-profile", {
        body: {
          bio: bio.trim(),
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
          portfolio_links: portfolio.split(",").map((s) => s.trim()).filter(Boolean),
          github_url: github.trim(),
          experience_years: years,
          is_teacher: asTeacher,
          specialty: asTeacher ? specialty : null,
        },
      });
      if (error) throw error;
      if (data?.approved) {
        toast.success(t("verify.approved") + ` (${data.score}/100)`);
      } else {
        toast.error(t("verify.rejected") + (data?.analysis ? `: ${data.analysis}` : ""));
      }
      setOpen(false);
      onDone?.();
    } catch (e: any) {
      toast.error(e?.message ?? t("verify.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BadgeCheck className="ml-1 h-4 w-4" /> {t("verify.requestBtn")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("verify.title")}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{t("verify.desc")}</p>
          <div className="space-y-1">
            <Label>{t("profile.bio")}</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500} />
          </div>
          <div className="space-y-1">
            <Label>{t("profile.skills")}</Label>
            <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, Node.js…" />
          </div>
          <div className="space-y-1">
            <Label>GitHub URL</Label>
            <Input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/..." />
          </div>
          <div className="space-y-1">
            <Label>{t("verify.portfolio")}</Label>
            <Input value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="https://..., https://..." />
          </div>
          <div className="space-y-1">
            <Label>{t("verify.years")}</Label>
            <Input type="number" min={0} max={50} value={years} onChange={(e) => setYears(Number(e.target.value) || 0)} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-2">
            <Label className="text-sm">{t("verify.applyTeacher")}</Label>
            <Switch checked={asTeacher} onCheckedChange={setAsTeacher} />
          </div>
          {asTeacher && (
            <div className="space-y-1">
              <Label>{t("verify.specialty")}</Label>
              <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="programming">{t("teachers.spec.programming")}</option>
                <option value="cybersecurity">{t("teachers.spec.cybersecurity")}</option>
              </select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={loading} className="bg-gradient-primary">
            {loading && <Loader2 className="ml-1 h-4 w-4 animate-spin" />}
            {t("verify.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
