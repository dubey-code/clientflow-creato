import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL } from "@/lib/types";

export function copyLink(path: string) {
  navigator.clipboard.writeText(`${window.location.origin}${path}`);
  toast.success("Ссылка скопирована");
}

export function StatusBadge({ s }: { s: string }) {
  const variant = s === "ready" ? "default" : s === "error" ? "destructive" : "secondary";
  return <Badge variant={variant}>{STATUS_LABEL[s] ?? s}</Badge>;
}
