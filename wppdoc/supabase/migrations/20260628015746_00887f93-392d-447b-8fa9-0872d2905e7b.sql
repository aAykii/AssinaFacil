
create or replace function public.enforce_free_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_plan text;
  monthly_count int;
begin
  select plan into user_plan from public.profiles where id = NEW.user_id;
  if user_plan is null then
    user_plan := 'free';
  end if;

  if user_plan = 'free' then
    select count(*) into monthly_count
      from public.contracts
      where user_id = NEW.user_id
        and created_at >= date_trunc('month', now());

    if monthly_count >= 3 then
      raise exception 'Free plan limit reached: 3 contracts per month. Upgrade to Pro for unlimited.'
        using errcode = 'P0001';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists enforce_free_plan_limit_trg on public.contracts;
create trigger enforce_free_plan_limit_trg
  before insert on public.contracts
  for each row execute function public.enforce_free_plan_limit();
