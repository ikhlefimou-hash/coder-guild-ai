import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Bot, Loader2, Plus, Send, Trash2, User2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Chat { id: string; title: string; updated_at: string; }
interface Msg { id: string; role: "user" | "assistant"; content: string; created_at: string; }

export default function AiChat() {
  const { user } = useAuth();
  const { t, dir } = useI18n();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadChats = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("ai_chats")
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setChats(data ?? []);
    if (!activeId && data && data.length > 0) setActiveId(data[0].id);
  };

  const loadMessages = async (chatId: string) => {
    const { data } = await supabase
      .from("ai_messages")
      .select("id, role, content, created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });
    setMessages((data ?? []) as Msg[]);
  };

  useEffect(() => { loadChats(); }, [user]);
  useEffect(() => { if (activeId) loadMessages(activeId); else setMessages([]); }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    const ch = supabase
      .channel(`ai-${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ai_messages", filter: `chat_id=eq.${activeId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const newChat = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("ai_chats")
      .insert({ user_id: user.id, title: t("ai.newChat") })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setChats((p) => [data as Chat, ...p]);
    setActiveId(data.id);
  };

  const deleteChat = async (id: string) => {
    const { error } = await supabase.from("ai_chats").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setChats((p) => p.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const send = async () => {
    if (!user || !draft.trim()) return;
    let chatId = activeId;
    if (!chatId) {
      const { data, error } = await supabase
        .from("ai_chats")
        .insert({ user_id: user.id, title: draft.slice(0, 40) })
        .select()
        .single();
      if (error) { toast.error(error.message); return; }
      chatId = data.id;
      setChats((p) => [data as Chat, ...p]);
      setActiveId(chatId);
    }
    const text = draft.trim();
    setDraft("");
    setSending(true);

    const { data: userMsg, error: e1 } = await supabase.from("ai_messages")
      .insert({ chat_id: chatId, user_id: user.id, role: "user", content: text })
      .select().single();
    if (e1) { setSending(false); toast.error(e1.message); return; }
    setMessages((p) => [...p, userMsg as Msg]);

    const history = [...messages, userMsg as Msg].map((m) => ({ role: m.role, content: m.content }));
    const { data: aiData, error: aiErr } = await supabase.functions.invoke("ai-chat", {
      body: { messages: history },
    });
    if (aiErr || !aiData?.reply) {
      setSending(false);
      toast.error(aiData?.error ?? aiErr?.message ?? t("ai.failed"));
      return;
    }
    await supabase.from("ai_messages")
      .insert({ chat_id: chatId, user_id: user.id, role: "assistant", content: aiData.reply });
    await supabase.from("ai_chats").update({ updated_at: new Date().toISOString() }).eq("id", chatId);
    setSending(false);
  };

  return (
    <div className="container py-4" dir={dir}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[260px_1fr]">
        <Card className="md:h-[calc(100vh-8rem)]">
          <CardContent className="flex h-full flex-col gap-2 p-3">
            <Button onClick={newChat} className="bg-gradient-primary shadow-glow">
              <Plus className="ml-1 h-4 w-4" /> {t("ai.newChat")}
            </Button>
            <ScrollArea className="flex-1">
              <div className="space-y-1">
                {chats.map((c) => (
                  <div key={c.id} className={`flex items-center justify-between gap-1 rounded-md p-2 text-sm hover:bg-muted ${activeId === c.id ? "bg-muted" : ""}`}>
                    <button onClick={() => setActiveId(c.id)} className="flex-1 truncate text-right">{c.title}</button>
                    <Button variant="ghost" size="icon" onClick={() => deleteChat(c.id)} aria-label={t("common.delete")}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {chats.length === 0 && <p className="p-2 text-xs text-muted-foreground">{t("ai.noChats")}</p>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex flex-col md:h-[calc(100vh-8rem)]">
          <CardContent className="flex h-full flex-col gap-2 p-3">
            <ScrollArea className="flex-1" ref={scrollRef as any}>
              <div ref={scrollRef} className="space-y-3 p-2">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
                      <Bot className="h-8 w-8" />
                    </div>
                    <h2 className="text-lg font-bold">{t("ai.heroTitle")}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{t("ai.heroSub")}</p>
                    <div className="mt-4 grid w-full max-w-md gap-2 text-xs">
                      <div className="rounded-md border bg-muted/40 p-2">{t("ai.s1")}</div>
                      <div className="rounded-md border bg-muted/40 p-2">{t("ai.s2")}</div>
                      <div className="rounded-md border bg-muted/40 p-2">{t("ai.s3")}</div>
                    </div>
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {m.role === "user" ? <User2 className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-primary/10" : "bg-muted"}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> {t("ai.typing")}
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={t("ai.composer")}
                rows={2}
                className="resize-none"
              />
              <Button onClick={send} disabled={sending || !draft.trim()} className="bg-gradient-primary shadow-glow">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
