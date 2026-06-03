// End-to-end encryption helpers using Web Crypto (RSA-OAEP + AES-GCM).
// Private key is stored in localStorage on the user's device only.
// Public key is published to profiles.public_key.

import { supabase } from "@/integrations/supabase/client";

const PRIV_KEY_PREFIX = "devhub:privkey:";

function b64encode(buf: ArrayBufferLike): string {
  const bytes = new Uint8Array(buf as ArrayBuffer);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64decode(s: string): ArrayBuffer {
  const bin = atob(s);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr.buffer;
}

async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );
}

async function exportPublicJwk(key: CryptoKey) {
  return JSON.stringify(await crypto.subtle.exportKey("jwk", key));
}
async function exportPrivateJwk(key: CryptoKey) {
  return JSON.stringify(await crypto.subtle.exportKey("jwk", key));
}
async function importPublicJwk(jwkStr: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk", JSON.parse(jwkStr),
    { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"],
  );
}
async function importPrivateJwk(jwkStr: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk", JSON.parse(jwkStr),
    { name: "RSA-OAEP", hash: "SHA-256" }, true, ["decrypt"],
  );
}

/** Ensure the current user has a key pair: private in localStorage, public in profiles.public_key. */
export async function ensureUserKeys(userId: string): Promise<{ privateKey: CryptoKey; publicKeyJwk: string } | null> {
  try {
    const stored = localStorage.getItem(PRIV_KEY_PREFIX + userId);
    const { data: profile } = await supabase
      .from("profiles").select("public_key").eq("id", userId).maybeSingle();
    const publishedPub = (profile as any)?.public_key as string | null;

    if (stored && publishedPub) {
      const privateKey = await importPrivateJwk(stored);
      return { privateKey, publicKeyJwk: publishedPub };
    }

    // Generate fresh pair, publish public, store private locally.
    const pair = await generateKeyPair();
    const pubJwk = await exportPublicJwk(pair.publicKey);
    const privJwk = await exportPrivateJwk(pair.privateKey);
    localStorage.setItem(PRIV_KEY_PREFIX + userId, privJwk);
    await supabase.from("profiles").update({ public_key: pubJwk } as any).eq("id", userId);
    return { privateKey: pair.privateKey, publicKeyJwk: pubJwk };
  } catch (e) {
    console.error("ensureUserKeys failed", e);
    return null;
  }
}

export async function getPeerPublicKey(peerId: string): Promise<string | null> {
  const { data } = await supabase.from("profiles").select("public_key").eq("id", peerId).maybeSingle();
  return (data as any)?.public_key ?? null;
}

export interface EncryptedPayload {
  encrypted_content: string;
  iv: string;
  key_for_sender: string;
  key_for_recipient: string;
}

export async function encryptForBoth(
  plaintext: string,
  senderPubJwk: string,
  recipientPubJwk: string,
): Promise<EncryptedPayload> {
  const aesKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(plaintext);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, enc);
  const rawAes = await crypto.subtle.exportKey("raw", aesKey);

  const senderPub = await importPublicJwk(senderPubJwk);
  const recipientPub = await importPublicJwk(recipientPubJwk);
  const wrappedSender = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, senderPub, rawAes);
  const wrappedRecipient = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, recipientPub, rawAes);

  return {
    encrypted_content: b64encode(ct),
    iv: b64encode(iv.buffer),
    key_for_sender: b64encode(wrappedSender),
    key_for_recipient: b64encode(wrappedRecipient),
  };
}

export async function decryptMessage(
  payload: { encrypted_content: string; iv: string; wrappedKey: string },
  privateKey: CryptoKey,
): Promise<string> {
  const rawAes = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    b64decode(payload.wrappedKey),
  );
  const aesKey = await crypto.subtle.importKey("raw", rawAes, { name: "AES-GCM" }, false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64decode(payload.iv) },
    aesKey,
    b64decode(payload.encrypted_content),
  );
  return new TextDecoder().decode(pt);
}
