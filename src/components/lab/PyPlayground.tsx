import { useEffect, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Eraser, Loader2, Play, RotateCcw, Square, Trash2 } from "lucide-react";
import { runPlayground, stopPlayground, type ConsoleChunk } from "@/lib/lab";
import { labText } from "@/components/lab/labText";
import { useI18n } from "@/lib/i18n";

type Monaco = Parameters<OnMount>[1];
type Ed = Parameters<OnMount>[0];

export default function PyPlayground({ initial, height = "300px" }: { initial: string; height?: string }) {
  const { lang } = useI18n();
  const L = labText(lang);
  const { resolvedTheme } = useTheme();
  const [code, setCode] = useState(initial);
  const [stdin, setStdin] = useState("");
  const [out, setOut] = useState<ConsoleChunk[]>([]);
  const [busy, setBusy] = useState(false);
  const ed = useRef<{ editor: Ed; monaco: Monaco } | null>(null);
  const consoleRef = useRef<HTMLPreElement>(null);

  useEffect(() => { setCode(initial); setOut([]); }, [initial]);
  useEffect(() => { consoleRef.current?.scrollTo({ top: consoleRef.current.scrollHeight }); }, [out]);

  const mark = (line: number | null | undefined, msg?: string) => {
    const m = ed.current; if (!m) return;
    const model = m.editor.getModel(); if (!model) return;
    m.monaco.editor.setModelMarkers(model, "py", line ? [{
      startLineNumber: line, endLineNumber: line, startColumn: 1, endColumn: model.getLineMaxColumn(line),
      message: msg ?? "Error", severity: m.monaco.MarkerSeverity.Error,
    }] : []);
  };

  const run = async () => {
    setBusy(true); mark(null); setOut([]);
    const r = await runPlayground(code, stdin.split("\n").filter((_, i, a) => i < a.length - 1 || a[i] !== ""));
    setOut(r.out.length ? r.out : [{ kind: "out", text: L.noOutput + "\n" }]);
    if (r.errorLine) mark(r.errorLine, r.error?.split("\n").pop());
    setBusy(false);
  };
  const stop = () => { stopPlayground(); setBusy(false); setOut((o) => [...o, { kind: "err", text: "Stopped\n" }]); };

  return (
    <div className="space-y-2" dir="ltr">
      <div className="flex flex-wrap items-center gap-2">
        {busy
          ? <Button size="sm" variant="destructive" onClick={stop}><Square className="h-4 w-4" />Stop</Button>
          : <Button size="sm" onClick={run}><Play className="h-4 w-4" />{L.run}</Button>}
        <Button size="sm" variant="outline" onClick={() => { setCode(""); mark(null); }}><Eraser className="h-4 w-4" />{L.clear}</Button>
        <Button size="sm" variant="outline" onClick={() => { setCode(initial); mark(null); }}><RotateCcw className="h-4 w-4" />{L.reset}</Button>
        {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      <div className="overflow-hidden rounded-lg border border-border" data-testid="playground-editor">
        <Editor height={height} language="python" value={code} theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
          onMount={(editor, monaco) => { ed.current = { editor, monaco }; }}
          onChange={(v) => { setCode(v ?? ""); mark(null); }}
          options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: "on", tabSize: 4, insertSpaces: true, scrollBeyondLastLine: false, automaticLayout: true, quickSuggestions: true, wordBasedSuggestions: "currentDocument", suggestOnTriggerCharacters: true }} />
      </div>
      <div className="grid gap-2 md:grid-cols-[1fr_220px]">
        <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
          <div className="flex items-center justify-between border-b border-border px-3 py-1 text-xs text-muted-foreground">
            <span>Console</span>
            <button onClick={() => setOut([])} aria-label="clear console"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
          <pre ref={consoleRef} data-testid="console" className="h-40 overflow-auto whitespace-pre-wrap p-3 font-mono text-xs">
            {out.map((c, i) => <span key={i} className={c.kind === "err" ? "text-destructive" : c.kind === "in" ? "text-primary" : ""}>{c.text}</span>)}
          </pre>
        </div>
        <div>
          <p className="mb-1 text-xs text-muted-foreground">{L.inputLabel}</p>
          <Textarea data-testid="stdin" value={stdin} onChange={(e) => setStdin(e.target.value)} placeholder={"Ali\n20"} className="h-40 font-mono text-xs" />
        </div>
      </div>
    </div>
  );
}
