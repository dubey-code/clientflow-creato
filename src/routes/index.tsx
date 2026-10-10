import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileText, Link2, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PrivacyBadge } from "@/components/PrivacyBadge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Brieflow — бриф и КП для клиента за минуты" },
      { name: "description", content: "Создайте проект, отправьте клиенту бриф и получите готовое коммерческое предложение. Персональные данные под защитой." },
      { property: "og:title", content: "Brieflow — бриф и КП для клиента за минуты" },
      { property: "og:description", content: "Бриф → коммерческое предложение-лендинг. Персональные данные не передаются в ИИ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const steps = [
    { icon: FileText, t: "Создайте проект", d: "Описание задачи и контакты клиента — в одном окне." },
    { icon: Link2, t: "Отправьте бриф", d: "Уникальная ссылка на редактируемую форму создаётся автоматически." },
    { icon: Table2, t: "Получите КП", d: "Готовый лендинг-предложение и полная таблица учёта заявок." },
  ];
  return (
    <div className="min-h-screen bg-warm">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-lg font-semibold">Brief<span className="text-primary">flow</span></span>
        <Button asChild variant="outline" size="sm"><Link to="/admin">Войти в кабинет</Link></Button>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-16">
        <PrivacyBadge compact />
        <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-tight md:text-6xl">
          От брифа до коммерческого предложения — <span className="text-primary">без ручной рутины</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Клиент заполняет бриф по ссылке, а вы получаете аккуратное КП в виде лендинга. Персональные данные шифруются и никогда не уходят в ИИ.
        </p>
        <Button asChild size="lg" className="mt-8"><Link to="/admin">Открыть кабинет <ArrowRight /></Link></Button>
        <div className="mt-20 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.t} className="rounded-2xl border bg-card p-6">
              <div className="flex items-center justify-between">
                <s.icon className="h-5 w-5 text-primary" />
                <span className="text-xs text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 max-w-2xl"><PrivacyBadge /></div>
      </main>
    </div>
  );
}
