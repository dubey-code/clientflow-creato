import { ShieldCheck, Lock, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function PrivacyBadge({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
        <ShieldCheck className="h-3.5 w-3.5" /> Персональные данные защищены · не передаются в ИИ
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm">
      <div className="flex items-center gap-2 font-semibold text-success">
        <ShieldCheck className="h-4 w-4" /> Ваши персональные данные защищены (152-ФЗ)
      </div>
      <ul className="mt-2 space-y-1.5 text-foreground/85">
        <li className="flex gap-2"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />ФИО, телефон и email хранятся только в зашифрованном виде (AES-256).</li>
        <li className="flex gap-2"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /><span><b>Данные не передаются в ИИ.</b> Они скрываются перед генерацией и подставляются только в готовый документ.</span></li>
      </ul>
      <Link to="/privacy" className="mt-2 inline-block text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">Политика обработки персональных данных</Link>
    </div>
  );
}
