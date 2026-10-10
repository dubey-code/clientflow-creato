import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Lock, Plus, Sparkles, Trash2 } from "lucide-react";
import { generateBriefQuestions } from "@/lib/projects.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Question, QuestionType } from "@/lib/types";

export type ProjectFormValue = {
  title: string;
  description: string;
  client: { name: string; phone: string; email: string; company: string };
  questions: Question[];
};

const TYPE_LABEL: Record<QuestionType, string> = { text: "Строка", textarea: "Текст", select: "Выбор одного", checkbox: "Несколько вариантов" };

export function ProjectForm({ initial, submitLabel, onSubmit }: { initial: ProjectFormValue; submitLabel: string; onSubmit: (v: ProjectFormValue) => Promise<void> }) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const genQuestions = useServerFn(generateBriefQuestions);
  const generate = async () => {
    if (!v.title.trim()) { toast.error("Сначала заполните название проекта"); return; }
    setGenerating(true);
    try {
      const qs = await genQuestions({ data: { title: v.title, description: v.description, client: v.client } });
      if (!qs.length) throw new Error("ИИ не вернул вопросы");
      setV({ ...v, questions: qs });
      toast.success("Вопросы сгенерированы — отредактируйте их ниже");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка генерации");
    } finally {
      setGenerating(false);
    }
  };
  const setQ = (i: number, patch: Partial<Question>) => setV({ ...v, questions: v.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) });
  const move = (i: number, d: number) => {
    const qs = [...v.questions];
    const j = i + d;
    if (j < 0 || j >= qs.length) return;
    const tmp = qs[i]!; qs[i] = qs[j]!; qs[j] = tmp;
    setV({ ...v, questions: qs });
  };

  return (
    <form
      className="grid gap-8 lg:grid-cols-[1fr_1.3fr]"
      onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await onSubmit(v); } finally { setBusy(false); } }}
    >
      <div className="space-y-6">
        <section className="space-y-4 rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Проект</h2>
          <div className="space-y-2"><Label>Название</Label><Input required maxLength={200} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></div>
          <div className="space-y-2"><Label>Описание задачи</Label><Textarea rows={6} maxLength={5000} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} placeholder="Что хочет клиент, контекст, ваши заметки" /></div>
        </section>
        <section className="space-y-4 rounded-2xl border border-success/30 bg-card p-6">
          <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-success" /><h2 className="text-lg font-semibold">Данные клиента</h2></div>
          <p className="text-xs text-muted-foreground">Шифруются при сохранении. Не передаются в ИИ — только подставляются в готовое КП.</p>
          {(["name", "company", "phone", "email"] as const).map((k) => (
            <div key={k} className="space-y-2">
              <Label>{{ name: "ФИО", company: "Компания", phone: "Телефон", email: "Email" }[k]}</Label>
              <Input type={k === "email" ? "email" : "text"} maxLength={k === "email" ? 255 : 200} value={v.client[k]} onChange={(e) => setV({ ...v, client: { ...v.client, [k]: e.target.value } })} />
            </div>
          ))}
        </section>
      </div>

      <section className="space-y-4 rounded-2xl border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Вопросы брифа</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setV({ ...v, questions: [...v.questions, { id: `q${Date.now()}`, label: "", type: "text" }] })}>
            <Plus /> Вопрос
          </Button>
        </div>
        <div className="space-y-3">
          {v.questions.map((q, i) => (
            <div key={q.id} className="space-y-3 rounded-xl border bg-background/40 p-4">
              <div className="flex gap-2">
                <Input required placeholder="Текст вопроса" value={q.label} onChange={(e) => setQ(i, { label: e.target.value })} />
                <Button type="button" variant="ghost" size="icon" onClick={() => move(i, -1)}><ArrowUp /></Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => move(i, 1)}><ArrowDown /></Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => setV({ ...v, questions: v.questions.filter((_, j) => j !== i) })}><Trash2 /></Button>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Select value={q.type} onValueChange={(t) => setQ(i, { type: t as QuestionType })}>
                  <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TYPE_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-sm text-muted-foreground"><Switch checked={!!q.required} onCheckedChange={(c) => setQ(i, { required: c })} /> Обязательный</label>
              </div>
              {(q.type === "select" || q.type === "checkbox") && (
                <Input placeholder="Варианты через запятую" value={(q.options ?? []).join(", ")} onChange={(e) => setQ(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
              )}
            </div>
          ))}
        </div>
        <Button className="w-full" size="lg" disabled={busy}>{busy ? "Сохранение…" : submitLabel}</Button>
      </section>
    </form>
  );
}
