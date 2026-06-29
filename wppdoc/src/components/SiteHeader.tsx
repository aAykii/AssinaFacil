import { Link, useNavigate } from "@tanstack/react-router";
import { FileSignature, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-primary">
          <img
            src="/logo.png"
            alt="Logo"
            className="h-6 w-auto object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = "block";
            }}
          />
          <div style={{ display: "none" }}>
            <FileSignature className="h-6 w-6 text-secondary" />
          </div>
          <span className="text-lg font-bold tracking-tight">AssinaFácil</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
          <Link
            to="/"
            className="rounded-md px-3 py-2 text-foreground/80 transition-colors hover:bg-muted hover:text-primary"
            activeProps={{ className: "rounded-md px-3 py-2 bg-muted text-primary" }}
            activeOptions={{ exact: true }}
          >
            Novo
          </Link>
          <Link
            to="/dashboard"
            className="rounded-md px-3 py-2 text-foreground/80 transition-colors hover:bg-muted hover:text-primary"
            activeProps={{ className: "rounded-md px-3 py-2 bg-muted text-primary" }}
          >
            Contratos
          </Link>
          <Link
            to="/pricing"
            className="rounded-md px-3 py-2 text-foreground/80 transition-colors hover:bg-muted hover:text-primary"
            activeProps={{ className: "rounded-md px-3 py-2 bg-muted text-primary" }}
          >
            Planos
          </Link>
          {email && (
            <button
              onClick={signOut}
              title={email}
              className="ml-2 inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-foreground/80 hover:bg-muted hover:text-primary"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}