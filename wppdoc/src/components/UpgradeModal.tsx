import { Sparkles, X, Check } from "lucide-react";

export function UpgradeModal({
  used,
  limit,
  onClose,
  onUpgrade,
  loading,
}: {
  used: number;
  limit: number;
  onClose: () => void;
  onUpgrade: () => void;
  loading?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl sm:p-8">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-muted"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent">
            <Sparkles className="h-8 w-8 text-secondary" />
          </div>
          <h2 className="text-2xl font-bold text-primary">Limite do plano Free atingido</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Você já enviou {used} de {limit} contratos este mês. Faça upgrade para o plano Pro
            e envie quantos contratos quiser.
          </p>
        </div>

        <div className="mt-6 rounded-xl border-2 border-secondary bg-accent/30 p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold text-primary">Pro</span>
            <span>
              <span className="text-3xl font-bold text-primary">$29</span>
              <span className="text-sm text-muted-foreground">/mês</span>
            </span>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-center gap-2 text-foreground">
              <Check className="h-4 w-4 text-secondary" /> Contratos ilimitados
            </li>
            <li className="flex items-center gap-2 text-foreground">
              <Check className="h-4 w-4 text-secondary" /> Dashboard completo
            </li>
            <li className="flex items-center gap-2 text-foreground">
              <Check className="h-4 w-4 text-secondary" /> Cancele quando quiser
            </li>
          </ul>
        </div>

        <button
          onClick={onUpgrade}
          disabled={loading}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-3 font-semibold text-secondary-foreground hover:bg-primary disabled:opacity-60"
        >
          {loading ? "Abrindo checkout..." : "Assinar plano Pro"}
        </button>
      </div>
    </div>
  );
}