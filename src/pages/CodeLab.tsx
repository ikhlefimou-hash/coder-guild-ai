import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import { CheckCircle2, Lightbulb, Loader2, Lock, Play, Send, Trophy, XCircle } from "lucide-react";
import { toast } from "sonner";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  labApi, loc, starter, runCode, jsonEqual, show, levelProgress, badgeFor,
  type LabChallenge, type LabLevel, type LabLang, type LabTest, type LabStats, type RunOut, type Loc,
} from "@/lib/lab";

const LANGS: { id: LabLang; label: string }[] = [{ id: "python", label: "Python" }, { id: "javascript", label: "JavaScript" }];

interface Leader { rnk: number; user_id: string; username: string; full_name: string | null; avatar_url: string | null; is_verified: boolean; xp: number; solved: number; skill_level: number; is_me: boolean }

export default function CodeLab() {
  const { t, dir, lang } = useI18n();
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const [challenges, setChallenges] = useState<LabChallenge[]>([]);
  const [levels, setLevels] = useState<LabLevel[]>([]);
  const [active, setActive] = useState<LabChallenge | null>(null);
  const [plang, setPlang] = useState<LabLang>("python");
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [done, setDone] = useState<{ challenge_id: string; language: LabLang }[]>([]);
  const [tests, setTests] = useState<LabTest[]>([]);
  const [hints, setHints] = useState<{ used: number; hints: Loc[] }>({ used: 0, hints: [] });
  const [busy, setBusy] = useState<"run" | "submit" | null>(null);
  const [out, setOut] = useState<(RunOut & { visible?: LabTest[] }) | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [stats, setStats] = useState<LabStats | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [boardLang, setBoardLang] = useState<string>("all");

  const key = active ? `${active.id}:${plang}` : "";
  const code = active ? codes[key] ?? starter(active, plang) : "";

  const refresh = useCallback(async () => {
    if (!user) return;
    const [c, s] = await Promise.all([labApi.myCompletions(user.id), labApi.stats(user.id)]);
    setDone(c); setStats(s);
  }, [user]);

  const loadBoard = useCallback(async () => {
    const { data } = await supabase.rpc("get_lab_leaderboard", { _scope: "all", _language: boardLang === "all" ? null : boardLang, _search: null, _limit: 50 } as never);
    setLeaders((data ?? []) as unknown as Leader[]);
  }, [boardLang]);

  useEffect(() => { labApi.load().then(({ challenges, levels }) => { const c = challenges.filter((x) => x.fn_name); setChallenges(c); setLevels(levels); setActive((a) => a ?? c[0] ?? null); }); }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { loadBoard(); }, [loadBoard]);
  useEffect(() => {
    if (!active) return;
    setOut(null); setVerdict(null);
    labApi.tests(active.id).then(setTests).catch(() => setTests([]));
    labApi.hints(active.id).then(setHints);
  }, [active]);

  const solvedIds = useMemo(() => new Set(done.map((d) => d.challenge_id)), [done]);
  const isDone = (id: string, l?: LabLang) => done.some((d) => d.challenge_id === id && (!l || d.language === l));
  const unlocked = (lv: number) => {
    if (lv <= 1) return true;
    const req = levels.find((x) => x.level === lv)?.unlock_required ?? 0;
    return challenges.filter((c) => c.level === lv - 1 && solvedIds.has(c.id)).length >= req;
  };

  const exec = async (all: boolean) => {
    if (!active) return null;
    const list = all ? tests : tests.filter((x) => !x.is_hidden);
    const r = await runCode(plang, code, active.fn_name, list.map((x) => x.args as unknown[]));
    return { r, list };
  };

  const run = async () => {
    setBusy("run"); setVerdict(null);
    const res = await exec(false);
    if (res) setOut({ ...res.r, visible: res.list });
    setBusy(null);
  };

  const submit = async () => {
    if (!active) return;
    setBusy("submit");
    try {
      const res = await exec(true);
      if (!res) return;
      setOut({ ...res.r, visible: res.list.filter((x) => !x.is_hidden) });
      const outputs = res.list.map((_, i) => { const x = res.r.results?.[i]; return x?.ok ? x.value : { __error: x?.error ?? res.r.error ?? "error" }; });
      const s = await labApi.submit(active.id, plang, code, outputs);
      if (s.passed) {
        setVerdict(s.first_time ? `✅ +${s.xp_awarded} XP · ${t("lab.level")} ${s.level}` : `✅ ${t("lab.allPassed")} (0 XP)`);
        toast.success(s.first_time ? `${t("lab.solved")} +${s.xp_awarded} XP` : t("lab.allPassed"));
      } else setVerdict(`❌ ${s.passed_count}/${s.total}${s.hidden_failed ? ` · hidden failed: ${s.hidden_failed}` : ""}`);
      await Promise.all([refresh(), loadBoard()]);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  const reveal = async () => {
    if (!active) return;
    try { setHints(await labApi.revealHint(active.id)); } catch (e) { toast.error((e as Error).message); }
  };

  const xp = stats?.xp ?? 0;
  const prog = levelProgress(xp);
  const lvInfo = active ? levels.find((l) => l.level === active.level) : undefined;

  return (
    <div className="container py-6 sm:py-10" dir={dir}>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("lab.level")} · {badgeFor(prog.level)}</p><p className="text-3xl font-semibold">{prog.level}</p>
          <Progress value={prog.pct} className="mt-3" /><p className="mt-1 text-xs text-muted-foreground">{prog.current}/{prog.needed} XP</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">XP</p><p className="text-3xl font-semibold">{xp}</p>
          <p className="mt-1 text-xs text-muted-foreground">{stats?.solved ?? 0}/{challenges.length} {t("lab.challenges")} · Py {stats?.py_solved ?? 0} · JS {stats?.js_solved ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("lab.rank")}</p><p className="text-3xl font-semibold">{stats?.rank ? `#${stats.rank}` : "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">{stats?.success_rate ?? 0}% · {stats?.attempts ?? 0}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="practice">
        <TabsList><TabsTrigger value="practice">{t("lab.practice")}</TabsTrigger><TabsTrigger value="board">{t("lab.leaderboard")}</TabsTrigger></TabsList>

        <TabsContent value="practice" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <div className="space-y-4">
              {levels.map((lv) => {
                const locked = !unlocked(lv.level);
                const list = challenges.filter((c) => c.level === lv.level);
                if (!list.length) return null;
                return (
                  <div key={lv.level}>
                    <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                      {locked && <Lock className="h-3 w-3" />}{t("lab.level")} {lv.level} · {loc(lv.title, lang)}{locked && ` · ${t("lab.locked")}`}
                    </p>
                    <div className="flex gap-2 overflow-x-auto lg:flex-col">
                      {list.map((c) => (
                        <button key={c.id} disabled={locked} onClick={() => setActive(c)}
                          className={`flex min-w-[180px] items-center justify-between gap-2 rounded-lg border p-3 text-start text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${active?.id === c.id ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted"}`}>
                          <span className="flex items-center gap-2">{solvedIds.has(c.id) && <CheckCircle2 className="h-4 w-4 text-success" />}{loc(c.title, lang)}</span>
                          <Badge variant="secondary">{c.xp} XP</Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {active && (
              <Card className="min-w-0">
                <CardHeader className="pb-3">
                  <CardTitle className="flex flex-wrap items-center gap-2 text-lg">{loc(active.title, lang)}
                    <Badge variant="outline">{active.difficulty}</Badge>
                    {isDone(active.id, "python") && <Badge variant="secondary">Python ✓</Badge>}
                    {isDone(active.id, "javascript") && <Badge variant="secondary">JS ✓</Badge>}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{loc(active.description, lang)}</p>
                  {lvInfo && <details className="text-sm"><summary className="cursor-pointer text-primary">📘 {loc(lvInfo.title, lang)}</summary>
                    <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{loc(lvInfo.lesson, lang)}</p>
                    {lvInfo.example?.[plang] && <pre dir="ltr" className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs">{lvInfo.example[plang]}</pre>}
                  </details>}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div dir="ltr" className="overflow-hidden rounded-lg border border-border" data-testid="code-editor">
                    <Editor height="320px" language={plang} value={code} theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
                      onChange={(v) => setCodes((p) => ({ ...p, [key]: v ?? "" }))}
                      loading={<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                      options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: "on", tabSize: 4, scrollBeyondLastLine: false, automaticLayout: true, wordWrap: "on" }} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Select value={plang} onValueChange={(v) => { setPlang(v as LabLang); setOut(null); setVerdict(null); }}>
                      <SelectTrigger className="w-36" aria-label="language"><SelectValue /></SelectTrigger>
                      <SelectContent>{LANGS.map((l) => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button variant="outline" onClick={run} disabled={!!busy}>{busy === "run" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}{t("lab.run")}</Button>
                    <Button onClick={submit} disabled={!!busy}>{busy === "submit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Submit</Button>
                    <Button variant="ghost" onClick={reveal} disabled={hints.used >= 3}><Lightbulb className="h-4 w-4" />{hints.used}/3</Button>
                    <Button variant="ghost" onClick={() => setCodes({ ...codes, [key]: starter(active, plang) })}>{t("lab.reset")}</Button>
                  </div>
                  {hints.hints.length > 0 && (
                    <div className="space-y-1 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
                      {hints.hints.map((h, i) => <p key={i}>💡 {loc(h, lang)}</p>)}
                    </div>
                  )}
                  {verdict && <p className="font-medium">{verdict}</p>}
                  {out && (
                    <div dir="ltr" className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs">
                      {out.error && <p className="text-destructive">{out.error}</p>}
                      {out.visible?.map((tc, i) => {
                        const r = out.results?.[i]; if (!r) return null;
                        const ok = r.ok && jsonEqual(r.value, tc.expected);
                        return (
                          <div key={i} className="flex items-start gap-2">
                            {ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> : <XCircle className="h-4 w-4 shrink-0 text-destructive" />}
                            <span>{active.fn_name}({(tc.args as unknown[]).map(show).join(", ")}) → expected {show(tc.expected)}{!ok && (r.error ? ` — ${r.error}` : ` — got ${show(r.value)}`)}</span>
                          </div>
                        );
                      })}
                      {out.logs.length > 0 && <pre className="border-t border-border pt-2 text-muted-foreground">{out.logs.join("\n")}</pre>}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="board" className="mt-4 space-y-3">
          <Select value={boardLang} onValueChange={setBoardLang}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All</SelectItem>{LANGS.map((l) => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}</SelectContent>
          </Select>
          <Card><CardContent className="divide-y divide-border p-0">
            {leaders.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">{t("lab.empty")}</p>}
            {leaders.map((l) => (
              <div key={l.user_id} className={`flex items-center gap-3 p-4 ${l.is_me ? "bg-primary/5" : ""}`}>
                <span className="w-8 text-center font-semibold">{l.rnk <= 3 ? <Trophy className={`mx-auto h-5 w-5 ${l.rnk === 1 ? "text-warning" : "text-muted-foreground"}`} /> : l.rnk}</span>
                <Avatar className="h-9 w-9"><AvatarImage src={l.avatar_url ?? undefined} /><AvatarFallback>{l.username?.[0]?.toUpperCase()}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1"><p className="flex items-center gap-1 truncate font-medium">{l.full_name || l.username}{l.is_verified && <VerifiedBadge />}</p>
                  <p className="text-xs text-muted-foreground">{t("lab.level")} {l.skill_level} · {l.solved} {t("lab.challenges")}</p></div>
                <Badge>{l.xp} XP</Badge>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
