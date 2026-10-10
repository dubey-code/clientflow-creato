// AES-256-GCM encryption for personal data. Key lives only in server env.

async function getKey(): Promise<CryptoKey> {
  const secret = process.env["PII_ENCRYPTION_KEY"];
  if (!secret) throw new Error("PII_ENCRYPTION_KEY missing");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function toB64(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function fromB64(s: string) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

export async function encrypt(plain: string | null | undefined): Promise<string | null> {
  if (!plain || !plain.trim()) return null;
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain.trim())));
  return `${toB64(iv)}:${toB64(ct)}`;
}

export async function decrypt(enc: string | null | undefined): Promise<string | null> {
  if (!enc) return null;
  try {
    const [ivB, ctB] = enc.split(":");
    const key = await getKey();
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(ivB) }, key, fromB64(ctB));
    return new TextDecoder().decode(pt);
  } catch {
    return null;
  }
}

export type PiiRow = { name_enc: string | null; phone_enc: string | null; email_enc: string | null; company_enc: string | null };

export async function decryptRow(row: PiiRow | null | undefined) {
  return {
    name: await decrypt(row?.name_enc),
    phone: await decrypt(row?.phone_enc),
    email: await decrypt(row?.email_enc),
    company: await decrypt(row?.company_enc),
  };
}
