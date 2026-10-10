import type { Answers, Offer, Question } from "./types";

// Input to this function must already be masked: no personal data reaches the AI.
export async function generateOfferAI(input: {
  title: string;
  description: string;
  questions: Question[];
  answers: Answers;
}): Promise<Offer> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const qa = input.questions
    .map((q) => {
      const a = input.answers[q.id];
      const v = Array.isArray(a) ? a.join(", ") : a;
      return `- ${q.label}: ${v || "—"}`;
    })
    .join("\n");

  const prompt = `Проект: ${input.title}
Описание от исполнителя: ${input.description || "—"}

Ответы клиента на бриф:
${qa}

Составь убедительное коммерческое предложение от IT-разработчика. Обращайся к клиенту через метку {{CLIENT_NAME}}, компанию обозначай {{COMPANY}}. Никогда не придумывай имена, телефоны или email. Цены в рублях, реалистичные для рынка РФ, с учётом бюджета клиента.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "Ты опытный менеджер IT-студии. Пишешь кратко, конкретно и по-русски." },
        { role: "user", content: prompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "offer",
            description: "Коммерческое предложение",
            parameters: {
              type: "object",
              properties: {
                headline: { type: "string" },
                subtitle: { type: "string" },
                understanding: { type: "string", description: "Как мы поняли задачу, 2-4 предложения" },
                solution: { type: "array", items: { type: "object", properties: { title: { type: "string" }, text: { type: "string" } }, required: ["title", "text"] } },
                stages: { type: "array", items: { type: "object", properties: { title: { type: "string" }, duration: { type: "string" }, text: { type: "string" } }, required: ["title", "duration", "text"] } },
                price: {
                  type: "object",
                  properties: {
                    total: { type: "string" },
                    items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, price: { type: "string" } }, required: ["name", "price"] } },
                  },
                  required: ["total", "items"],
                },
                why: { type: "array", items: { type: "string" } },
                cta: { type: "string" },
              },
              required: ["headline", "subtitle", "understanding", "solution", "stages", "price", "why", "cta"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "offer" } },
    }),
  });
  if (!res.ok) {
    console.error("AI error", res.status, await res.text());
    throw new Error(res.status === 429 ? "Слишком много запросов, попробуйте позже" : res.status === 402 ? "Закончились кредиты ИИ" : "Ошибка генерации");
  }
  const json = (await res.json()) as { choices?: { message?: { tool_calls?: { function: { arguments: string } }[] } }[] };
  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function.arguments;
  if (!args) throw new Error("Пустой ответ ИИ");
  return JSON.parse(args) as Offer;
}
