import type { Question } from "./types";

// Input to this function must already be masked: no personal data reaches the AI.
export async function generateBriefQuestionsAI(input: {
  title: string;
  description: string;
}): Promise<Question[]> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "Ты опытный менеджер IT-студии. Составляешь бриф для клиента: 6–10 конкретных вопросов, которые помогут оценить проект и подготовить коммерческое предложение. Пишешь по-русски, кратко и по делу. Никогда не спрашиваешь персональные данные (ФИО, телефон, email) — они собираются отдельно.",
        },
        {
          role: "user",
          content: `Проект: ${input.title}\nОписание задачи: ${input.description || "—"}\n\nСоставь вопросы брифа для клиента.`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "brief_questions",
            description: "Вопросы брифа",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string", description: "Текст вопроса" },
                      type: { type: "string", enum: ["text", "textarea", "select", "checkbox"] },
                      options: { type: "array", items: { type: "string" }, description: "Варианты ответа для select/checkbox" },
                      required: { type: "boolean" },
                    },
                    required: ["label", "type", "required"],
                  },
                },
              },
              required: ["questions"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "brief_questions" } },
    }),
  });
  if (!res.ok) {
    console.error("AI error", res.status, await res.text());
    throw new Error(res.status === 429 ? "Слишком много запросов, попробуйте позже" : res.status === 402 ? "Закончились кредиты ИИ" : "Ошибка генерации");
  }
  const json = (await res.json()) as { choices?: { message?: { tool_calls?: { function: { arguments: string } }[] } }[] };
  const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function.arguments;
  if (!args) throw new Error("Пустой ответ ИИ");
  const parsed = JSON.parse(args) as { questions: Omit<Question, "id">[] };
  const ts = Date.now();
  return parsed.questions
    .filter((q) => q.label?.trim())
    .slice(0, 20)
    .map((q, i) => ({
      id: `q${ts}_${i}`,
      label: q.label.trim().slice(0, 300),
      type: q.type,
      required: !!q.required,
      ...(q.type === "select" || q.type === "checkbox" ? { options: (q.options ?? []).slice(0, 30) } : {}),
    }));
}
