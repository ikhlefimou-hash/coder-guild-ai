import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Search, ArrowRight, Paperclip, FileIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { ensureUserKeys, getPeerPublicKey, encryptForBoth, decryptMessage } from "@/lib/crypto";
import VerifiedBadge from "@/components/VerifiedBadge";

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean | null;
}
interface DM {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string | null;
  encrypted_content: string | null;
  iv: string | null;
  key_for_sender: string | null;
  key_for_recipient: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  created_at: string;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME = [
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf", "text/plain", "text/csv",
  "application/zip", "application/x-zip-compressed",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "audio/mpeg", "audio/wav", "audio/ogg",
  "video/mp4", "video/webm",
];
const BLOCKED_EXT = /\.(exe|bat|cmd|sh|ps1|msi|app|dmg|jar|js|mjs|cjs|html?|php|py|rb|dll|so|apk|com|scr|vbs|lnk)$/i;

export default function Messages() {
  const { user } = useAuth();
  const { t, dir } = useI18n();
  const [params, setParams] = useSearchParams();
  const peerId = params.get("with");

  const [conversations, setConversations] = useState<{ peer: Profile; last: DM; unread: number }[]>([]);
  const [peer, setPeer] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<DM[]>([]);
  const [decrypted, setDecrypted] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const privateKeyRef = useRef<CryptoKey | null>(null);
  const myPubRef = useRef<string | null>(null);

  // Ensure key pair on mount
  useEffect(() => {
    if (!user) return;
    ensureUserKeys(user.id).then((k) => {
      if (k) { privateKeyRef.current = k.privateKey; myPubRef.current = k.publicKeyJwk; }
    });
  }, [user?.id]);

  const tryDecrypt = useCallback(async (m: DM) => {
    if (!user || !privateKeyRef.current) return;
    if (decrypted[m.id] !== undefined) return;
    if (!m.encrypted_content || !m.iv) return;
    const wrappedKey = m.sender_id === user.id ? m.key_for_sender : m.key_for_recipient;
    if (!wrappedKey) return;
    try {
      const txt = await decryptMessage(
        { encrypted_content: m.encrypted_content, iv: m.iv, wrappedKey },
        privateKeyRef.current,
      );
      setDecrypted((p) => ({ ...p, [m.id]: txt }));
    } catch (e) {
      setDecrypted((p) => ({ ...p, [m.id]: t("msg.cannotDecrypt") }));
    }
  }, [user?.id, decrypted, t]);

  useEffect(() => {
    messages.forEach((m) => { void tryDecrypt(m); });
  }, [messages, tryDecrypt]);

  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    const { data: dms } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(200);
    if (!dms) return;
    const byPeer = new Map<string, { last: DM; unread: number }>();
    for (const m of dms as unknown as DM[]) {
      const pid = m.sender_id === user.id ? m.recipient_id : m.sender_id;
      if (!byPeer.get(pid)) byPeer.set(pid, { last: m, unread: 0 });
    }
    const { data: unreadRows } = await supabase
      .from("direct_messages").select("sender_id")
      .eq("recipient_id", user.id).is("read_at", null);
    for (const r of unreadRows ?? []) {
      const cur = byPeer.get((r as any).sender_id);
      if (cur) cur.unread += 1;
    }
    const ids = Array.from(byPeer.keys());
    if (ids.length === 0) return setConversations([]);
    const { data: profs } = await supabase
      .from("profiles").select("id,username,full_name,avatar_url,is_verified").in("id", ids);
    const list = ids.map((pid) => ({
      peer: (profs?.find((p: any) => p.id === pid) as Profile) ?? { id: pid, username: pid, full_name: null, avatar_url: null },
      last: byPeer.get(pid)!.last,
      unread: byPeer.get(pid)!.unread,
    }));
    list.sort((a, b) => +new Date(b.last.created_at) - +new Date(a.last.created_at));
    setConversations(list);
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    loadConversations();
    const ch = supabase
      .channel(`dm-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (payload) => {
        const m = payload.new as DM;
        if (m.sender_id !== user.id && m.recipient_id !== user.id) return;
        if (peerId && (m.sender_id === peerId || m.recipient_id === peerId)) {
          setMessages((prev) => prev.find((x) => x.id === m.id) ? prev : [...prev, m]);
          if (m.recipient_id === user.id) {
            supabase.from("direct_messages").update({ read_at: new Date().toISOString() }).eq("id", m.id);
          }
        }
        loadConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, peerId, loadConversations]);

  useEffect(() => {
    if (!user || !peerId) { setPeer(null); setMessages([]); return; }
    (async () => {
      const { data: p } = await supabase
        .from("profiles").select("id,username,full_name,avatar_url,is_verified")
        .eq("id", peerId).maybeSingle();
      setPeer(p as Profile | null);
      const { data: msgs } = await supabase
        .from("direct_messages").select("*")
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      setMessages((msgs ?? []) as unknown as DM[]);
      await supabase.from("direct_messages").update({ read_at: new Date().toISOString() })
        .eq("sender_id", peerId).eq("recipient_id", user.id).is("read_at", null);
    })();
  }, [user?.id, peerId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, decrypted]);

  const sendText = async () => {
    if (!user || !peerId || !text.trim()) return;
    const content = text.trim();
    setText("");
    const peerPub = await getPeerPublicKey(peerId);
    if (peerPub && myPubRef.current) {
      try {
        const enc = await encryptForBoth(content, myPubRef.current, peerPub);
        const { error } = await supabase.from("direct_messages").insert({
          sender_id: user.id, recipient_id: peerId,
          encrypted_content: enc.encrypted_content,
          iv: enc.iv,
          key_for_sender: enc.key_for_sender,
          key_for_recipient: enc.key_for_recipient,
        } as any);
        if (error) toast.error(t("msg.sendFail"));
        return;
      } catch (e) {
        console.error(e);
      }
    }
    toast.warning(t("msg.peerNoKey"));
    const { error } = await supabase.from("direct_messages").insert({
      sender_id: user.id, recipient_id: peerId, content,
    } as any);
    if (error) toast.error(t("msg.sendFail"));
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !user || !peerId) return;
    if (f.size > MAX_FILE_SIZE) {
      const sizeMB = (f.size / (1024 * 1024)).toFixed(2);
      const maxMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
      toast.error(t("msg.errSizeDetail", { size: `${sizeMB}MB`, max: `${maxMB}MB`, code: "ERR_FILE_TOO_LARGE" }));
      return;
    }
    const extMatch = f.name.match(/\.[^.]+$/);
    const ext = extMatch ? extMatch[0].toLowerCase() : "unknown";
    if (BLOCKED_EXT.test(f.name)) {
      toast.error(t("msg.errTypeDetail", { ext, mime: f.type || "unknown", code: "ERR_FILE_TYPE_BLOCKED" }));
      return;
    }
    if (f.type && !ALLOWED_MIME.includes(f.type)) {
      toast.error(t("msg.errTypeDetail", { ext, mime: f.type, code: "ERR_FILE_TYPE_BLOCKED" }));
      return;
    }
    setUploading(true);
    try {
      const path = `${user.id}/${Date.now()}_${f.name.replace(/[^\w.\-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("chat-files").upload(path, f, { upsert: false });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("chat-files").createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl ?? null;
      if (!url) throw new Error("no url");
      const { error } = await supabase.from("direct_messages").insert({
        sender_id: user.id, recipient_id: peerId,
        attachment_url: url, attachment_name: f.name, attachment_type: f.type || "application/octet-stream",
      } as any);
      if (error) throw error;
    } catch (err) {
      console.error(err); toast.error(t("msg.attachFailed"));
    } finally { setUploading(false); }
  };

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const tmr = setTimeout(async () => {
      const { data } = await supabase.from("profiles")
        .select("id,username,full_name,avatar_url,is_verified")
        .or(`username.ilike.%${search}%,full_name.ilike.%${search}%`)
        .neq("id", user?.id ?? "").limit(10);
      setSearchResults((data ?? []) as Profile[]);
    }, 250);
    return () => clearTimeout(tmr);
  }, [search, user?.id]);

  const initials = (p: Profile) => (p.full_name || p.username || "?").slice(0, 2);
  const sideClass = dir === "rtl" ? "md:border-l" : "md:border-r";

  const renderContent = (m: DM) => {
    if (m.attachment_url) {
      const isImg = (m.attachment_type ?? "").startsWith("image/");
      if (isImg) {
        return <a href={m.attachment_url} target="_blank" rel="noreferrer">
          <img src={m.attachment_url} alt={m.attachment_name ?? "attachment"} className="max-h-60 rounded-md" />
        </a>;
      }
      return <a href={m.attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 underline">
        <FileIcon className="h-4 w-4" />
        <span className="truncate max-w-[200px]">{m.attachment_name ?? "file"}</span>
      </a>;
    }
    if (m.encrypted_content) return decrypted[m.id] ?? "…";
    return m.content ?? "";
  };

  return (
    <div className="flex h-[calc(100dvh-3.5rem)]" dir={dir}>
      <aside className={`${peer ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col md:w-72 ${sideClass} bg-card`}>
        <div className="border-b p-3">
          <div className="relative">
            <Search className={`absolute ${dir === "rtl" ? "right-2" : "left-2"} top-2.5 h-4 w-4 text-muted-foreground`} />
            <Input placeholder={t("msg.searchUser")} value={search} onChange={(e) => setSearch(e.target.value)}
              className={dir === "rtl" ? "pr-8" : "pl-8"} />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {searchResults.length > 0 ? (
            <div className="p-2">
              <p className="px-2 pb-1 text-xs text-muted-foreground">{t("common.searchResults")}</p>
              {searchResults.map((p) => (
                <button key={p.id} onClick={() => { setParams({ with: p.id }); setSearch(""); }}
                  className="flex w-full items-center gap-2 rounded p-2 hover:bg-accent">
                  <Avatar className="h-8 w-8"><AvatarImage src={p.avatar_url ?? undefined} /><AvatarFallback>{initials(p)}</AvatarFallback></Avatar>
                  <div className="flex-1 truncate">
                    <p className="flex items-center gap-1 truncate text-sm">{p.full_name || p.username}{p.is_verified && <VerifiedBadge />}</p>
                    <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (() => {
            const q = search.trim().toLowerCase();
            const filtered = q ? conversations.filter((c) =>
              (c.peer.username ?? "").toLowerCase().includes(q) ||
              (c.peer.full_name ?? "").toLowerCase().includes(q)) : conversations;
            if (filtered.length === 0)
              return <p className="p-4 text-center text-sm text-muted-foreground">{q ? t("msg.noMatches") : t("msg.noConvs")}</p>;
            return filtered.map((c) => (
              <button key={c.peer.id} onClick={() => setParams({ with: c.peer.id })}
                className={`flex w-full items-center gap-2 border-b p-3 hover:bg-accent ${peerId === c.peer.id ? "bg-accent" : ""}`}>
                <Avatar className="h-9 w-9"><AvatarImage src={c.peer.avatar_url ?? undefined} /><AvatarFallback>{initials(c.peer)}</AvatarFallback></Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <p className="flex items-center gap-1 truncate text-sm font-medium">
                      {c.peer.full_name || c.peer.username}{c.peer.is_verified && <VerifiedBadge />}
                    </p>
                    {c.unread > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{c.unread}</span>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.last.encrypted_content ? t("msg.encrypted") : c.last.attachment_name ?? c.last.content ?? ""}
                  </p>
                </div>
              </button>
            ));
          })()}
        </ScrollArea>
      </aside>

      <section className={`${peer ? "flex" : "hidden md:flex"} flex-1 flex-col`}>
        {!peer ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">{t("msg.pickConv")}</div>
        ) : (
          <>
            <header className="flex items-center gap-2 border-b p-3">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setParams({})} aria-label="back">
                <ArrowRight className={`h-5 w-5 ${dir === "rtl" ? "" : "rotate-180"}`} />
              </Button>
              <Avatar className="h-9 w-9"><AvatarImage src={peer.avatar_url ?? undefined} /><AvatarFallback>{initials(peer)}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate text-sm font-semibold">{peer.full_name || peer.username}{peer.is_verified && <VerifiedBadge />}</p>
                <p className="truncate text-xs text-muted-foreground">@{peer.username} · {t("msg.encrypted")}</p>
              </div>
            </header>
            <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-background/50 p-4">
              {messages.map((m) => {
                const mine = m.sender_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[75%] break-words rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {renderContent(m)}
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); sendText(); }}
              className="flex items-center gap-2 border-t p-3">
              <input ref={fileInputRef} type="file" className="hidden" onChange={onPickFile} />
              <Button type="button" size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={uploading} aria-label={t("msg.attach")}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </Button>
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("msg.composer")} className="flex-1" />
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
