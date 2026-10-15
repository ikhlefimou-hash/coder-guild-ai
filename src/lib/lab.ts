import { supabase } from "@/integrations/supabase/client";

export type LabLang = "python" | "javascript";
export type Loc = { ar?: string; fr?: string; en?: string };
export const loc = (l: Loc | null | undefined, lang: string) =>
  (l && ((l as Record<string, string>)[lang] || l.en || l.ar || l.fr)) || "";

export interface LabChallenge {
  id: string; xp: number; level: number; topic: string; difficulty: "easy" | "medium" | "hard";
  sort: number; fn_name: string; params: string; title: Loc; description: Loc;
}
export interface LabLevel { level: number; slug: string; title: Loc; lesson: Loc; example: Record<string, string>; unlock_required: number }
export interface LabTest { idx: number; args: unknown[]; expected: unknown; is_hidden: boolean }
export interface LabStats {
  xp: number; level: number; solved: number; py_solved: number; js_solved: number; py_xp: number; js_xp: number;
  total_challenges: number; attempts: number; success_rate: number; rank: number | null; last_challenge_id: string | null;
}

/** Must match public.lab_skill_level in the database. */
export const skillLevel = (xp: number) => Math.floor(Math.sqrt(Math.max(xp, 0) / 20)) + 1;
export const levelXp = (lvl: number) => 20 * (lvl - 1) * (lvl - 1);
export const levelProgress = (xp: number) => {
  const l = skillLevel(xp); const lo = levelXp(l); const hi = levelXp(l + 1);
  return { level: l, current: xp - lo, needed: hi - lo, pct: ((xp - lo) / (hi - lo)) * 100 };
};
export const HINT_MULT = [1, 0.85, 0.7, 0.5];
export const BADGES = ["Novice", "Apprentice", "Coder", "Developer", "Engineer", "Expert", "Master"];
export const badgeFor = (lvl: number) => BADGES[Math.min(lvl, BADGES.length) - 1];

export const starter = (c: LabChallenge, lang: LabLang) =>
  lang === "python" ? `def ${c.fn_name}(${c.params}):\n    # ...\n    pass\n` : `function ${c.fn_name}(${c.params}) {\n  // ...\n}\n`;

// ---------- Execution (Web Workers, never on the main thread) ----------
export type RunResult = { ok: boolean; value?: unknown; error?: string };
export type RunOut = { results?: RunResult[]; logs: string[]; error?: string };

const JS_WORKER = `
self.onmessage = (e) => {
  const { code, fn, inputs } = e.data;
  const logs = [];
  const fmt = (x) => typeof x === 'string' ? x : (() => { try { return JSON.stringify(x); } catch { return String(x); } })();
  console.log = console.info = console.warn = console.error = (...a) => { if (logs.length < 200) logs.push(a.map(fmt).join(' ')); };
  self.fetch = undefined; self.XMLHttpRequest = undefined; self.WebSocket = undefined; self.importScripts = undefined;
  try {
    const f = new Function('"use strict";\\n' + code + '\\n;return typeof ' + fn + ' === "function" ? ' + fn + ' : undefined;')();
    if (!f) throw new Error('Function "' + fn + '" is not defined');
    const results = inputs.map((args) => {
      try { const v = f(...structuredClone(args)); return { ok: true, value: v === undefined ? null : JSON.parse(JSON.stringify(v)) }; }
      catch (err) { return { ok: false, error: (err && err.name ? err.name + ': ' : '') + (err && err.message || String(err)) }; }
    });
    self.postMessage({ results, logs });
  } catch (err) {
    self.postMessage({ error: (err && err.name ? err.name + ': ' : '') + (err && err.message || String(err)), logs });
  }
};`;

const PY_WORKER = `
importScripts('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');
let py = null;
const HARNESS = \`
import json, traceback
def __lab_run(code, fn, inputs_json):
    ns = {"__name__": "__solution__"}
    try:
        exec(compile(code, "solution.py", "exec"), ns)
    except SyntaxError as e:
        return json.dumps({"error": f"SyntaxError (line {e.lineno}): {e.msg}"})
    except Exception as e:
        return json.dumps({"error": f"{type(e).__name__}: {e}"})
    f = ns.get(fn)
    if not callable(f):
        return json.dumps({"error": f"NameError: function '{fn}' is not defined"})
    out = []
    for args in json.loads(inputs_json):
        try:
            out.append({"ok": True, "value": json.loads(json.dumps(f(*args)))})
        except Exception as e:
            tb = traceback.extract_tb(e.__traceback__)
            line = next((t.lineno for t in reversed(tb) if t.filename == "solution.py"), None)
            out.append({"ok": False, "error": f"{type(e).__name__}: {e}" + (f" (line {line})" if line else "")})
    return json.dumps({"results": out})
\`;
self.onmessage = async (e) => {
  const { id, code, fn, inputs } = e.data;
  const logs = [];
  try {
    if (!py) { py = await loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/' }); py.runPython(HARNESS); }
    self.postMessage({ id, type: 'started' });
    py.setStdout({ batched: (s) => { if (logs.length < 200) logs.push(s); } });
    py.setStderr({ batched: (s) => { if (logs.length < 200) logs.push(s); } });
    const run = py.globals.get('__lab_run');
    const res = JSON.parse(run(code, fn, JSON.stringify(inputs)));
    self.postMessage({ id, type: 'done', ...res, logs });
  } catch (err) {
    self.postMessage({ id, type: 'done', error: String(err && err.message || err).split('\\n').slice(-3).join('\\n'), logs });
  }
};`;

let pyWorker: Worker | null = null;
let pySeq = 0;
const newPyWorker = () => new Worker(URL.createObjectURL(new Blob([PY_WORKER], { type: "text/javascript" })));

export function runCode(lang: LabLang, code: string, fn: string, inputs: unknown[][]): Promise<RunOut> {
  if (lang === "javascript") {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(new Blob([JS_WORKER], { type: "text/javascript" }));
      const w = new Worker(url);
      const done = (r: RunOut) => { clearTimeout(timer); w.terminate(); URL.revokeObjectURL(url); resolve(r); };
      const timer = setTimeout(() => done({ error: "TimeoutError: code ran longer than 3s (infinite loop?)", logs: [] }), 3000);
      w.onmessage = (e) => done(e.data);
      w.onerror = (e) => { e.preventDefault(); done({ error: e.message || "Worker error", logs: [] }); };
      w.postMessage({ code, fn, inputs });
    });
  }
  return new Promise((resolve) => {
    if (!pyWorker) pyWorker = newPyWorker();
    const w = pyWorker; const id = ++pySeq;
    let execTimer: ReturnType<typeof setTimeout> | undefined;
    const loadTimer = setTimeout(() => finish({ error: "Python could not load (network?)", logs: [] }, true), 60000);
    const finish = (r: RunOut, kill = false) => {
      clearTimeout(loadTimer); if (execTimer) clearTimeout(execTimer);
      w.removeEventListener("message", onMsg);
      if (kill) { w.terminate(); if (pyWorker === w) pyWorker = null; }
      resolve(r);
    };
    const onMsg = (e: MessageEvent) => {
      if (e.data.id !== id) return;
      if (e.data.type === "started") {
        clearTimeout(loadTimer);
        execTimer = setTimeout(() => finish({ error: "TimeoutError: code ran longer than 5s (infinite loop?)", logs: [] }, true), 5000);
      } else finish(e.data);
    };
    w.addEventListener("message", onMsg);
    w.postMessage({ id, code, fn, inputs });
  });
}

/** Order-insensitive deep equality for JSON values (object keys). */
export function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === (b as unknown[]).length && a.every((x, i) => jsonEqual(x, (b as unknown[])[i]));
  const ka = Object.keys(a as object), kb = Object.keys(b as object);
  return ka.length === kb.length && ka.every((k) => jsonEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}
export const show = (v: unknown) => (v === undefined ? "undefined" : JSON.stringify(v));

// ---------- API ----------
export const labApi = {
  async load() {
    const [c, l] = await Promise.all([
      supabase.from("coding_challenges").select("id,xp,level,topic,difficulty,sort,fn_name,params,title,description").eq("is_active", true).order("level").order("sort"),
      supabase.from("lab_levels").select("*").order("level"),
    ]);
    return { challenges: (c.data ?? []) as unknown as LabChallenge[], levels: (l.data ?? []) as unknown as LabLevel[] };
  },
  async myCompletions(userId: string) {
    const { data } = await supabase.from("challenge_completions").select("challenge_id,language,xp").eq("user_id", userId);
    return (data ?? []) as { challenge_id: string; language: LabLang; xp: number }[];
  },
  async tests(id: string) {
    const { data, error } = await supabase.rpc("get_challenge_tests", { _challenge_id: id });
    if (error) throw error;
    return (data ?? []) as LabTest[];
  },
  async hints(id: string) {
    const { data } = await supabase.rpc("get_hints", { _challenge_id: id });
    return (data ?? { used: 0, hints: [] }) as { used: number; hints: Loc[] };
  },
  async revealHint(id: string) {
    const { data, error } = await supabase.rpc("reveal_hint", { _challenge_id: id });
    if (error) throw error;
    return data as { used: number; hints: Loc[] };
  },
  async submit(id: string, language: LabLang, code: string, outputs: unknown[]) {
    const { data, error } = await supabase.rpc("submit_solution", { _challenge_id: id, _language: language, _code: code, _outputs: outputs as never });
    if (error) throw error;
    return data as { passed: boolean; passed_count: number; total: number; hidden_failed: number; xp_awarded: number; first_time: boolean; total_xp: number; hints_used: number; level: number };
  },
  async stats(userId: string) {
    const { data } = await supabase.rpc("get_lab_stats", { _user_id: userId });
    return data as unknown as LabStats | null;
  },
};
