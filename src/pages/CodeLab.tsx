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
import { CheckCircle2, Loader2, Lock, Play, Trophy, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type L = { ar: string; fr: string; en: string };
type Lang = "js" | "py";
interface Challenge { id: string; fn: string; params: string; xp: number; level: number; title: L; desc: L; tests: { args: unknown[]; expected: unknown }[] }

const LANGS: { id: Lang; label: string }[] = [{ id: "js", label: "JavaScript" }, { id: "py", label: "Python" }];
const starter = (c: Challenge, lang: Lang) =>
  lang === "py" ? `def ${c.fn}(${c.params}):\n    pass\n` : `function ${c.fn}(${c.params}) {\n  \n}\n`;

const CH: Challenge[] = [
  // Level 1
  { id: "sum", fn: "sum", params: "a, b", xp: 10, level: 1, title: { ar: "مجموع رقمين", fr: "Somme de deux nombres", en: "Sum of two numbers" }, desc: { ar: "أرجع مجموع a و b.", fr: "Retournez a + b.", en: "Return a + b." }, tests: [{ args: [1, 2], expected: 3 }, { args: [-4, 9], expected: 5 }, { args: [0, 0], expected: 0 }] },
  { id: "reverse", fn: "reverse", params: "s", xp: 10, level: 1, title: { ar: "عكس نص", fr: "Inverser une chaîne", en: "Reverse a string" }, desc: { ar: "أرجع النص معكوساً.", fr: "Retournez la chaîne inversée.", en: "Return the string reversed." }, tests: [{ args: ["abc"], expected: "cba" }, { args: ["hello"], expected: "olleh" }, { args: [""], expected: "" }] },
  { id: "max", fn: "maximum", params: "arr", xp: 15, level: 1, title: { ar: "أكبر عدد", fr: "Plus grand nombre", en: "Largest number" }, desc: { ar: "أرجع أكبر عدد في القائمة.", fr: "Retournez le max de la liste.", en: "Return the largest number in the list." }, tests: [{ args: [[1, 5, 3]], expected: 5 }, { args: [[-2, -9]], expected: -2 }, { args: [[7]], expected: 7 }] },
  { id: "vowels", fn: "countVowels", params: "s", xp: 20, level: 1, title: { ar: "عدّ الحروف المتحركة", fr: "Compter les voyelles", en: "Count vowels" }, desc: { ar: "أرجع عدد الحروف a e i o u (كبيرة أو صغيرة).", fr: "Nombre de a e i o u (toute casse).", en: "Count a e i o u (any case)." }, tests: [{ args: ["hello"], expected: 2 }, { args: ["AEIOU"], expected: 5 }, { args: ["xyz"], expected: 0 }] },
  // Level 2
  { id: "evens", fn: "evens", params: "arr", xp: 15, level: 2, title: { ar: "الأعداد الزوجية", fr: "Nombres pairs", en: "Even numbers" }, desc: { ar: "أرجع قائمة بالأعداد الزوجية فقط.", fr: "Retournez uniquement les nombres pairs.", en: "Return only the even numbers." }, tests: [{ args: [[1, 2, 3, 4]], expected: [2, 4] }, { args: [[1, 3]], expected: [] }] },
  { id: "palindrome", fn: "isPalindrome", params: "s", xp: 20, level: 2, title: { ar: "كلمة متناظرة", fr: "Palindrome", en: "Palindrome" }, desc: { ar: "أرجع true إذا كانت الكلمة تُقرأ بالعكس نفسها (تجاهل حالة الأحرف).", fr: "true si le mot est un palindrome (insensible à la casse).", en: "Return true if the word is a palindrome (case-insensitive)." }, tests: [{ args: ["Radar"], expected: true }, { args: ["code"], expected: false }, { args: ["a"], expected: true }] },
  { id: "fizzbuzz", fn: "fizzbuzz", params: "n", xp: 25, level: 2, title: { ar: "FizzBuzz", fr: "FizzBuzz", en: "FizzBuzz" }, desc: { ar: "\"FizzBuzz\" إذا قبل القسمة على 15، \"Fizz\" على 3، \"Buzz\" على 5، وإلا الرقم كنص.", fr: "\"FizzBuzz\" (÷15), \"Fizz\" (÷3), \"Buzz\" (÷5), sinon le nombre en texte.", en: "\"FizzBuzz\" (÷15), \"Fizz\" (÷3), \"Buzz\" (÷5), else the number as a string." }, tests: [{ args: [15], expected: "FizzBuzz" }, { args: [9], expected: "Fizz" }, { args: [10], expected: "Buzz" }, { args: [7], expected: "7" }] },
  { id: "factorial", fn: "factorial", params: "n", xp: 25, level: 2, title: { ar: "المضروب", fr: "Factorielle", en: "Factorial" }, desc: { ar: "أرجع n! (مضروب 0 يساوي 1).", fr: "Retournez n! (0! = 1).", en: "Return n! (0! = 1)." }, tests: [{ args: [0], expected: 1 }, { args: [5], expected: 120 }, { args: [10], expected: 3628800 }] },
  // Level 3
  { id: "capitalize", fn: "capitalize", params: "s", xp: 20, level: 3, title: { ar: "أحرف كبيرة", fr: "Majuscules", en: "Capitalize words" }, desc: { ar: "اجعل أول حرف من كل كلمة كبيراً.", fr: "Mettez la première lettre de chaque mot en majuscule.", en: "Uppercase the first letter of each word." }, tests: [{ args: ["hello world"], expected: "Hello World" }, { args: ["a b"], expected: "A B" }] },
  { id: "fibonacci", fn: "fib", params: "n", xp: 30, level: 3, title: { ar: "فيبوناتشي", fr: "Fibonacci", en: "Fibonacci" }, desc: { ar: "أرجع العنصر n في متتالية فيبوناتشي (fib(0)=0, fib(1)=1).", fr: "Le n-ième terme (fib(0)=0, fib(1)=1).", en: "Return the n-th Fibonacci number (fib(0)=0, fib(1)=1)." }, tests: [{ args: [0], expected: 0 }, { args: [1], expected: 1 }, { args: [10], expected: 55 }, { args: [30], expected: 832040 }] },
  { id: "unique", fn: "unique", params: "arr", xp: 30, level: 3, title: { ar: "إزالة التكرار", fr: "Supprimer les doublons", en: "Remove duplicates" }, desc: { ar: "أرجع قائمة بدون تكرار مع الحفاظ على الترتيب.", fr: "Liste sans doublons, ordre conservé.", en: "Return the list without duplicates, keeping order." }, tests: [{ args: [[1, 2, 2, 3, 1]], expected: [1, 2, 3] }, { args: [[]], expected: [] }] },
  { id: "anagram", fn: "isAnagram", params: "a, b", xp: 40, level: 3, title: { ar: "الجناس", fr: "Anagramme", en: "Anagram" }, desc: { ar: "أرجع true إذا كانت الكلمتان بنفس الحروف.", fr: "true si les deux mots ont les mêmes lettres.", en: "Return true if both words use the same letters." }, tests: [{ args: ["listen", "silent"], expected: true }, { args: ["abc", "abd"], expected: false }, { args: ["aab", "abb"], expected: false }] },
  // Level 4
  { id: "isprime", fn: "isPrime", params: "n", xp: 30, level: 4, title: { ar: "عدد أولي", fr: "Nombre premier", en: "Prime number" }, desc: { ar: "أرجع true إذا كان n عدداً أولياً.", fr: "true si n est premier.", en: "Return true if n is prime." }, tests: [{ args: [2], expected: true }, { args: [1], expected: false }, { args: [97], expected: true }, { args: [100], expected: false }] },
  { id: "wordcount", fn: "wordCount", params: "s", xp: 30, level: 4, title: { ar: "عدّ الكلمات", fr: "Compter les mots", en: "Word count" }, desc: { ar: "أرجع عدد الكلمات (الفصل بالمسافات، تجاهل المسافات الزائدة).", fr: "Nombre de mots (ignorer les espaces en trop).", en: "Return the number of words (ignore extra spaces)." }, tests: [{ args: ["hello  big world"], expected: 3 }, { args: ["   "], expected: 0 }] },
  { id: "flatten", fn: "flatten", params: "arr", xp: 35, level: 4, title: { ar: "تسطيح قائمة", fr: "Aplatir une liste", en: "Flatten a list" }, desc: { ar: "حوّل قائمة متداخلة إلى قائمة واحدة مسطحة.", fr: "Aplatissez une liste imbriquée.", en: "Flatten a nested list into one list." }, tests: [{ args: [[1, [2, [3, 4]], 5]], expected: [1, 2, 3, 4, 5] }, { args: [[]], expected: [] }] },
  { id: "binary", fn: "toBinary", params: "n", xp: 35, level: 4, title: { ar: "التحويل للثنائي", fr: "Conversion binaire", en: "To binary" }, desc: { ar: "أرجع تمثيل n بالنظام الثنائي كنص.", fr: "Retournez n en binaire (texte).", en: "Return n in binary as a string." }, tests: [{ args: [5], expected: "101" }, { args: [0], expected: "0" }, { args: [255], expected: "11111111" }] },
];
const LEVELS = [...new Set(CH.map((c) => c.level))];

const LEVEL_XP = 50;
const levelOf = (xp: number) => Math.floor(xp / LEVEL_XP) + 1;

type Result = { ok: boolean; got?: string; expected: string; error?: string };
type RunOut = { results?: Result[]; logs: string[]; error?: string };

const JS_WORKER = `
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

const PY_WORKER = `
  importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');
  const ready = loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/' });
  self.onmessage = async (e) => {
    const { code, fn, tests } = e.data;
    const logs = [];
    try {
      const py = await ready;
      py.setStdout({ batched: (s) => logs.push(s) });
      py.globals.set('__tests_json', JSON.stringify(tests));
      await py.runPythonAsync(code);
      const out = await py.runPythonAsync(\`
import json
__res = []
__f = globals().get(\${JSON.stringify(fn)})
if not callable(__f):
    raise NameError("Function '\${fn}' not found")
for __t in json.loads(__tests_json):
    try:
        __g = __f(*__t["args"])
        __res.append({"ok": json.dumps(__g) == json.dumps(__t["expected"]), "got": json.dumps(__g), "expected": json.dumps(__t["expected"])})
    except Exception as __e:
        __res.append({"ok": False, "expected": json.dumps(__t["expected"]), "error": str(__e)})
json.dumps(__res)
\`);
      self.postMessage({ results: JSON.parse(out), logs });
    } catch (err) { self.postMessage({ error: String(err && err.message || err).split('\\n').slice(-3).join('\\n'), logs }); }
  };`;

function runInWorker(lang: Lang, code: string, fn: string, tests: Challenge["tests"]): Promise<RunOut> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([lang === "py" ? PY_WORKER : JS_WORKER], { type: "text/javascript" }));
    const w = new Worker(url);
    const ms = lang === "py" ? 30000 : 3000;
    const timer = setTimeout(() => { w.terminate(); URL.revokeObjectURL(url); resolve({ error: `Timeout (${ms / 1000}s)`, logs: [] }); }, ms);
    w.onmessage = (e) => { clearTimeout(timer); w.terminate(); URL.revokeObjectURL(url); resolve(e.data); };
    w.postMessage({ code, fn, tests });
  });
}

interface Leader { user_id: string; username: string; full_name: string | null; avatar_url: string | null; is_verified: boolean; xp: number; solved: number }

export default function CodeLab() {
  const { t, dir, lang } = useI18n();
  const { user } = useAuth();
  const [active, setActive] = useState(CH[0]);
  const [lang2, setLang2] = useState<Lang>("js");
  const [codes, setCodes] = useState<Record<string, string>>({});
  const key = `${active.id}:${lang2}`;
  const code = codes[key] ?? starter(active, lang2);
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [out, setOut] = useState<RunOut | null>(null);
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
    const r = await runInWorker(lang2, code, active.fn, active.tests);
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
            <div className="space-y-4">
              {LEVELS.map((lv) => {
                const locked = lv > level;
                return (
                  <div key={lv}>
                    <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                      {locked && <Lock className="h-3 w-3" />}{t("lab.level")} {lv}{locked && ` · ${t("lab.locked")}`}
                    </p>
                    <div className="flex gap-2 overflow-x-auto lg:flex-col">
                      {CH.filter((c) => c.level === lv).map((c) => (
                        <button key={c.id} disabled={locked} onClick={() => { setActive(c); setOut(null); }}
                          className={`flex min-w-[180px] items-center justify-between gap-2 rounded-lg border p-3 text-start text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${active.id === c.id ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted"}`}>
                          <span className="flex items-center gap-2">{solved.has(c.id) && <CheckCircle2 className="h-4 w-4 text-success" />}{L(c.title)}</span>
                          <Badge variant="secondary">{c.xp} XP</Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <Card className="min-w-0">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">{L(active.title)}{solved.has(active.id) && <CheckCircle2 className="h-5 w-5 text-success" />}</CardTitle>
                <p className="text-sm text-muted-foreground">{L(active.desc)}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea dir="ltr" spellCheck={false} value={code}
                  onChange={(e) => setCodes({ ...codes, [key]: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Tab") { e.preventDefault(); const el = e.currentTarget; const s = el.selectionStart; const v = el.value.slice(0, s) + "  " + el.value.slice(el.selectionEnd); setCodes({ ...codes, [key]: v }); requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + 2; }); } }}
                  className="h-64 w-full resize-y rounded-lg border border-border bg-muted/50 p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <div className="flex flex-wrap gap-2">
                  <Select value={lang2} onValueChange={(v) => { setLang2(v as Lang); setOut(null); }}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{LANGS.map((l) => <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button onClick={run} disabled={running}>{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}{running && lang2 === "py" ? t("lab.loadingPy") : t("lab.run")}</Button>
                  <Button variant="outline" onClick={() => setCodes({ ...codes, [key]: starter(active, lang2) })}>{t("lab.reset")}</Button>
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
