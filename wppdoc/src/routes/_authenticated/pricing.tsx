import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { useProfileAndUsage } from "@/hooks/useProfile";
import { createCheckoutSession } from "@/lib/billing.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pricing")({
  head: () => ({
    meta: [
      { title: "Planos — AssinaFácil" },
      { name: "description", content: "Free e Pro: escolha o plano ideal para sua operação." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const { user } = Route.useRouteContext();
  const { profile } = useProfileAndUsage(user?.id);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function startCheckout() {
    setLoading(true);
    try {
      const { url } = await createCheckoutSession({ data: { origin: window.location.origin } });
      window.location.href = url;
    } catch (err: any) {
      toast.error(err.message ?? "Não foi possível iniciar o checkout.");
      setLoading(false);
    }
  }

  const isPro = profile?.plan === "pro";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:py-16">
        <header className="mx-auto mb-12 max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
            Escolha seu plano
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Comece grátis. Faça upgrade quando precisar de mais.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Free */}
          <div className="flex flex-col rounded-2xl border border-border bg-card p-8">
            <div>
              <h2 className="text-xl font-bold text-primary">Free</h2>
              <p className="mt-1 text-sm text-muted-foreground">Para começar a usar</p>
              <div className="mt-6">
                <span className="text-5xl font-bold text-primary">$0</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
            </div>
            <ul className="mt-8 flex-1 space-y-3 text-sm">
              <li className="flex items-start gap-2 text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" /> 3 contratos por mês
              </li>
              <li className="flex items-start gap-2 text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" /> Link de assinatura por WhatsApp
              </li>
              <li className="flex items-start gap-2 text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" /> Dashboard de acompanhamento
              </li>
            </ul>
            <button
              disabled
              className="mt-8 rounded-lg border border-border bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground"
            >
              {!isPro ? "Seu plano atual" : "Plano Free"}
            </button>
          </div>

          {/* Pro */}
          <div className="relative flex flex-col rounded-2xl border-2 border-secondary bg-card p-8 shadow-lg">
            <span className="absolute -top-3 right-6 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
              MAIS POPULAR
            </span>
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-primary">
                <Sparkles className="h-5 w-5 text-secondary" /> Pro
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Para uso profissional</p>
              <div className="mt-6">
                <span className="text-5xl font-bold text-primary">$29</span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
            </div>
            <ul className="mt-8 flex-1 space-y-3 text-sm">
              <li className="flex items-start gap-2 text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" /> <strong>Contratos ilimitados</strong>
              </li>
              <li className="flex items-start gap-2 text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" /> Link de assinatura por WhatsApp
              </li>
              <li className="flex items-start gap-2 text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" /> Dashboard completo
              </li>
              <li className="flex items-start gap-2 text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" /> Cancele quando quiser
              </li>
            </ul>
            {isPro ? (
              <button
                onClick={() => navigate({ to: "/dashboard" })}
                className="mt-8 rounded-lg bg-secondary/15 px-4 py-3 text-sm font-semibold text-secondary"
              >
                ✓ Você já é Pro
              </button>
            ) : (
              <button
                onClick={startCheckout}
                disabled={loading}
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-3 text-sm font-bold text-secondary-foreground hover:bg-primary disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Assinar plano Pro
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}