-- Campos opcionales solicitados y auditoría de cambios.
alter table public.encargos
  add column if not exists dni text,
  add column if not exists observaciones text,
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists updated_by uuid references auth.users(id);

-- Solo empleados autenticados pueden gestionar la agenda compartida.
drop policy if exists encargos_public_select on public.encargos;
drop policy if exists encargos_public_insert on public.encargos;
drop policy if exists encargos_public_update on public.encargos;
drop policy if exists encargos_public_delete on public.encargos;

revoke all on table public.encargos from anon, authenticated;
grant select, insert, update, delete on table public.encargos to authenticated;

alter table public.encargos enable row level security;

create policy encargos_empleados_select on public.encargos
  for select to authenticated using (true);
create policy encargos_empleados_insert on public.encargos
  for insert to authenticated with check (true);
create policy encargos_empleados_update on public.encargos
  for update to authenticated using (true) with check (true);
create policy encargos_empleados_delete on public.encargos
  for delete to authenticated using (true);

create or replace function public.set_encargo_audit_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_encargo_audit_fields on public.encargos;
create trigger set_encargo_audit_fields
before insert or update on public.encargos
for each row execute function public.set_encargo_audit_fields();