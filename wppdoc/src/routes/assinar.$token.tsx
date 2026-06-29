import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Link2Off, Loader2, FileSignature, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSignedPdfUrl, type Contract } from "@/lib/contracts";
import { toast } from "sonner";

export const Route = createFileRoute("/assinar/$token")({
  head: () => ({
    meta: [
      { title: "Assinar contrato — AssinaFácil" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignPage,
});

type State =
  | { kind: "loading" }
  | { kind: "invalid"; reason: string }
  | { kind: "ready"; contract: Contract; pdfUrl: string | null }
  | { kind: "signed"; contract: Contract };

function SignPage() {
  const { token } = Route.useParams();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_contract_by_token", {
        _token: token,
      });
      if (error || !data) {
        return setState({ kind: "invalid", reason: "Link inválido ou expirado. Solicite um novo ao remetente." });
      }
      const contract = data as unknown as Contract;
      if (contract.status === "signed") {
        return setState({ kind: "signed", contract });
      }
      if (new Date(contract.expires_at) < new Date()) {
        return setState({ kind: "invalid", reason: "Este link expirou. Solicite um novo ao remetente." });
      }
      const pdfUrl = await getSignedPdfUrl(contract.document_path);
      setState({ kind: "ready", contract, pdfUrl });
    })();
  }, [token]);

  async function sign() {
    if (state.kind !== "ready") return;
    if (!fullName.trim() || fullName.trim().split(" ").length < 2) {
      return toast.error("Digite seu nome completo.");
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("sign_contract", {
      _token: token,
      _name: fullName.trim(),
    });
    setSubmitting(false);
    if (error || !data) {
      return toast.error("Não foi possível assinar. O link pode ter expirado.");
    }
    setState({ kind: "signed", contract: data as unknown as Contract });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4 text-primary sm:px-6">
          <FileSignature className="h-6 w-6 text-secondary" />
          <span className="text-lg font-bold tracking-tight">AssinaFácil</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
        {state.kind === "loading" && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-secondary" />
          </div>
        )}

        {state.kind === "invalid" && (
          <CenteredCard
            icon={<Link2Off className="h-10 w-10 text-destructive" />}
            title="Link inválido"
            message={state.reason}
          />
        )}

        {state.kind === "signed" && (
          <CenteredCard
            icon={<CheckCircle2 className="h-10 w-10 text-secondary" />}
            title="Contrato assinado com sucesso!"
            message={`Você assinou em ${new Date(state.contract.signed_at!).toLocaleString("pt-BR")}. Uma cópia será enviada por e-mail.`}
          />
        )}

        {state.kind === "ready" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Documento para assinatura
              </p>
              <h1 className="mt-1 text-2xl font-bold text-primary">{state.contract.document_name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enviado por <span className="font-medium text-foreground">{state.contract.sender_email}</span> para{" "}
                <span className="font-medium text-foreground">{state.contract.signer_name}</span>.
              </p>
              {state.contract.message && (
                <p className="mt-3 rounded-lg bg-muted/40 p-3 text-sm italic text-foreground">
                  “{state.contract.message}”
                </p>
              )}
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {state.pdfUrl ? (
                <embed src={state.pdfUrl} type="application/pdf" className="h-[70vh] w-full" />
              ) : (
                <div className="flex h-64 items-center justify-center text-muted-foreground">
                  Não foi possível carregar o PDF.
                </div>
              )}
              {state.pdfUrl && (
                <div className="border-t border-border p-3 text-center text-xs text-muted-foreground">
                  <a href={state.pdfUrl} target="_blank" rel="noreferrer" className="text-secondary hover:underline">
                    Abrir PDF em nova aba
                  </a>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">
                  Digite seu nome completo para assinar
                </span>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: João da Silva Santos"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              </label>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Ao clicar em assinar, você concorda com o conteúdo do documento. A data e hora serão registradas.
              </p>
              <button
                onClick={sign}
                disabled={submitting}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-secondary px-6 py-4 text-base font-semibold text-secondary-foreground shadow-sm transition-all hover:bg-primary active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSignature className="h-5 w-5" />}
                Assinar agora
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function CenteredCard({ icon, title, message }: { icon: React.ReactNode; title: string; message: string }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-accent">
        {icon}
      </div>
      <h2 className="text-2xl font-bold text-primary">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
