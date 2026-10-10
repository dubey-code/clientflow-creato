import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getBrief, submitBrief } from "@/lib/projects.functions";
import type { Answers } from "@/lib/types";
import { pruneHiddenAnswers, visibleQuestions } from "@/lib/conditions";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Route = createFileRoute("/brief/$token")({
  loader: async ({ params }) => {
    if (!/^[a-f0-9]{36}$/.test(params.token)) return null;
    return getBrief({ data: { token: params.token } });
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `Бриф: ${loaderData.title}` : "Бриф не найден" },
      { name: "description", content: "Заполните бриф — мы подготовим коммерческое предложение." },
      { property: "og:title", content: loaderData ? `Бриф: ${loaderData.title}` : "Бриф" },
      { property: "og:description", content: "Персональные данные защищены и не передаются в ИИ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BriefPage,
});

function BriefPage() {
  const brief = Route.useLoaderData();
  const { token } = Route.useParams();
  const nav = useNavigate();
  const submit = useServerFn(submitBrief);
  const [answers, setAnswers] = useState<Answers>({});
  const [contacts, setContacts] = useState({ name: "", company: "", phone: "", email: "" });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!brief) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Бриф не найден</div>;
  if (brief.submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-3xl font-semibold">Спасибо, бриф получен!</h1>
        {brief.offerToken ? <Button asChild><Link to="/offer/$token" params={{ token: brief.offerToken }}>Смотреть предложение</Link></Button> : <p className="text-muted-foreground">Предложение готовится.</p>}
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    for (const q of visibleQuestions(brief!.questions, answers)) {
      const a = answers[q.id];
      if (q.required && (!a || (Array.isArray(a) && !a.length))) { toast.error(`Ответьте на вопрос: ${q.label}`); return; }
    }
    if (!consent) { toast.error("Нужно согласие на обработку персональных данных"); return; }
    setBusy(true);
    try {
      const r = await submit({ data: { token, answers: pruneHiddenAnswers(brief!.questions, answers), contacts, consent: true } });
      nav({ to: "/offer/$token", params: { token: r.offerToken } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка отправки");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-warm">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-sm uppercase tracking-[0.2em] text-primary">Бриф</p>
        <h1 className="mt-3 text-4xl font-semibold">{brief.title}</h1>
        <p className="mt-3 text-muted-foreground">Ответьте на несколько вопросов — и сразу получите персональное коммерческое предложение.</p>

        <form onSubmit={onSubmit} className="mt-10 space-y-6">
          {visibleQuestions(brief.questions, answers).map((q, i) => (
            <div key={q.id} className="space-y-3 rounded-2xl border bg-card p-6">
              <Label className="text-base">{i + 1}. {q.label}{q.required && <span className="text-primary"> *</span>}</Label>
              {q.type === "text" && <Input maxLength={1000} value={(answers[q.id] as string) ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />}
              {q.type === "textarea" && <Textarea rows={4} maxLength={5000} value={(answers[q.id] as string) ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />}
              {q.type === "select" && (
                <RadioGroup value={(answers[q.id] as string) ?? ""} onValueChange={(v) => setAnswers({ ...answers, [q.id]: v })}>
                  {q.options?.map((o) => <label key={o} className="flex items-center gap-3 text-sm"><RadioGroupItem value={o} />{o}</label>)}
                </RadioGroup>
              )}
              {q.type === "checkbox" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {q.options?.map((o) => {
                    const cur = (answers[q.id] as string[]) ?? [];
                    return (
                      <label key={o} className="flex items-center gap-3 text-sm">
                        <Checkbox checked={cur.includes(o)} onCheckedChange={(c) => setAnswers({ ...answers, [q.id]: c ? [...cur, o] : cur.filter((x) => x !== o) })} />{o}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          <div className="space-y-4 rounded-2xl border border-success/40 bg-card p-6">
            <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-success" /><h2 className="text-lg font-semibold">Контактные данные</h2></div>
            <p className="text-sm text-muted-foreground">Если данные уже есть у исполнителя, поля можно оставить пустыми.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>ФИО</Label><Input maxLength={200} value={contacts.name} onChange={(e) => setContacts({ ...contacts, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Компания</Label><Input maxLength={200} value={contacts.company} onChange={(e) => setContacts({ ...contacts, company: e.target.value })} /></div>
              <div className="space-y-2"><Label>Телефон</Label><Input maxLength={40} value={contacts.phone} onChange={(e) => setContacts({ ...contacts, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" maxLength={255} value={contacts.email} onChange={(e) => setContacts({ ...contacts, email: e.target.value })} /></div>
            </div>
            <PrivacyBadge />
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={consent} onCheckedChange={(c) => setConsent(!!c)} className="mt-0.5" />
              <span>Я даю согласие на обработку моих персональных данных в соответствии с 152-ФЗ и <Link to="/privacy" className="underline underline-offset-4">политикой обработки</Link>.</span>
            </label>
          </div>

          <Button size="lg" className="w-full" disabled={busy}>
            {busy ? <><Loader2 className="animate-spin" /> Готовим предложение…</> : "Отправить и получить предложение"}
          </Button>
        </form>
      </div>
    </div>
  );
}
