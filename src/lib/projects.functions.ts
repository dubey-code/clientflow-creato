import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { decryptRow, encrypt } from "./crypto.server";
import { generateOfferAI } from "./offer-ai.server";
import { generateBriefQuestionsAI } from "./brief-ai.server";
import { clarifyAI } from "./clarify-ai.server";
import { pruneHiddenAnswers } from "./conditions";
import { assertNoPII, fillDeep, maskDeep, maskPII, type ClientPII } from "./pii";
import type { Answers, Offer, Question } from "./types";

const questionSchema = z.object({
  id: z.string().min(1).max(60),
  label: z.string().trim().min(1).max(300),
  type: z.enum(["text", "textarea", "select", "checkbox"]),
  options: z.array(z.string().max(200)).max(30).optional(),
  required: z.boolean().optional(),
  showIf: z.object({ questionId: z.string().min(1).max(60), values: z.array(z.string().max(200)).min(1).max(30) }).optional(),
});
const clientSchema = z.object({
  name: z.string().trim().max(200).optional().default(""),
  phone: z.string().trim().max(40).optional().default(""),
  email: z.string().trim().max(255).optional().default(""),
  company: z.string().trim().max(200).optional().default(""),
});

function token() {
  const b = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Доступ только для администратора");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Final leak check + audit record of exactly what goes to the AI. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function guardAI(sb: any, projectId: string | null, kind: string, payload: unknown, pii: ClientPII) {
  const text = JSON.stringify(payload, null, 2);
  try {
    assertNoPII(text, pii);
  } catch (e) {
    await sb.from("ai_audit").insert({ project_id: projectId, kind, masked_input: "[заблокировано: обнаружены ПДн, текст не сохранён]", pii_check_passed: false });
    throw e;
  }
  await sb.from("ai_audit").insert({ project_id: projectId, kind, masked_input: text.slice(0, 50000), pii_check_passed: true });
}

/** Shared generation: mask -> AI -> store offer with placeholders. */
async function runGeneration(projectId: string) {
  const sb = await admin();
  const { data: p } = await sb.from("projects").select("*").eq("id", projectId).single();
  const { data: piiRow } = await sb.from("client_pii").select("*").eq("project_id", projectId).maybeSingle();
  if (!p) throw new Error("Проект не найден");
  const pii = await decryptRow(piiRow);
  try {
    const input = {
      title: maskPII(p.title, pii),
      description: maskPII(p.description, pii),
      questions: maskDeep(p.questions as Question[], pii),
      answers: maskDeep((p.answers ?? {}) as Answers, pii),
    };
    await guardAI(sb, projectId, "offer", input, pii);
    const offer = await generateOfferAI(input);
    // Strip anything that slipped into the AI output too
    const safe = maskDeep(offer, pii);
    await sb.from("projects").update({ offer: safe, status: "ready", updated_at: new Date().toISOString() }).eq("id", projectId);
  } catch (e) {
    await sb.from("projects").update({ status: "error" }).eq("id", projectId);
    throw e;
  }
}

// ---------- Admin ----------

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { admin: !!data };
  });

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: projects, error } = await context.supabase
      .from("projects")
      .select("id,title,status,brief_token,offer_token,created_at,submitted_at,answers,questions")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: piis } = await context.supabase.from("client_pii").select("*");
    const byId = new Map((piis ?? []).map((r) => [r.project_id, r]));
    return Promise.all(
      (projects ?? []).map(async (p) => {
        const pii = await decryptRow(byId.get(p.id));
        const qs = (p.questions ?? []) as Question[];
        const ans = (p.answers ?? {}) as Answers;
        return {
          id: p.id,
          title: p.title,
          status: p.status,
          brief_token: p.brief_token,
          offer_token: p.offer_token,
          created_at: p.created_at,
          submitted_at: p.submitted_at,
          client: pii,
          answeredCount: qs.filter((q) => { const a = ans[q.id]; return Array.isArray(a) ? a.length : !!a; }).length,
          questionCount: qs.length,
        };
      }),
    );
  });

export const generateBriefQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ title: z.string().trim().min(1).max(200), description: z.string().max(5000), client: clientSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    // Mask client PII before anything reaches the AI.
    const input = { title: maskPII(data.title, data.client), description: maskPII(data.description, data.client) };
    await guardAI(context.supabase, null, "brief_questions", input, data.client);
    return generateBriefQuestionsAI(input);
  });

export const clarifyProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), description: z.string().max(5000), notes: z.string().max(10000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: p, error } = await context.supabase.from("projects").select("title,questions,answers").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const { data: row } = await context.supabase.from("client_pii").select("*").eq("project_id", data.id).maybeSingle();
    const client = await decryptRow(row);
    const qs = p.questions as Question[];
    const ans = (p.answers ?? {}) as Answers;
    const answersText = [
      ...qs.filter((q) => ans[q.id] !== undefined).map((q) => {
        const a = ans[q.id];
        return `- ${q.label}: ${Array.isArray(a) ? a.join(", ") : a || "—"}`;
      }),
      data.notes ? `Дополнительно:\n${data.notes}` : "",
    ].join("\n");
    // Mask client PII before anything reaches the AI.
    const input = { title: maskPII(p.title, client), description: maskPII(data.description, client), answersText: maskPII(answersText, client) };
    await guardAI(context.supabase, data.id, "clarify", input, client);
    return clarifyAI(input);
  });

export const listAiAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: rows, error } = await context.supabase.from("ai_audit").select("id,kind,masked_input,pii_check_passed,created_at").eq("project_id", data.id).order("created_at", { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ title: z.string().trim().min(1).max(200), description: z.string().max(5000), client: clientSchema, questions: z.array(questionSchema).min(1).max(50) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: p, error } = await context.supabase
      .from("projects")
      .insert({ title: data.title, description: data.description, questions: data.questions, brief_token: token(), offer_token: token(), created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const { error: e2 } = await context.supabase.from("client_pii").insert({
      project_id: p.id,
      name_enc: await encrypt(data.client.name),
      phone_enc: await encrypt(data.client.phone),
      email_enc: await encrypt(data.client.email),
      company_enc: await encrypt(data.client.company),
    });
    if (e2) throw new Error(e2.message);
    return { id: p.id };
  });

export const getProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: p, error } = await context.supabase.from("projects").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const { data: row } = await context.supabase.from("client_pii").select("*").eq("project_id", data.id).maybeSingle();
    return {
      ...p,
      questions: p.questions as Question[],
      answers: (p.answers ?? null) as Answers | null,
      offer: (p.offer ?? null) as Offer | null,
      client: await decryptRow(row),
    };
  });

export const updateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      title: z.string().trim().min(1).max(200),
      description: z.string().max(5000),
      questions: z.array(questionSchema).min(1).max(50),
      client: clientSchema,
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await context.supabase.from("projects").update({ title: data.title, description: data.description, questions: data.questions, updated_at: new Date().toISOString() }).eq("id", data.id);
    await context.supabase.from("client_pii").upsert({
      project_id: data.id,
      name_enc: await encrypt(data.client.name),
      phone_enc: await encrypt(data.client.phone),
      email_enc: await encrypt(data.client.email),
      company_enc: await encrypt(data.client.company),
      updated_at: new Date().toISOString(),
    });
    return { ok: true };
  });

export const saveOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), offer: z.any() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await context.supabase.from("projects").update({ offer: data.offer, status: "ready" }).eq("id", data.id);
    return { ok: true };
  });

export const regenerateOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await runGeneration(data.id);
    return { ok: true };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await context.supabase.from("projects").delete().eq("id", data.id);
    return { ok: true };
  });

// ---------- Public (by secret token) ----------

const tokenSchema = z.object({ token: z.string().regex(/^[a-f0-9]{36}$/) });

export const getBrief = createServerFn({ method: "GET" })
  .inputValidator((d) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: p } = await sb.from("projects").select("title,questions,status,offer_token").eq("brief_token", data.token).maybeSingle();
    if (!p) return null;
    // No personal data is returned to the public page.
    return { title: p.title, questions: p.questions as Question[], submitted: p.status !== "created", offerToken: p.status === "ready" ? p.offer_token : null };
  });

export const submitBrief = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    tokenSchema
      .extend({
        answers: z.record(z.string(), z.union([z.string().max(5000), z.array(z.string().max(200)).max(30)])),
        contacts: clientSchema.extend({ email: z.union([z.literal(""), z.string().trim().email().max(255)]).optional().default("") }),
        consent: z.literal(true),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: p } = await sb.from("projects").select("id,status,offer_token,questions").eq("brief_token", data.token).maybeSingle();
    if (!p) throw new Error("Бриф не найден");
    if (p.status === "ready" || p.status === "submitted") return { offerToken: p.offer_token };

    // Encrypt contact data; only overwrite fields the client filled in.
    const { data: existing } = await sb.from("client_pii").select("*").eq("project_id", p.id).maybeSingle();
    const c = data.contacts;
    await sb.from("client_pii").upsert({
      project_id: p.id,
      name_enc: c.name ? await encrypt(c.name) : existing?.name_enc ?? null,
      phone_enc: c.phone ? await encrypt(c.phone) : existing?.phone_enc ?? null,
      email_enc: c.email ? await encrypt(c.email) : existing?.email_enc ?? null,
      company_enc: c.company ? await encrypt(c.company) : existing?.company_enc ?? null,
      updated_at: new Date().toISOString(),
    });
    const now = new Date().toISOString();
    await sb.from("projects").update({ answers: pruneHiddenAnswers(p.questions as Question[], data.answers), status: "submitted", submitted_at: now, consent_at: now }).eq("id", p.id);
    try {
      await runGeneration(p.id);
    } catch (e) {
      console.error(e);
    }
    return { offerToken: p.offer_token };
  });

export const getOffer = createServerFn({ method: "GET" })
  .inputValidator((d) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: p } = await sb.from("projects").select("id,title,status,offer").eq("offer_token", data.token).maybeSingle();
    if (!p) return null;
    if (!p.offer) return { title: p.title, status: p.status, offer: null, contact: null };
    const { data: row } = await sb.from("client_pii").select("*").eq("project_id", p.id).maybeSingle();
    const pii = await decryptRow(row);
    // Decryption and substitution happen only here, at display time; the stored offer keeps placeholders.
    return { title: p.title, status: p.status, offer: fillDeep(p.offer as Offer, pii), contact: pii };
  });

export const getBriefSummary = createServerFn({ method: "GET" })
  .inputValidator((d) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: p } = await sb.from("projects").select("id,title,questions,answers,submitted_at,consent_at").eq("offer_token", data.token).maybeSingle();
    if (!p || !p.answers) return null;
    const { data: row } = await sb.from("client_pii").select("*").eq("project_id", p.id).maybeSingle();
    const pii = await decryptRow(row);
    const qs = p.questions as Question[];
    const ans = p.answers as Answers;
    return {
      title: p.title,
      submittedAt: p.submitted_at,
      consentAt: p.consent_at,
      items: qs.filter((q) => ans[q.id] !== undefined).map((q) => ({ label: q.label, answer: ans[q.id]! })),
      contact: pii,
    };
  });
