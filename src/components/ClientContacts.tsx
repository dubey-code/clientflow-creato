import { Lock } from "lucide-react";

export type Contact = { name: string | null; company: string | null; phone: string | null; email: string | null };

/** Shows decrypted contacts, highlighted as substituted after AI generation. */
export function ClientContacts({ contact }: { contact: Contact | null | undefined }) {
  const rows = [
    ["ФИО", contact?.name],
    ["Компания", contact?.company],
    ["Телефон", contact?.phone],
    ["Email", contact?.email],
  ].filter(([, v]) => v) as [string, string][];
  if (!rows.length) return null;
  return (
    <section className="rounded-3xl border border-success/40 bg-card p-8">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-success" />
        <h2 className="text-lg font-semibold">Контакты клиента</h2>
      </div>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs uppercase tracking-widest text-muted-foreground">{k}</dt>
            <dd className="mt-1"><span className="rounded-md bg-success/15 px-2 py-0.5 text-success">{v}</span></dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 text-xs text-muted-foreground">
        Подставлено после генерации. ИИ этих данных не видел: они хранятся в зашифрованном виде (152-ФЗ) и расшифровываются только при показе этой страницы.
      </p>
    </section>
  );
}
