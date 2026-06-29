
-- Contracts SELECT: owner only
drop policy if exists "Anyone can view contracts" on public.contracts;
create policy "Users view own contracts" on public.contracts
  for select to authenticated using (auth.uid() = user_id);

-- Remove public UPDATE; signing is funneled through a SECURITY DEFINER RPC
drop policy if exists "Anyone can sign pending contracts" on public.contracts;

-- RPC: fetch contract by token (used by public signing page)
create or replace function public.get_contract_by_token(_token uuid)
returns public.contracts
language sql
stable
security definer
set search_path = public
as $$
  select * from public.contracts where token = _token limit 1;
$$;
revoke all on function public.get_contract_by_token(uuid) from public;
grant execute on function public.get_contract_by_token(uuid) to anon, authenticated;

-- RPC: sign a pending, non-expired contract
create or replace function public.sign_contract(_token uuid, _name text)
returns public.contracts
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.contracts;
begin
  update public.contracts
    set status = 'signed',
        signed_at = now(),
        signed_name = _name
    where token = _token
      and status = 'pending'
      and expires_at > now()
    returning * into rec;
  if rec.id is null then
    raise exception 'Invalid or expired contract token';
  end if;
  return rec;
end;
$$;
revoke all on function public.sign_contract(uuid, text) from public;
grant execute on function public.sign_contract(uuid, text) to anon, authenticated;

-- Storage: only authenticated users can upload, only into their own folder
drop policy if exists "Anyone can upload contracts" on storage.objects;
create policy "Users upload to own folder in contracts"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
