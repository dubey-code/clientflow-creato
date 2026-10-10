import { Check } from "lucide-react";
import type { Offer } from "@/lib/types";
import { PrivacyBadge } from "./PrivacyBadge";

export function OfferView({ offer, title, company }: { offer: Offer; title: string; company?: string | null }) {
  return (
    <div className="min-h-screen">
      <section className="bg-warm border-b">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <p className="text-sm uppercase tracking-[0.2em] text-primary">Коммерческое предложение{company ? ` · ${company}` : ""}</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-6xl">{offer.headline}</h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">{offer.subtitle}</p>
          <p className="mt-8 text-sm text-muted-foreground">Проект: {title}</p>
        </div>
      </section>
      <div className="mx-auto max-w-5xl space-y-20 px-6 py-20">
        <section className="grid gap-6 md:grid-cols-[200px_1fr]">
          <h2 className="text-sm uppercase tracking-widest text-muted-foreground">Задача</h2>
          <p className="text-xl leading-relaxed">{offer.understanding}</p>
        </section>
        <section>
          <h2 className="text-3xl font-semibold">Решение</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {offer.solution.map((s) => (
              <div key={s.title} className="rounded-2xl border bg-card p-6"><h3 className="font-semibold">{s.title}</h3><p className="mt-2 text-sm text-muted-foreground">{s.text}</p></div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-3xl font-semibold">Этапы и сроки</h2>
          <ol className="mt-8 space-y-0">
            {offer.stages.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[48px_1fr_auto] gap-4 border-t py-6">
                <span className="font-display text-2xl text-primary">{String(i + 1).padStart(2, "0")}</span>
                <div><h3 className="font-semibold">{s.title}</h3><p className="mt-1 text-sm text-muted-foreground">{s.text}</p></div>
                <span className="text-sm text-muted-foreground">{s.duration}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="rounded-3xl border bg-card p-8 shadow-glow md:p-12">
          <h2 className="text-3xl font-semibold">Стоимость</h2>
          <div className="mt-6 divide-y">
            {offer.price.items.map((it) => (
              <div key={it.name} className="flex justify-between gap-4 py-3 text-sm"><span>{it.name}</span><span className="text-muted-foreground">{it.price}</span></div>
            ))}
          </div>
          <div className="mt-6 flex items-baseline justify-between border-t pt-6"><span className="text-muted-foreground">Итого</span><span className="font-display text-3xl font-semibold text-primary">{offer.price.total}</span></div>
        </section>
        <section>
          <h2 className="text-3xl font-semibold">Почему мы</h2>
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {offer.why.map((w) => <li key={w} className="flex gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />{w}</li>)}
          </ul>
        </section>
        <section className="rounded-3xl bg-primary p-10 text-primary-foreground md:p-14">
          <p className="font-display text-2xl font-semibold md:text-3xl">{offer.cta}</p>
        </section>
        <PrivacyBadge />
      </div>
    </div>
  );
}
