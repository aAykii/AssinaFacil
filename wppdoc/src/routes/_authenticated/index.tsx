import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect, type FormEvent, type DragEvent } from "react";
import { UploadCloud, FileText, CheckCircle2, X, Copy, Loader2, MessageSquare } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { UpgradeModal } from "@/components/UpgradeModal";
import { supabase } from "@/integrations/supabase/client";
import { useProfileAndUsage } from "@/hooks/useProfile";
import {
  formatPhone,
  isValidEmail,
  isValidPhone,
  buildShareMessage,
  buildSignUrl,
} from "@/lib/contracts";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Novo contrato — AssinaFácil" },
      { name: "description", content: "Envie um PDF e gere um link de assinatura em segundos." },
    ],
  }),
  component: NovoContratoPage,
});

const MAX_SIZE = 10 * 1024 * 1024;

function NovoContratoPage() {
  const { user } = Route.useRouteContext();
  const { profile, usage, refresh } = useProfileAndUsage(user?.id);
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerPhone, setSignerPhone] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [shareData, setShareData] = useState<{ link: string; text: string } | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pre-fill sender email
  const senderEmail = user?.email ?? "";

  useEffect(() => {
    if (usage && usage.limit !== null && usage.used >= usage.limit) {
      // Don't auto-show modal on mount; only when user tries to submit
    }
  }, [usage]);

  function handleFile(f: File | null) {
    if (!f) return;
    if (f.type !== "application/pdf") return toast.error("Arquivo inválido. Envie apenas PDFs.");
    if (f.size > MAX_SIZE) return toast.error("O arquivo excede 10 MB.");
    setFile(f);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0] ?? null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    // Plan limit check
    if (usage && usage.limit !== null && usage.used >= usage.limit) {
      setShowUpgrade(true);
      return;
    }

    if (!file) return toast.error("Selecione um PDF para enviar.");
    if (!signerName.trim()) return toast.error("Informe o nome do signatário.");
    if (!isValidPhone(signerPhone)) return toast.error("Telefone inválido.");
    if (!isValidEmail(signerEmail)) return toast.error("E-mail do signatário inválido.");
    if (message.length > 500) return toast.error("Mensagem excede 500 caracteres.");

    setSubmitting(true);
    try {
      const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("contracts")
        .upload(path, file, { contentType: "application/pdf" });
      if (upErr) throw upErr;

      const { data, error } = await supabase
        .from("contracts")
        .insert({
          user_id: user.id,
          document_name: file.name,
          document_path: path,
          sender_email: senderEmail.toLowerCase(),
          signer_name: signerName.trim(),
          signer_phone: signerPhone.trim(),
          signer_email: signerEmail.trim().toLowerCase(),
          message: message.trim() || null,
        })
        .select("token")
        .single();
      if (error) throw error;

      const text = buildShareMessage(data.token, signerName.trim(), message);
      setShareData({ link: buildSignUrl(data.token), text });
      setFile(null);
      setSignerName("");
      setSignerPhone("");
      setSignerEmail("");
      setMessage("");
      refresh();
    } catch (err) {
      console.error(err);
      const msg = (err as { message?: string })?.message ?? "";
      if (msg.toLowerCase().includes("free plan limit")) {
        setShowUpgrade(true);
      } else {
        toast.error("Não foi possível enviar o contrato. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const atLimit = usage && usage.limit !== null && usage.used >= usage.limit;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <header className="mb-6 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
                Novo contrato
              </h1>
              <p className="text-muted-foreground">
                Suba seu PDF, preencha os dados e gere um link para WhatsApp.
              </p>
            </div>
            {profile && usage && (
              <PlanPill plan={profile.plan} used={usage.used} limit={usage.limit} />
            )}
          </div>
        </header>

        {atLimit && (
          <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            Você atingiu o limite de {usage!.limit} contratos do plano Free este mês.{" "}
            <button
              onClick={() => navigate({ to: "/pricing" })}
              className="font-semibold underline hover:no-underline"
            >
              Faça upgrade para o Pro
            </button>{" "}
            e envie quantos quiser.
          </div>
        )}

        <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-5">
          <section className="lg:col-span-2">
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            {!file ? (
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={`flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-card p-6 text-center transition-colors ${
                  dragOver ? "border-secondary bg-accent/40" : "border-border hover:border-secondary hover:bg-accent/30"
                }`}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
                  <UploadCloud className="h-8 w-8 text-secondary" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-primary">
                    Arraste seu PDF ou <span className="text-secondary">clique aqui</span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">Tamanho máximo de 10 MB</p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[280px] flex-col gap-4 rounded-xl border border-border bg-card p-6">
                <div className="flex items-start gap-3 rounded-lg bg-accent/40 p-4">
                  <FileText className="mt-0.5 h-6 w-6 shrink-0 text-secondary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-primary">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-secondary">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Pronto para enviar
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-card hover:text-destructive"
                    aria-label="Remover arquivo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="text-sm font-medium text-secondary hover:underline"
                >
                  Trocar arquivo
                </button>
              </div>
            )}
          </section>

          <section className="lg:col-span-3">
            <div className="space-y-4 rounded-xl border border-border bg-card p-6">
              <Field label="Nome do signatário *">
                <input
                  required
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className={inputCls}
                  placeholder="Ex: João Silva"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Telefone *">
                  <input
                    required
                    value={signerPhone}
                    onChange={(e) => setSignerPhone(formatPhone(e.target.value))}
                    className={inputCls}
                    placeholder="(11) 99999-9999"
                    inputMode="tel"
                  />
                </Field>
                <Field label="E-mail do signatário *">
                  <input
                    required
                    type="email"
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    className={inputCls}
                    placeholder="joao@empresa.com"
                  />
                </Field>
              </div>
              <Field label={`Mensagem personalizada (${message.length}/500)`}>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                  className={`${inputCls} min-h-[96px] resize-y`}
                  placeholder="Opcional — incluída na mensagem para o signatário."
                />
              </Field>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-secondary px-6 py-3 text-base font-semibold text-secondary-foreground shadow-sm transition-all hover:bg-primary active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4" />
                    Enviar para assinatura
                  </>
                )}
              </button>
            </div>
          </section>
        </form>
      </main>

      {shareData && <SuccessModal data={shareData} onClose={() => setShareData(null)} />}
      {showUpgrade && usage && (
        <UpgradeModal
          used={usage.used}
          limit={usage.limit ?? 3}
          onClose={() => setShowUpgrade(false)}
          onUpgrade={() => navigate({ to: "/pricing" })}
        />
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function PlanPill({ plan, used, limit }: { plan: "free" | "pro"; used: number; limit: number | null }) {
  if (plan === "pro") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/15 px-3 py-1.5 text-xs font-semibold text-secondary">
        Plano Pro · ilimitado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-foreground">
      Plano Free · {used} de {limit}
    </span>
  );
}

function SuccessModal({ data, onClose }: { data: { link: string; text: string }; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(data.text);
    setCopied(true);
    toast.success("Mensagem copiada!");
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent">
            <CheckCircle2 className="h-9 w-9 text-secondary" />
          </div>
          <h2 className="text-2xl font-bold text-primary">Contrato pronto para envio!</h2>
          <p className="mt-1 text-sm text-muted-foreground">O link de assinatura expira em 48 horas.</p>
        </div>
        <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Mensagem pronta para o WhatsApp
          </p>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-sm text-foreground">
            {data.text}
          </pre>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={copy}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-3 font-semibold text-secondary-foreground transition-colors hover:bg-primary"
          >
            <Copy className="h-4 w-4" />
            {copied ? "Copiado!" : "Copiar mensagem"}
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