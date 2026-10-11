import { useEffect, useMemo, useState } from "react";
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
import { CheckCircle2, Loader2, Play, Trophy, XCircle } from "lucide-react";
import { toast } from "sonner";

type L = { ar: string; fr: string; en: string };
interface Challenge { id: string; fn: string; xp: number; title: L; desc: L; starter: string; tests: { args: unknown[]; expected: unknown }[] }

const CH: Challenge[] = [
  { id: "sum", fn: "sum", xp: 10, title: { ar: "مجموع رقمين", fr: "Somme de deux nombres", en: "Sum of two numbers" }, desc: { ar: "أرجع مجموع a و b.", fr: "Retournez a + b.", en: "Return a + b." }, starter: "function sum(a, b) {\n  \n}", tests: [{ args: [1, 2], expected: 3 }, { args: [-4, 9], expected: 5 }, { args: [0, 0], expected: 0 }] },
  { id: "reverse", fn: "reverse", xp: 10, title: { ar: "عكس نص", fr: "Inverser une chaîne", en: "Reverse a string" }, desc: { ar: "أرجع النص معكوساً.", fr: "Retournez la chaîne inversée.", en: "Return the string reversed." }, starter: "function reverse(s) {\n  \n}", tests: [{ args: ["abc"], expected: "cba" }, { args: ["hello"], expected: "olleh" }, { args: [""], expected: "" }] },
  { id: "max", fn: "max", xp: 15, title: { ar: "أكبر عدد", fr: "Plus grand nombre", en: "Largest number" }, desc: { ar: "أرجع أكبر عدد في المصفوفة دون Math.max.", fr: "Retournez le max du tableau.", en: "Return the largest number in the array." }, starter: "function max(arr) {\n  \n}", tests: [{ args: [[1, 5, 3]], expected: 5 }, { args: [[-2, -9]], expected: -2 }, { args: [[7]], expected: 7 }] },
  { id: "palindrome", fn: "isPalindrome", xp: 20, title: { ar: "كلمة متناظرة", fr: "Palindrome", en: "Palindrome" }, desc: { ar: "أرجع true إذا كانت الكلمة تُقرأ بالعكس نفسها (تجاهل الأحرف الكبيرة).", fr: "true si le mot est un palindrome (insensible à la casse).", en: "Return true if the word is a palindrome (case-insensitive)." }, starter: "function isPalindrome(s) {\n  \n}", tests: [{ args: ["Radar"], expected: true }, { args: ["code"], expected: false }, { args: ["a"], expected: true }] },
  { id: "fizzbuzz", fn: "fizzbuzz", xp: 25, title: { ar: "FizzBuzz", fr: "FizzBuzz", en: "FizzBuzz" }, desc: { ar: "أرجع \"FizzBuzz\" إذا قبل القسمة على 15، \"Fizz\" على 3، \"Buzz\" على 5، وإلا الرقم كنص.", fr: "\"FizzBuzz\" (÷15), \"Fizz\" (÷3), \"Buzz\" (÷5), sinon le nombre en texte.", en: "\"FizzBuzz\" (÷15), \"Fizz\" (÷3), \"Buzz\" (÷5), else the number as a string." }, starter: "function fizzbuzz(n) {\n  \n}", tests: [{ args: [15], expected: "FizzBuzz" }, { args: [9], expected: "Fizz" }, { args: [10], expected: "Buzz" }, { args: [7], expected: "7" }] },
  { id: "vowels", fn: "countVowels", xp: 20, title: { ar: "عدّ الحروف المتحركة", fr: "Compter les voyelles", en: "Count vowels" }, desc: { ar: "أرجع عدد الحروف a e i o u في النص.", fr: "Nombre de a e i o u dans le texte.", en: "Count a e i o u in the text." }, starter: "function countVowels(s) {\n  \n}", tests: [{ args: ["hello"], expected: 2 }, { args: ["AEIOU"], expected: 5 }, { args: ["xyz"], expected: 0 }] },
  { id: "factorial", fn: "factorial", xp: 25, title: { ar: "المضروب", fr: "Factorielle", en: "Factorial" }, desc: { ar: "أرجع n! (مضروب 0 يساوي 1).", fr: "Retournez n! (0! = 1).", en: "Return n! (0! = 1)." }, starter: "function factorial(n) {\n  \n}", tests: [{ args: [0], expected: 1 }, { args: [5], expected: 120 }, { args: [10], expected: 3628800 }] },
  { id: "fibonacci", fn: "fib", xp: 30, title: { ar: "فيبوناتشي", fr: "Fibonacci", en: "Fibonacci" }, desc: { ar: "أرجع العنصر رقم n في متتالية فيبوناتشي (fib(0)=0, fib(1)=1).", fr: "Retournez le n-ième terme (fib(0)=0, fib(1)=1).", en: "Return the n-th Fibonacci number (fib(0)=0, fib(1)=1)." }, starter: "function fib(n) {\n  \n}", tests: [{ args: [0], expected: 0 }, { args: [1], expected: 1 }, { args: [10], expected: 55 }, { args: [30], expected: 832040 }] },
  { id: "unique", fn: "unique", xp: 30, title: { ar: "إزالة التكرار", fr: "Supprimer les doublons", en: "Remove duplicates" }, desc: { ar: "أرجع مصفوفة بدون تكرار مع الحفاظ على الترتيب.", fr: "Tableau sans doublons, ordre conservé.", en: "Return the array without duplicates, keeping order." }, starter: "function unique(arr) {\n  \n}", tests: [{ args: [[1, 2, 2, 3, 1]], expected: [1, 2, 3] }, { args: [[]], expected: [] }] },
  { id: "anagram", fn: "isAnagram", xp: 40, title: { ar: "الجناس", fr: "Anagramme", en: "Anagram" }, desc: { ar: "أرجع true إذا كانت الكلمتان تحتويان نفس الحروف.", fr: "true si les deux mots ont les mêmes lettres.", en: "Return true if both words use the same letters." }, starter: "function isAnagram(a, b) {\n  \n}", tests: [{ args: ["listen", "silent"], expected: true }, { args: ["abc", "abd"], expected: false }, { args: ["aab", "abb"], expected: false }] },
];

const LEVEL_XP = 50;
const levelOf = (xp: number) => Math.floor(xp / LEVEL_XP) + 1;

type Result = { ok: boolean; got?: string; expected: string; error?: string };

function runInWorker(code: string, fn: string, tests: Challenge["tests"]): Promise<{ results?: Result[]; logs: string[]; error?: string }> {
  const src = `
    const logs = [];
    console.log = (...a) => logs.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '));
    self.onmessage = (e) => {
      const { code, fn, tests } = e.data;
      try {
        const f = new Function(code + '\\n;return typeof ' + fn + ' === "function" ? ' + fn + ' : undefined;')();
        if (!f) throw new Error('Function "' + fn + '" not found');
        const results = tests.map(t => {
          try { const got = f(...JSON.parse(JSON.stringify(t.args)));
            return { ok: JSON.stringify(got) === JSON.stringify(t.expected), got: JSON.stringify(got), expected: JSON.stringify(t.expected) };
          } catch (err) { return { ok: false, expected: JSON.stringify(t.expected), error: String(err && err.message || err) }; }
        });
        self.postMessage({ results, logs });
      } catch (err) { self.postMessage({ error: String(err && err.message || err), logs }); }
    };`;
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
    const w = new Worker(url);
    const timer = setTimeout(() => { w.terminate(); URL.revokeObjectURL(url); resolve({ error: "Timeout (3s)", logs: [] }); }, 3000);
    w.onmessage = (e) => { clearTimeout(timer); w.terminate(); URL.revokeObjectURL(url); resolve(e.data); };
    w.postMessage({ code, fn, tests });
  });
}

interface Leader { user_id: string; username: string; full_name: string | null; avatar_url: string | null; is_verified: boolean; xp: number; solved: number }

export default function CodeLab() {
  const { t, dir, lang } = useI18n();
  const { user } = useAuth();
  const [active, setActive] = useState(CH[0]);
  const [codes, setCodes] = useState<Record<string, string>>(() => Object.fromEntries(CH.map((c) => [c.id, c.starter])));
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [out, setOut] = useState<{ results?: Result[]; logs: string[]; error?: string } | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const L = (l: L) => l[lang as keyof L] ?? l.en;

  const xp = useMemo(() => CH.filter((c) => solved.has(c.id)).reduce((s, c) => s + c.xp, 0), [solved]);
  const level = levelOf(xp);

  const loadBoard = async () => {
    const { data } = await supabase.rpc("get_leaderboard", { _limit: 50 });
    setLeaders((data ?? []) as Leader[]);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("challenge_completions").select("challenge_id").eq("user_id", user.id)
      .then(({ data }) => setSolved(new Set((data ?? []).map((d) => d.challenge_id))));
    loadBoard();
  }, [user]);

  const run = async () => {
    setRunning(true);
    const r = await runInWorker(codes[active.id], active.fn, active.tests);
    setOut(r);
    if (r.results && r.results.every((x) => x.ok)) {
      if (!solved.has(active.id)) {
        const { error } = await supabase.rpc("complete_challenge", { _challenge_id: active.id });
        if (error) toast.error(error.message);
        else {
          const next = new Set(solved); next.add(active.id); setSolved(next);
          toast.success(`${t("lab.solved")} +${active.xp} XP`);
          loadBoard();
        }
      } else toast.success(t("lab.allPassed"));
    }
    setRunning(false);
  };

  const myRank = leaders.findIndex((l) => l.user_id === user?.id) + 1;

  return (
    <div className="container py-6 sm:py-10" dir={dir}>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("lab.level")}</p><p className="text-3xl font-semibold">{level}</p>
          <Progress value={((xp % LEVEL_XP) / LEVEL_XP) * 100} className="mt-3" /><p className="mt-1 text-xs text-muted-foreground">{xp % LEVEL_XP}/{LEVEL_XP} XP</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">XP</p><p className="text-3xl font-semibold">{xp}</p><p className="mt-1 text-xs text-muted-foreground">{solved.size}/{CH.length} {t("lab.challenges")}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{t("lab.rank")}</p><p className="text-3xl font-semibold">{myRank ? `#${myRank}` : "—"}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="practice">
        <TabsList><TabsTrigger value="practice">{t("lab.practice")}</TabsTrigger><TabsTrigger value="board">{t("lab.leaderboard")}</TabsTrigger></TabsList>

        <TabsContent value="practice" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <div className="flex gap-2 overflow-x-auto lg:flex-col">
              {CH.map((c) => (
                <button key={c.id} onClick={() => { setActive(c); setOut(null); }}
                  className={`flex min-w-[180px] items-center justify-between gap-2 rounded-lg border p-3 text-start text-sm transition ${active.id === c.id ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted"}`}>
                  <span className="flex items-center gap-2">{solved.has(c.id) && <CheckCircle2 className="h-4 w-4 text-success" />}{L(c.title)}</span>
                  <Badge variant="secondary">{c.xp} XP</Badge>
                </button>
              ))}
            </div>

            <Card className="min-w-0">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">{L(active.title)}{solved.has(active.id) && <CheckCircle2 className="h-5 w-5 text-success" />}</CardTitle>
                <p className="text-sm text-muted-foreground">{L(active.desc)}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea dir="ltr" spellCheck={false} value={codes[active.id]}
                  onChange={(e) => setCodes({ ...codes, [active.id]: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Tab") { e.preventDefault(); const el = e.currentTarget; const s = el.selectionStart; const v = el.value.slice(0, s) + "  " + el.value.slice(el.selectionEnd); setCodes({ ...codes, [active.id]: v }); requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 2; }); } }}
                  className="h-64 w-full resize-y rounded-lg border border-border bg-muted/50 p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <div className="flex gap-2">
                  <Button onClick={run} disabled={running}>{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}{t("lab.run")}</Button>
                  <Button variant="outline" onClick={() => setCodes({ ...codes, [active.id]: active.starter })}>{t("lab.reset")}</Button>
                </div>
                {out && (
                  <div dir="ltr" className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs">
                    {out.error && <p className="text-destructive">{out.error}</p>}
                    {out.results?.map((r, i) => (
                      <div key={i} className="flex items-start gap-2">
                        {r.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> : <XCircle className="h-4 w-4 shrink-0 text-destructive" />}
                        <span>Test {i + 1}: expected {r.expected}{!r.ok && (r.error ? ` — error: ${r.error}` : ` — got ${r.got ?? "undefined"}`)}</span>
                      </div>
                    ))}
                    {out.logs.length > 0 && <pre className="border-t border-border pt-2 text-muted-foreground">{out.logs.join("\n")}</pre>}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="board" className="mt-4">
          <Card><CardContent className="divide-y divide-border p-0">
            {leaders.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">{t("lab.empty")}</p>}
            {leaders.map((l, i) => (
              <div key={l.user_id} className={`flex items-center gap-3 p-4 ${l.user_id === user?.id ? "bg-primary/5" : ""}`}>
                <span className="w-8 text-center font-semibold">{i < 3 ? <Trophy className={`mx-auto h-5 w-5 ${i === 0 ? "text-warning" : "text-muted-foreground"}`} /> : i + 1}</span>
                <Avatar className="h-9 w-9"><AvatarImage src={l.avatar_url ?? undefined} /><AvatarFallback>{l.username?.[0]?.toUpperCase()}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1"><p className="flex items-center gap-1 truncate font-medium">{l.full_name || l.username}{l.is_verified && <VerifiedBadge />}</p>
                  <p className="text-xs text-muted-foreground">{t("lab.level")} {levelOf(Number(l.xp))} · {l.solved} {t("lab.challenges")}</p></div>
                <Badge>{l.xp} XP</Badge>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
