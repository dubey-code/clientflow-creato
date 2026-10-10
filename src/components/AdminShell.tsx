import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { amIAdmin } from "@/lib/projects.functions";
import { Button } from "@/components/ui/button";
import { PrivacyBadge } from "./PrivacyBadge";

export function AdminShell({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  const check = useServerFn(amIAdmin);
  const { data, isLoading } = useQuery({ queryKey: ["am-admin"], queryFn: () => check() });

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/admin" className="font-display text-lg font-semibold">Brief<span className="text-primary">flow</span></Link>
          <div className="flex items-center gap-3">
            <div className="hidden md:block"><PrivacyBadge compact /></div>
            <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); nav({ to: "/auth" }); }}>
              <LogOut /> Выйти
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">
        {isLoading ? <p className="text-muted-foreground">Загрузка…</p> : data?.admin ? children : (
          <div className="rounded-xl border bg-card p-8 text-center">
            <h2 className="text-xl font-semibold">Нет доступа</h2>
            <p className="mt-2 text-muted-foreground">Этот кабинет доступен только администратору.</p>
          </div>
        )}
      </main>
    </div>
  );
}
