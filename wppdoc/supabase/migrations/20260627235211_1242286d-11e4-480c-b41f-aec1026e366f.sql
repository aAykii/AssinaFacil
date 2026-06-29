
-- Revoke EXECUTE on trigger function (only the trigger owner needs it)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

-- Tighten the public "sign pending" policy: only allow setting signed_at/signed_name and status->signed
DROP POLICY IF EXISTS "Anyone can sign pending contracts" ON public.contracts;
CREATE POLICY "Anyone can sign pending contracts" ON public.contracts
  FOR UPDATE TO anon, authenticated
  USING (status = 'pending' AND expires_at > now())
  WITH CHECK (status IN ('pending','signed'));
