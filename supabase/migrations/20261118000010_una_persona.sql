-- En la gomeria trabaja una sola persona, con un elevador y una alineadora.
-- Si esta haciendo un trabajo no puede hacer otro: como maximo `personas` turnos superpuestos,
-- ademas de que cada maquina no se use dos veces a la vez (constraint de exclusion existente).

alter table public.config_negocio
  add column personas integer not null default 1 check (personas between 1 and 20);
comment on column public.config_negocio.personas is 'Personas trabajando: cantidad maxima de turnos al mismo tiempo';

-- Hay un solo elevador
update public.recursos set activo = false where nombre = 'Elevador 2';

-- ¿Queda alguien libre para trabajar en ese rango? (turnos activos superpuestos < personas)
create or replace function public.capacidad_libre(p_inicio timestamptz, p_fin timestamptz, p_excluir_turno uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (
    select count(*) from public.turnos t
    where t.estado in ('pendiente_pago', 'confirmado', 'en_curso', 'completado')
      and (p_excluir_turno is null or t.id <> p_excluir_turno)
      and tstzrange(t.inicio, t.fin) && tstzrange(p_inicio, p_fin)
  ) < (select c.personas from public.config_negocio c where c.id = 1);
$$;

revoke execute on function public.capacidad_libre(timestamptz, timestamptz, uuid) from public, anon;
grant execute on function public.capacidad_libre(timestamptz, timestamptz, uuid) to authenticated;

-- recurso_libre ahora tambien exige que haya una persona libre.
-- Lo usan disponibilidad (web y agente), reservar_turno y el panel.
create or replace function public.recurso_libre(p_tipo text, p_inicio timestamptz, p_fin timestamptz, p_excluir_turno uuid default null)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select r.id from public.recursos r
  where r.activo and r.tipo = p_tipo
    and public.capacidad_libre(p_inicio, p_fin, p_excluir_turno)
    and not exists (
      select 1 from public.turnos t
      where t.recurso_id = r.id
        and t.estado in ('pendiente_pago', 'confirmado', 'en_curso', 'completado')
        and (p_excluir_turno is null or t.id <> p_excluir_turno)
        and tstzrange(t.inicio, t.fin) && tstzrange(p_inicio, p_fin))
    and not exists (
      select 1 from public.bloqueos b
      where (b.recurso_id = r.id or b.recurso_id is null)
        and tstzrange(b.inicio, b.fin) && tstzrange(p_inicio, p_fin))
  order by r.nombre
  limit 1
$$;

-- Garantia final en la base: aunque dos reservas lleguen al mismo tiempo (web + agente),
-- el lock serializa la verificacion y nunca quedan mas turnos superpuestos que personas.
create or replace function public.turnos_controlar_capacidad()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.estado not in ('pendiente_pago', 'confirmado', 'en_curso', 'completado') then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.inicio = new.inicio and old.fin = new.fin
     and old.estado in ('pendiente_pago', 'confirmado', 'en_curso', 'completado') then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('turnos_capacidad'));
  if not public.capacidad_libre(new.inicio, new.fin, new.id) then
    raise exception 'horario_no_disponible: persona_ocupada'
      using hint = 'Ya hay otro trabajo en ese horario y hay una sola persona trabajando.';
  end if;
  return new;
end;
$$;

revoke execute on function public.turnos_controlar_capacidad() from public, anon, authenticated;

create trigger turnos_capacidad
  before insert or update of inicio, fin, estado on public.turnos
  for each row execute function public.turnos_controlar_capacidad();
