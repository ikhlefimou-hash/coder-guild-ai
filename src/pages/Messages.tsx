import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Search } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}
interface DM {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
}

export default function Messages() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const peerId = params.get("with");

  const [conversations, setConversations] = useState<{ peer: Profile; last: DM; unread: number }[]>([]);
  const [peer, setPeer] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<DM[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversations list
  const loadConversations = async () => {
    if (!user) return;
    const { data: dms } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(200);
    if (!dms) return;
    const byPeer = new Map<string, { last: DM; unread: number }>();
    for (const m of dms as DM[]) {
      const pid = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      const cur = byPeer.get(pid);
      if (!cur) byPeer.set(pid, { last: m, unread: 0 });
    }
    // count unread
    const { data: unreadRows } = await supabase
      .from("direct_messages")
      .select("sender_id")
      .eq("recipient_id", user.id)
      .is("read_at", null);
    for (const r of unreadRows ?? []) {
      const cur = byPeer.get((r as any).sender_id);
      if (cur) cur.unread += 1;
    }
    const ids = Array.from(byPeer.keys());
    if (ids.length === 0) {
      setConversations([]);
      return;
    }
    const { data: profs } = await supabase
      .from("profiles")
      .select("id,username,full_name,avatar_url")
      .in("id", ids);
    const list = ids.map((pid) => ({
      peer: (profs?.find((p) => p.id === pid) as Profile) ?? { id: pid, username: pid, full_name: null, avatar_url: null },
      last: byPeer.get(pid)!.last,
      unread: byPeer.get(pid)!.unread,
    }));
    list.sort((a, b) => +new Date(b.last.created_at) - +new Date(a.last.created_at));
    setConversations(list);
  };

  // Realtime DM subscription
  useEffect(() => {
    if (!user) return;
    loadConversations();
    const ch = supabase
      .channel(`dm-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const m = payload.new as DM;
          if (m.sender_id !== user.id && m.recipient_id !== user.id) return;
          loadConversations();
          if (peerId && (m.sender_id === peerId || m.recipient_id === peerId)) {
            setMessages((prev) => [...prev, m]);
            if (m.recipient_id === user.id) {
              supabase.from("direct_messages").update({ read_at: new Date().toISOString() }).eq("id", m.id);
            }
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, peerId]);

  // Load peer + messages when peerId changes
  useEffect(() => {
    if (!user || !peerId) {
      setPeer(null);
      setMessages([]);
      return;
    }
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url")
        .eq("id", peerId)
        .maybeSingle();
      setPeer(p as Profile | null);
      const { data: msgs } = await supabase
        .from("direct_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true });
      setMessages((msgs ?? []) as DM[]);
      // mark unread as read
      await supabase
        .from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("sender_id", peerId)
        .eq("recipient_id", user.id)
        .is("read_at", null);
    })();
  }, [user?.id, peerId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    if (!user || !peerId || !text.trim()) return;
    const content = text.trim();
    setText("");
    const { error } = await supabase
      .from("direct_messages")
      .insert({ sender_id: user.id, recipient_id: peerId, content });
    if (error) toast.error("فشل إرسال الرسالة");
  };

  // user search
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url")
        .or(`username.ilike.%${search}%,full_name.ilike.%${search}%`)
        .neq("id", user?.id ?? "")
        .limit(10);
      setSearchResults((data ?? []) as Profile[]);
    }, 250);
    return () => clearTimeout(t);
  }, [search, user?.id]);

  const initials = (p: Profile) => (p.full_name || p.username || "?").slice(0, 2);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]" dir="rtl">
      {/* Sidebar list */}
      <aside className="flex w-72 shrink-0 flex-col border-l bg-card">
        <div className="border-b p-3">
          <div className="relative">
            <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن مستخدم لبدء محادثة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-8"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {searchResults.length > 0 ? (
            <div className="p-2">
              <p className="px-2 pb-1 text-xs text-muted-foreground">نتائج البحث</p>
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setParams({ with: p.id });
                    setSearch("");
                  }}
                  className="flex w-full items-center gap-2 rounded p-2 text-right hover:bg-accent"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={p.avatar_url ?? undefined} />
                    <AvatarFallback>{initials(p)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 truncate">
                    <p className="truncate text-sm">{p.full_name || p.username}</p>
                    <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (() => {
            const q = search.trim().toLowerCase();
            const filtered = q
              ? conversations.filter(
                  (c) =>
                    (c.peer.username ?? "").toLowerCase().includes(q) ||
                    (c.peer.full_name ?? "").toLowerCase().includes(q) ||
                    c.last.content.toLowerCase().includes(q),
                )
              : conversations;
            if (filtered.length === 0)
              return (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  {q ? "لا توجد نتائج مطابقة" : "لا توجد محادثات بعد"}
                </p>
              );
            return filtered.map((c) => (
              <button
                key={c.peer.id}
                onClick={() => setParams({ with: c.peer.id })}
                className={`flex w-full items-center gap-2 border-b p-3 text-right hover:bg-accent ${
                  peerId === c.peer.id ? "bg-accent" : ""
                }`}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={c.peer.avatar_url ?? undefined} />
                  <AvatarFallback>{initials(c.peer)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-medium">{c.peer.full_name || c.peer.username}</p>
                    {c.unread > 0 && (
                      <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                        {c.unread}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{c.last.content}</p>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </aside>

      {/* Chat area */}
      <section className="flex flex-1 flex-col">
        {!peer ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            اختر محادثة أو ابحث عن مستخدم لبدء محادثة جديدة
          </div>
        ) : (
          <>
            <header className="flex items-center gap-2 border-b p-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={peer.avatar_url ?? undefined} />
                <AvatarFallback>{initials(peer)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{peer.full_name || peer.username}</p>
                <p className="text-xs text-muted-foreground">@{peer.username}</p>
              </div>
            </header>
            <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-background/50 p-4">
              {messages.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                        mine ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                );
              })}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2 border-t p-3"
            >
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="اكتب رسالة..."
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={!text.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
