import type { Clarification } from "./types";

// Input must already be masked: no personal data reaches the AI.
export async function clarifyAI(input: { title: string; description: string; answersText: string }): Promise<Clarification> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      instructions:
        "Ты опытный менеджер IT-студии. По описанию проекта и ответам клиента найди, каких деталей не хватает для точной оценки и коммерческого предложения, и сформулируй 3–8 уточняющих вопросов клиенту. Пиши по-русски, кратко. Не спрашивай персональные данные (ФИО, телефон, email). Метки вида {{CLIENT_NAME}} не раскрывай. Для type используй text, textarea, select или checkbox; options — только для select/checkbox, иначе пустой массив.",
      input: `Проект: ${input.title}\nОписание: ${input.description || "—"}\n\nОтветы клиента:\n${input.answersText || "—"}`,
      text: {
        format: {
          type: "json_schema",
          name: "clarification",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["missing", "questions"],
            properties: {
              missing: { type: "array", items: { type: "string" } },
              questions: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["label", "type", "options", "required"],
                  properties: {
                    label: { type: "string" },
                    type: { type: "string", enum: ["text", "textarea", "select", "checkbox"] },
                    options: { type: "array", items: { type: "string" } },
                    required: { type: "boolean" },
                  },
                },
              },
            },
          },
        },
      },
    }),
  });
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    console.error("AI error", res.status, body);
    let msg = "Ошибка генерации";
    try { msg = (JSON.parse(body) as { error?: { message?: string }; message?: string }).error?.message ?? JSON.parse(body).message ?? msg; } catch { /* keep default */ }
    if (res.status === 429) msg = "Слишком много запросов, попробуйте позже";
    if (res.status === 402) msg = "Закончились кредиты ИИ";
    throw new Error(msg);
  }

  // Consume the SSE stream and collect output text.
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  let failed: string | null = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const d = line.slice(5).trim();
      if (!d || d === "[DONE]") continue;
      try {
        const ev = JSON.parse(d) as { type?: string; delta?: string; response?: { error?: { message?: string } }; error?: { message?: string } };
        if (ev.type === "response.output_text.delta" && ev.delta) text += ev.delta;
        if (ev.type === "response.failed" || ev.type === "error") failed = ev.response?.error?.message ?? ev.error?.message ?? "Ошибка генерации";
      } catch { /* partial */ }
    }
  }
  if (failed) throw new Error(failed);
  if (!text.trim()) throw new Error("ИИ не вернул ответ");
  const parsed = JSON.parse(text) as Clarification;
  const ts = Date.now();
  return {
    missing: (parsed.missing ?? []).map((s) => s.slice(0, 300)).slice(0, 15),
    questions: (parsed.questions ?? []).filter((q) => q.label?.trim()).slice(0, 15).map((q, i) => ({
      id: `c${ts}_${i}`,
      label: q.label.trim().slice(0, 300),
      type: q.type,
      required: !!q.required,
      ...(q.type === "select" || q.type === "checkbox" ? { options: (q.options ?? []).slice(0, 30) } : {}),
    })),
  };
}
