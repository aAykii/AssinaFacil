import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText, Clock, CheckCircle2, Copy, Loader2, Sparkles, CreditCard } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { buildShareMessage, type Contract } from "@/lib/contracts";
import { useProfileAndUsage } from "@/hooks/useProfile";
import { createPortalSession } from "@/lib/billing.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Meus contratos — AssinaFácil" },
      { name: "description", content: "Acompanhe o status dos contratos enviados." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const { profile, usage, refresh } = useProfileAndUsage(user?.id);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [resharing, setResharing] = useState<Contract | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("contracts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error("Erro ao carregar contratos.");
        setContracts((data as Contract[] | null) ?? []);
        setLoading(false);
      });
  }, [user]);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const { url } = await createPortalSession({ data: { origin: window.location.origin } });
      window.location.href = url;
    } catch (err: any) {
      toast.error(err.message ?? "Não foi possível abrir o portal.");
    } finally {
      setPortalLoading(false);
    }
  }

  const total = contracts.length;
  const pending = contracts.filter((c) => c.status === "pending").length;
  const signed = contracts.filter((c) => c.status === "signed").length;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              Seus contratos
            </h1>
            <p className="text-muted-foreground">Acompanhe o status de cada envio em tempo real.</p>
          </div>
        </header>

        {/* Plan card */}
        {profile && usage && (
          <div className="mb-6 flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
                <Sparkles className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Plano atual</p>
                <p className="text-xl font-bold text-primary">
                  {profile.plan === "pro" ? "Pro" : "Free"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {profile.plan === "pro"
                    ? `${usage.used} contratos enviados este mês · ilimitado`
                    : `${usage.used} de ${usage.limit} contratos enviados este mês`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.plan === "free" ? (
                <button
                  onClick={() => navigate({ to: "/pricing" })}
                  className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground hover:bg-primary"
                >
                  <Sparkles className="h-4 w-4" /> Upgrade para Pro
                </button>
              ) : (
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
                >
                  <CreditCard className="h-4 w-4" />
                  {portalLoading ? "Abrindo..." : "Gerenciar assinatura"}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <StatCard icon={FileText} label="Total" value={total} />
          <StatCard icon={Clock} label="Pendentes" value={pending} />
          <StatCard icon={CheckCircle2} label="Assinados" value={signed} />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium text-foreground">Nenhum contrato enviado ainda</p>
            <p className="text-sm text-muted-foreground">Envie o primeiro contrato na página inicial.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="hidden grid-cols-12 gap-4 border-b border-border bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
              <div className="col-span-4">Documento</div>
              <div className="col-span-3">Signatário</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Enviado</div>
              <div className="col-span-1 text-right">Ação</div>
            </div>
            <ul className="divide-y divide-border">
              {contracts.map((c) => (
                <li key={c.id} className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-12 sm:items-center">
                  <div className="sm:col-span-4 flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent">
                      <FileText className="h-4 w-4 text-secondary" />
                    </div>
                    <p className="truncate font-medium text-foreground">{c.document_name}</p>
                  </div>
                  <div className="sm:col-span-3 text-sm">
                    <p className="font-medium text-foreground">{c.signer_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.signer_email}</p>
                  </div>
                  <div className="sm:col-span-2"><StatusBadge contract={c} /></div>
                  <div className="sm:col-span-2 text-sm text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("pt-BR")}
                  </div>
                  <div className="sm:col-span-1 sm:text-right">
                    <button
                      onClick={() => setResharing(c)}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      <Copy className="h-3.5 w-3.5" /> Link
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      {resharing && <ReshareModal contract={resharing} onClose={() => setResharing(null)} />}
    </div>
  );
}

function StatusBadge({ contract }: { contract: Contract }) {
  const expired = new Date(contract.expires_at) < new Date();
  if (contract.status === "signed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-medium text-secondary">
        <CheckCircle2 className="h-3 w-3" /> Assinado
      </span>
    );
  }
  if (expired) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-medium text-destructive">
        Expirado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
      <Clock className="h-3 w-3" /> Pendente
    </span>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: number }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
        <Icon className="h-5 w-5 text-secondary" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-primary">{value}</p>
      </div>
    </div>
  );
}

function ReshareModal({ contract, onClose }: { contract: Contract; onClose: () => void }) {
  const text = buildShareMessage(contract.token, contract.signer_name, contract.message);
  async function copy() {
    await navigator.clipboard.writeText(text);
    toast.success("Mensagem copiada!");
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-primary">Link de assinatura</h2>
        <p className="mt-1 text-sm text-muted-foreground">Copie e cole no WhatsApp do signatário.</p>
        <pre className="mt-4 max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/40 p-4 text-sm">
          {text}
        </pre>
        <div className="mt-5 flex gap-2">
          <button
            onClick={copy}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-3 font-semibold text-secondary-foreground hover:bg-primary"
          >
            <Copy className="h-4 w-4" /> Copiar mensagem
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-3 font-medium text-foreground hover:bg-muted"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}