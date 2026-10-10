import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { getBriefSummary } from "@/lib/projects.functions";
import { ClientContacts } from "@/components/ClientContacts";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/offer/$token_/brief")({
  loader: async ({ params }) => {
    if (!/^[a-f0-9]{36}$/.test(params.token)) return null;
    return getBriefSummary({ data: { token: params.token } });
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `Итоговый бриф: ${loaderData.title}` : "Итоговый бриф" },
      { name: "description", content: "Итоговый бриф проекта с ответами клиента." },
      { property: "og:title", content: "Итоговый бриф" },
      { property: "og:description", content: "Ответы брифа. Персональные данные подставлены после генерации и не передавались в ИИ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SummaryPage,
});

function SummaryPage() {
  const data = Route.useLoaderData();
  const { token } = Route.useParams();
  if (!data) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Бриф не найден или ещё не заполнен</div>;
  return (
    <div className="min-h-screen bg-warm">
      <div className="mx-auto max-w-3xl space-y-8 px-6 py-16">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-primary">Итоговый бриф</p>
            <h1 className="mt-3 text-4xl font-semibold">{data.title}</h1>
            {data.submittedAt && <p className="mt-2 text-sm text-muted-foreground">Заполнен {new Date(data.submittedAt).toLocaleString("ru-RU")}</p>}
          </div>
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" asChild><Link to="/offer/$token" params={{ token }}>К предложению</Link></Button>
            <Button onClick={() => window.print()}><Printer /> Печать / PDF</Button>
          </div>
        </div>
        <ClientContacts contact={data.contact} />
        <section className="divide-y rounded-3xl border bg-card">
          {data.items.map((it, i) => (
            <div key={i} className="p-6">
              <p className="text-sm text-muted-foreground">{i + 1}. {it.label}</p>
              <p className="mt-1 whitespace-pre-wrap">{Array.isArray(it.answer) ? it.answer.join(", ") || "—" : it.answer || "—"}</p>
            </div>
          ))}
        </section>
        {data.consentAt && <p className="text-xs text-muted-foreground">Согласие на обработку персональных данных (152-ФЗ) получено {new Date(data.consentAt).toLocaleString("ru-RU")}.</p>}
        <PrivacyBadge />
      </div>
    </div>
  );
}
