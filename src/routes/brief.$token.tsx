import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Check, Lock, Loader2, ShieldCheck } from "lucide-react";
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
      {busy && <SubmitSteps />}
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
              <PiiField label="ФИО" type="text" maxLength={200} value={contacts.name} onChange={(v) => setContacts({ ...contacts, name: v })} />
              <PiiField label="Компания" type="text" maxLength={200} value={contacts.company} onChange={(v) => setContacts({ ...contacts, company: v })} />
              <PiiField label="Телефон" type="text" maxLength={40} value={contacts.phone} onChange={(v) => setContacts({ ...contacts, phone: v })} />
              <PiiField label="Email" type="email" maxLength={255} value={contacts.email} onChange={(v) => setContacts({ ...contacts, email: v })} />
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

function PiiField({ label, type, maxLength, value, onChange }: { label: string; type: string; maxLength: number; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-success" />{label}</Label>
      <Input type={type} maxLength={maxLength} value={value} onChange={(e) => onChange(e.target.value)} className="border-success/50 focus-visible:ring-success" />
      <p className="text-xs text-success">Шифруется · не передаётся в ИИ</p>
    </div>
  );
}

const STEPS = ["Шифруем персональные данные", "Скрываем их от ИИ", "Генерируем коммерческое предложение", "Подставляем ваши данные"];

function SubmitSteps() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 px-6 backdrop-blur">
      <div className="w-full max-w-md space-y-4 rounded-3xl border bg-card p-8">
        <h2 className="text-xl font-semibold">Готовим предложение</h2>
        <ol className="space-y-3">
          {STEPS.map((s, i) => (
            <li key={s} className={`flex items-center gap-3 text-sm ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>
              {i < step ? <Check className="h-4 w-4 text-success" /> : i === step ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <span className="h-4 w-4 rounded-full border" />}
              {s}
            </li>
          ))}
        </ol>
        <p className="flex items-start gap-2 rounded-xl bg-success/10 p-3 text-xs text-success"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />ФИО, телефон и email не отправляются в ИИ. Они подставляются только в готовое предложение.</p>
      </div>
    </div>
  );
}
