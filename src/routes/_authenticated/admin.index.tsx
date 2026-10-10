import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Copy, ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listProjects } from "@/lib/projects.functions";
import { STATUS_LABEL } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Проекты — Brieflow" }, { name: "description", content: "Все проекты, брифы и предложения." }, { property: "og:title", content: "Проекты — Brieflow" }, { property: "og:description", content: "Учёт заявок" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => <AdminShell><Projects /></AdminShell>,
});

export function copyLink(path: string) {
  navigator.clipboard.writeText(`${window.location.origin}${path}`);
  toast.success("Ссылка скопирована");
}

export function StatusBadge({ s }: { s: string }) {
  const variant = s === "ready" ? "default" : s === "error" ? "destructive" : "secondary";
  return <Badge variant={variant}>{STATUS_LABEL[s] ?? s}</Badge>;
}

function Projects() {
  const fn = useServerFn(listProjects);
  const { data = [], isLoading } = useQuery({ queryKey: ["projects"], queryFn: () => fn() });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const rows = useMemo(() => data.filter((p) => (status === "all" || p.status === status) && `${p.title} ${p.client.name ?? ""} ${p.client.company ?? ""} ${p.client.email ?? ""}`.toLowerCase().includes(q.toLowerCase())), [data, q, status]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Проекты</h1>
          <p className="mt-1 text-muted-foreground">{data.length} всего · {data.filter((p) => p.status === "ready").length} с готовым КП</p>
        </div>
        <Button asChild><Link to="/admin/new"><Plus /> Новый проект</Link></Button>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="Поиск по проекту или клиенту" value={q} onChange={(e) => setQ(e.target.value)} />
        {["all", "created", "submitted", "ready", "error"].map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}>{s === "all" ? "Все" : STATUS_LABEL[s]}</Button>
        ))}
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Проект</TableHead><TableHead>Клиент</TableHead><TableHead>Контакты</TableHead><TableHead>Статус</TableHead><TableHead>Ответы</TableHead><TableHead>Создан</TableHead><TableHead>Ссылки</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="text-muted-foreground">Загрузка…</TableCell></TableRow>}
            {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Проектов пока нет</TableCell></TableRow>}
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell><Link to="/admin/$id" params={{ id: p.id }} className="font-medium hover:text-primary">{p.title}</Link></TableCell>
                <TableCell>{p.client.name || "—"}<div className="text-xs text-muted-foreground">{p.client.company}</div></TableCell>
                <TableCell className="text-xs">{p.client.phone}<div className="text-muted-foreground">{p.client.email}</div></TableCell>
                <TableCell><StatusBadge s={p.status} /></TableCell>
                <TableCell className="text-sm">{p.answeredCount}/{p.questionCount}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString("ru-RU")}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => copyLink(`/brief/${p.brief_token}`)}><Copy /> Бриф</Button>
                    {p.status === "ready" && <Button size="sm" variant="outline" asChild><a href={`/offer/${p.offer_token}`} target="_blank" rel="noreferrer"><ExternalLink /> КП</a></Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
