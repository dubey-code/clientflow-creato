import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Copy, ExternalLink, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { ProjectForm } from "@/components/ProjectForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clarifyProject, deleteProject, getProject, regenerateOffer, saveOffer, updateProject } from "@/lib/projects.functions";
import type { Clarification, Offer, Question } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { copyLink, StatusBadge } from "@/components/admin-helpers";

export const Route = createFileRoute("/_authenticated/admin/$id")({
  head: () => ({ meta: [{ title: "Проект — Brieflow" }, { name: "description", content: "Ответы клиента и коммерческое предложение." }, { property: "og:title", content: "Проект — Brieflow" }, { property: "og:description", content: "Карточка проекта" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => <AdminShell><ProjectPage /></AdminShell>,
});

function ProjectPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const nav = useNavigate();
  const get = useServerFn(getProject);
  const regen = useServerFn(regenerateOffer);
  const save = useServerFn(saveOffer);
  const upd = useServerFn(updateProject);
  const del = useServerFn(deleteProject);
  const { data: p, isLoading } = useQuery({ queryKey: ["project", id], queryFn: () => get({ data: { id } }) });
  const [offer, setOffer] = useState<Offer | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setOffer(p?.offer ?? null), [p?.offer]);

  if (isLoading || !p) return <p className="text-muted-foreground">Загрузка…</p>;
  const refresh = () => qc.invalidateQueries({ queryKey: ["project", id] });

  return (
    <div>
      <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">← Все проекты</Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3"><h1 className="text-3xl font-semibold">{p.title}</h1><StatusBadge s={p.status} /></div>
          <p className="mt-1 text-muted-foreground">{p.client.name} {p.client.company && `· ${p.client.company}`}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => copyLink(`/brief/${p.brief_token}`)}><Copy /> Ссылка на бриф</Button>
          <Button variant="outline" asChild><a href={`/brief/${p.brief_token}`} target="_blank" rel="noreferrer"><ExternalLink /> Открыть бриф</a></Button>
          {p.offer && <Button variant="outline" onClick={() => copyLink(`/offer/${p.offer_token}`)}><Copy /> Ссылка на КП</Button>}
          {p.offer && <Button asChild><a href={`/offer/${p.offer_token}`} target="_blank" rel="noreferrer"><ExternalLink /> Открыть КП</a></Button>}
        </div>
      </div>

      <Tabs defaultValue="answers" className="mt-8">
        <TabsList><TabsTrigger value="answers">Ответы</TabsTrigger><TabsTrigger value="clarify">Уточнения ИИ</TabsTrigger><TabsTrigger value="offer">КП</TabsTrigger><TabsTrigger value="settings">Проект и бриф</TabsTrigger></TabsList>

        <TabsContent value="answers" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="rounded-2xl border bg-card">
              {!p.answers && <p className="p-8 text-muted-foreground">Клиент ещё не заполнил бриф.</p>}
              {p.answers && p.questions.map((q) => {
                const a = p.answers?.[q.id];
                return (
                  <div key={q.id} className="border-b p-5 last:border-0">
                    <p className="text-sm text-muted-foreground">{q.label}</p>
                    <p className="mt-1 whitespace-pre-wrap">{Array.isArray(a) ? a.join(", ") || "—" : a || "—"}</p>
                  </div>
                );
              })}
            </div>
            <div className="space-y-2 rounded-2xl border border-success/30 bg-card p-5 text-sm">
              <p className="font-semibold">Контакты (расшифровано)</p>
              <p>{p.client.name || "—"}</p><p>{p.client.company || "—"}</p><p>{p.client.phone || "—"}</p><p>{p.client.email || "—"}</p>
              <p className="pt-2 text-xs text-muted-foreground">Согласие на обработку ПДн: {p.consent_at ? new Date(p.consent_at).toLocaleString("ru-RU") : "не получено"}</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="clarify" className="mt-6">
          <ClarifyPanel id={id} project={p} onAdded={refresh} />
        </TabsContent>

        <TabsContent value="offer" className="mt-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy || !p.answers} onClick={async () => { setBusy(true); try { await regen({ data: { id } }); toast.success("КП сгенерировано"); refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка"); } finally { setBusy(false); } }}>
              <RefreshCw className={busy ? "animate-spin" : ""} /> {p.offer ? "Перегенерировать" : "Сгенерировать"}
            </Button>
            {offer && <Button variant="outline" onClick={async () => { await save({ data: { id, offer } }); toast.success("Сохранено"); refresh(); }}>Сохранить правки</Button>}
          </div>
          <p className="text-xs text-muted-foreground">Метки {"{{CLIENT_NAME}}"} и {"{{COMPANY}}"} заменяются на реальные данные только при показе клиенту.</p>
          {offer && (
            <div className="grid gap-4 rounded-2xl border bg-card p-6">
              <div className="space-y-2"><Label>Заголовок</Label><Input value={offer.headline} onChange={(e) => setOffer({ ...offer, headline: e.target.value })} /></div>
              <div className="space-y-2"><Label>Подзаголовок</Label><Textarea value={offer.subtitle} onChange={(e) => setOffer({ ...offer, subtitle: e.target.value })} /></div>
              <div className="space-y-2"><Label>Понимание задачи</Label><Textarea rows={4} value={offer.understanding} onChange={(e) => setOffer({ ...offer, understanding: e.target.value })} /></div>
              {offer.solution.map((s, i) => (
                <div key={i} className="grid gap-2 md:grid-cols-[1fr_2fr]">
                  <Input value={s.title} onChange={(e) => setOffer({ ...offer, solution: offer.solution.map((x, j) => j === i ? { ...x, title: e.target.value } : x) })} />
                  <Textarea value={s.text} onChange={(e) => setOffer({ ...offer, solution: offer.solution.map((x, j) => j === i ? { ...x, text: e.target.value } : x) })} />
                </div>
              ))}
              {offer.price.items.map((it, i) => (
                <div key={i} className="grid gap-2 md:grid-cols-[2fr_1fr]">
                  <Input value={it.name} onChange={(e) => setOffer({ ...offer, price: { ...offer.price, items: offer.price.items.map((x, j) => j === i ? { ...x, name: e.target.value } : x) } })} />
                  <Input value={it.price} onChange={(e) => setOffer({ ...offer, price: { ...offer.price, items: offer.price.items.map((x, j) => j === i ? { ...x, price: e.target.value } : x) } })} />
                </div>
              ))}
              <div className="space-y-2"><Label>Итоговая стоимость</Label><Input value={offer.price.total} onChange={(e) => setOffer({ ...offer, price: { ...offer.price, total: e.target.value } })} /></div>
              <div className="space-y-2"><Label>Призыв к действию</Label><Textarea value={offer.cta} onChange={(e) => setOffer({ ...offer, cta: e.target.value })} /></div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <ProjectForm
            submitLabel="Сохранить"
            initial={{ title: p.title, description: p.description, questions: p.questions, client: { name: p.client.name ?? "", phone: p.client.phone ?? "", email: p.client.email ?? "", company: p.client.company ?? "" } }}
            onSubmit={async (v) => { try { await upd({ data: { id, ...v } }); toast.success("Сохранено"); refresh(); } catch (e) { toast.error(e instanceof Error ? e.message : "Ошибка"); } }}
          />
          <Button variant="destructive" className="mt-8" onClick={async () => { if (!confirm("Удалить проект и все данные клиента?")) return; await del({ data: { id } }); nav({ to: "/admin" }); }}>
            <Trash2 /> Удалить проект
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

type ProjectData = { title: string; description: string | null; questions: Question[]; client: { name: string; phone: string; email: string; company: string } };

function ClarifyPanel({ id, project, onAdded }: { id: string; project: ProjectData; onAdded: () => void }) {
  const clarify = useServerFn(clarifyProject);
  const upd = useServerFn(updateProject);
  const [description, setDescription] = useState(project.description ?? "");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Clarification | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const run = async () => {
    setBusy(true);
    try {
      const r = await clarify({ data: { id, description, notes } });
      setRes(r);
      setPicked(new Set(r.questions.map((q) => q.id)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };
  const add = async () => {
    if (!res) return;
    const extra = res.questions.filter((q) => picked.has(q.id));
    if (!extra.length) return;
    setBusy(true);
    try {
      await upd({ data: { id, title: project.title, description: project.description ?? "", questions: [...project.questions, ...extra], client: project.client } });
      toast.success(`Добавлено вопросов в бриф: ${extra.length}`);
      setRes({ ...res, questions: res.questions.filter((q) => !picked.has(q.id)) });
      onAdded();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-4 rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Что проанализировать</h2>
        <div className="space-y-2"><Label>Описание проекта</Label><Textarea rows={6} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="space-y-2">
          <Label>Дополнительные ответы клиента</Label>
          <Textarea rows={5} maxLength={10000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Переписка, заметки со звонка… Ответы из брифа учитываются автоматически." />
        </div>
        <p className="text-xs text-muted-foreground">Персональные данные клиента скрываются перед отправкой в ИИ.</p>
        <Button disabled={busy} onClick={run}><Sparkles /> {busy && !res ? "Анализ…" : "Найти недостающие детали"}</Button>
      </div>
      <div className="space-y-4 rounded-2xl border bg-card p-6">
        {!res && <p className="text-muted-foreground">ИИ определит, чего не хватает для оценки, и предложит уточняющие вопросы.</p>}
        {res && (
          <>
            <div>
              <h3 className="font-semibold">Не хватает деталей</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{res.missing.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">Уточняющие вопросы</h3>
              {!res.questions.length && <p className="text-sm text-muted-foreground">Все вопросы добавлены.</p>}
              {res.questions.map((q) => (
                <label key={q.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                  <Checkbox className="mt-0.5" checked={picked.has(q.id)} onCheckedChange={(c) => { const n = new Set(picked); if (c) n.add(q.id); else n.delete(q.id); setPicked(n); }} />
                  <span>{q.label}{q.options?.length ? <span className="block text-xs text-muted-foreground">{q.options.join(" · ")}</span> : null}</span>
                </label>
              ))}
            </div>
            {!!res.questions.length && <Button disabled={busy || !picked.size} onClick={add}>Добавить выбранные в бриф</Button>}
          </>
        )}
      </div>
    </div>
  );
}
