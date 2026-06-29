import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { confirmCheckout } from "@/lib/billing.functions";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/billing/success")({
  validateSearch: z.object({ session_id: z.string().optional() }),
  head: () => ({ meta: [{ title: "Pagamento confirmado — AssinaFácil" }] }),
  component: BillingSuccess,
});

function BillingSuccess() {
  const { session_id } = useSearch({ from: "/_authenticated/billing/success" });
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ok" | "fail">("loading");

  useEffect(() => {
    if (!session_id) {
      setStatus("fail");
      return;
    }
    confirmCheckout({ data: { sessionId: session_id } })
      .then((r) => setStatus(r.upgraded ? "ok" : "fail"))
      .catch(() => setStatus("fail"));
  }, [session_id]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-secondary" />
            <p className="mt-4 text-muted-foreground">Confirmando seu pagamento...</p>
          </>
        )}
        {status === "ok" && (
          <>
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent">
              <CheckCircle2 className="h-12 w-12 text-secondary" />
            </div>
            <h1 className="mt-6 text-3xl font-bold text-primary">Bem-vindo ao Pro!</h1>
            <p className="mt-2 text-muted-foreground">
              Sua assinatura está ativa. Agora você pode enviar contratos ilimitados.
            </p>
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="mt-8 rounded-lg bg-secondary px-6 py-3 font-semibold text-secondary-foreground hover:bg-primary"
            >
              Ir para o dashboard
            </button>
          </>
        )}
        {status === "fail" && (
          <>
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/15">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="mt-6 text-2xl font-bold text-primary">Não conseguimos confirmar</h1>
            <p className="mt-2 text-muted-foreground">
              Se o pagamento foi concluído, pode levar alguns instantes. Tente novamente.
            </p>
            <button
              onClick={() => navigate({ to: "/pricing" })}
              className="mt-8 rounded-lg border border-border px-6 py-3 font-semibold text-foreground hover:bg-muted"
            >
              Voltar para planos
            </button>
          </>
        )}
      </main>
    </div>
  );
}