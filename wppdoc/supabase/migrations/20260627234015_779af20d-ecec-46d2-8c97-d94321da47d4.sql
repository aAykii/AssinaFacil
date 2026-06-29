
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  document_name TEXT NOT NULL,
  document_path TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_phone TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '48 hours'),
  signed_at TIMESTAMPTZ,
  signed_name TEXT
);

CREATE INDEX idx_contracts_token ON public.contracts(token);
CREATE INDEX idx_contracts_sender_email ON public.contracts(sender_email);

GRANT SELECT, INSERT, UPDATE ON public.contracts TO anon, authenticated;
GRANT ALL ON public.contracts TO service_role;

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- MVP: no auth. Anyone can read/insert; updates restricted to pending contracts (signing flow)
CREATE POLICY "Anyone can view contracts" ON public.contracts FOR SELECT USING (true);
CREATE POLICY "Anyone can create contracts" ON public.contracts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can sign pending contracts" ON public.contracts FOR UPDATE USING (status = 'pending') WITH CHECK (true);
