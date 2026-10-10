// Pure helpers for hiding personal data before AI and substituting it back after.

export type ClientPII = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
};

export const PLACEHOLDERS = {
  name: "{{CLIENT_NAME}}",
  phone: "{{PHONE}}",
  email: "{{EMAIL}}",
  company: "{{COMPANY}}",
} as const;

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// Phone-like sequences: optional +, 10–15 digits with spaces, dashes, brackets.
const PHONE_RE = /(?:\+?\d[\s\-().]*){10,15}\d?/g;

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Removes known client PII and any email/phone patterns from text. */
export function maskPII(text: string, pii: ClientPII = {}): string {
  if (!text) return text;
  let out = text;
  const known: [keyof ClientPII, string | null | undefined][] = [
    ["email", pii.email],
    ["phone", pii.phone],
    ["company", pii.company],
    ["name", pii.name],
  ];
  for (const [key, value] of known) {
    const v = value?.trim();
    if (!v || v.length < 2) continue;
    out = out.replace(new RegExp(escapeRe(v), "gi"), PLACEHOLDERS[key]);
    if (key === "name") {
      // Also hide individual parts of a full name (surname, first name, patronymic)
      for (const part of v.split(/\s+/)) {
        if (part.length >= 3) {
          out = out.replace(new RegExp(`(?<![\\p{L}])${escapeRe(part)}(?![\\p{L}])`, "giu"), PLACEHOLDERS.name);
        }
      }
    }
  }
  out = out.replace(EMAIL_RE, PLACEHOLDERS.email);
  out = out.replace(PHONE_RE, (m) => (m.replace(/\D/g, "").length >= 10 ? PLACEHOLDERS.phone : m));
  return out;
}

/** Deeply masks all strings in a JSON-like value. */
export function maskDeep<T>(value: T, pii: ClientPII = {}): T {
  if (typeof value === "string") return maskPII(value, pii) as T;
  if (Array.isArray(value)) return value.map((v) => maskDeep(v, pii)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, maskDeep(v, pii)]),
    ) as T;
  }
  return value;
}

/** Substitutes placeholders with real values (or neutral fallbacks). */
export function fillPlaceholders(text: string, pii: ClientPII = {}): string {
  if (!text) return text;
  return text
    .replaceAll(PLACEHOLDERS.name, pii.name?.trim() || "клиент")
    .replaceAll(PLACEHOLDERS.company, pii.company?.trim() || "вашей компании")
    .replaceAll(PLACEHOLDERS.phone, pii.phone?.trim() || "")
    .replaceAll(PLACEHOLDERS.email, pii.email?.trim() || "");
}

export function fillDeep<T>(value: T, pii: ClientPII = {}): T {
  if (typeof value === "string") return fillPlaceholders(value, pii) as T;
  if (Array.isArray(value)) return value.map((v) => fillDeep(v, pii)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, fillDeep(v, pii)]),
    ) as T;
  }
  return value;
}

/** Final guard before AI: throws if any client PII or email/phone pattern remains. */
export function assertNoPII(text: string, pii: ClientPII = {}): void {
  const t = text ?? "";
  const lower = t.toLowerCase();
  const leaks: string[] = [];
  for (const [key, value] of Object.entries(pii) as [keyof ClientPII, string | null | undefined][]) {
    const v = value?.trim();
    if (!v || v.length < 2) continue;
    const parts = key === "name" ? v.split(/\s+/).filter((p) => p.length >= 3) : [v];
    if (parts.some((p) => key === "name" ? new RegExp(`(?<![\\p{L}])${escapeRe(p)}(?![\\p{L}])`, "iu").test(t) : lower.includes(p.toLowerCase()))) leaks.push(key);
  }
  if (new RegExp(EMAIL_RE.source).test(t)) leaks.push("email-pattern");
  for (const m of t.match(PHONE_RE) ?? []) if (m.replace(/\D/g, "").length >= 10) { leaks.push("phone-pattern"); break; }
  if (leaks.length) throw new Error("Отправка в ИИ заблокирована: в тексте обнаружены персональные данные");
}
