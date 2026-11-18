-- Fase 4b: campañas a clientes por WhatsApp
-- Recordatorios por servicio ("hace 6 meses alineaste"), clientes inactivos y mensajes libres.
-- La logica de a quien escribirle vive en SQL (campana_destinatarios) para que el agente IA la pueda reutilizar.

alter table public.clientes add column acepta_promos boolean not null default true;
comment on column public.clientes.acepta_promos is 'Si es false, el cliente no aparece en ninguna campaña';

create table public.campanas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) between 2 and 120),
  tipo text not null check (tipo in ('recordatorio', 'inactivos', 'libre')),
  servicio_ids uuid[] not null default '{}',
  meses integer not null default 6 check (meses between 0 and 60),
  mensaje text not null check (length(mensaje) between 5 and 2000),
  activa boolean not null default true,
  creado_por uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
comment on column public.campanas.servicio_ids is 'Solo recordatorio: servicios que cuentan como "la ultima vez". Vacio = cualquier servicio';
comment on column public.campanas.meses is 'Recordatorio/inactivos: meses desde la ultima visita para entrar en la lista';

create table public.campana_envios (
  id uuid primary key default gen_random_uuid(),
  campana_id uuid not null references public.campanas(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  enviado_en timestamptz not null default now(),
  enviado_por uuid default auth.uid() references public.profiles(id) on delete set null
);
create index campana_envios_campana_cliente on public.campana_envios (campana_id, cliente_id, enviado_en desc);
create index campana_envios_cliente on public.campana_envios (cliente_id);

alter table public.campanas enable row level security;
alter table public.campana_envios enable row level security;

create policy campanas_staff_sel on public.campanas for select to authenticated using ((select public.es_staff()));
create policy campanas_staff_ins on public.campanas for insert to authenticated with check ((select public.es_staff()));
create policy campanas_staff_upd on public.campanas for update to authenticated using ((select public.es_staff())) with check ((select public.es_staff()));
create policy campanas_staff_del on public.campanas for delete to authenticated using ((select public.es_staff()));

create policy campana_envios_staff_sel on public.campana_envios for select to authenticated using ((select public.es_staff()));
create policy campana_envios_staff_ins on public.campana_envios for insert to authenticated with check ((select public.es_staff()));
create policy campana_envios_staff_del on public.campana_envios for delete to authenticated using ((select public.es_staff()));

-- Destinatarios de una campaña.
-- Visitas = turnos completados + servicios de ordenes terminadas o cobradas.
-- ya_enviado: se le escribio por esta campaña despues de su ultima visita (o alguna vez, si es libre).
create or replace function public.campana_destinatarios(p_campana uuid)
returns table (
  cliente_id uuid,
  nombre text,
  telefono text,
  ultima_visita timestamptz,
  servicio text,
  vehiculo text,
  meses integer,
  enviado_en timestamptz,
  ya_enviado boolean,
  turno_proximo timestamptz
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  c public.campanas;
begin
  if not public.es_staff() then
    raise exception 'sin_permiso';
  end if;
  select * into c from public.campanas where id = p_campana;
  if not found then
    raise exception 'campana_inexistente';
  end if;

  return query
  with visitas as (
    select t.cliente_id, t.vehiculo_id, t.servicio_id, t.inicio as fecha
    from public.turnos t
    where t.estado = 'completado'
    union all
    select o.cliente_id, o.vehiculo_id, oi.servicio_id, coalesce(o.cobrada_en, o.created_at)
    from public.ordenes o
    join public.orden_items oi on oi.orden_id = o.id
    where o.estado in ('terminada', 'cobrada') and oi.tipo = 'servicio' and oi.servicio_id is not null and o.cliente_id is not null
  ),
  filtradas as (
    select v.* from visitas v
    where c.tipo <> 'recordatorio' or cardinality(c.servicio_ids) = 0 or v.servicio_id = any (c.servicio_ids)
  ),
  ultima as (
    select distinct on (f.cliente_id) f.cliente_id, f.vehiculo_id, f.servicio_id, f.fecha
    from filtradas f
    order by f.cliente_id, f.fecha desc
  ),
  envios as (
    select e.cliente_id, max(e.enviado_en) as enviado_en
    from public.campana_envios e
    where e.campana_id = c.id
    group by e.cliente_id
  )
  select
    cl.id,
    cl.nombre,
    cl.telefono,
    u.fecha,
    s.nombre,
    nullif(trim(concat_ws(' ', ve.marca, ve.modelo)), ''),
    case when u.fecha is null then null
         else (extract(year from age(now(), u.fecha)) * 12 + extract(month from age(now(), u.fecha)))::integer end,
    en.enviado_en,
    coalesce(en.enviado_en > coalesce(u.fecha, '-infinity'::timestamptz), false),
    (select min(t.inicio) from public.turnos t
      where t.cliente_id = cl.id and t.inicio > now() and t.estado in ('pendiente_pago', 'confirmado'))
  from public.clientes cl
  left join ultima u on u.cliente_id = cl.id
  left join public.servicios s on s.id = u.servicio_id
  left join public.vehiculos ve on ve.id = u.vehiculo_id
  left join envios en on en.cliente_id = cl.id
  where cl.telefono is not null
    and cl.acepta_promos
    and (c.tipo = 'libre' or (u.fecha is not null and u.fecha <= now() - make_interval(months => c.meses)))
  order by u.fecha asc nulls last, cl.nombre;
end;
$$;

revoke execute on function public.campana_destinatarios(uuid) from public, anon;
grant execute on function public.campana_destinatarios(uuid) to authenticated;

-- Campañas iniciales
insert into public.campanas (nombre, tipo, servicio_ids, meses, mensaje)
select 'Alineación cada 6 meses', 'recordatorio',
  coalesce(array_agg(id) filter (where nombre ilike 'alineaci%'), '{}'), 6,
  'Hola {nombre}! Te escribimos de {negocio}. Hace {meses} meses le hicimos {servicio} a tu {vehiculo}. Recomendamos revisar la alineación cada 6 meses o 10.000 km para cuidar las cubiertas y la dirección. ¿Te agendamos un turno?'
from public.servicios;

insert into public.campanas (nombre, tipo, servicio_ids, meses, mensaje)
select 'Balanceo cada 6 meses', 'recordatorio',
  coalesce(array_agg(id) filter (where nombre ilike '%balanceo%'), '{}'), 6,
  'Hola {nombre}! Te escribimos de {negocio}. Hace {meses} meses balanceamos las ruedas de tu {vehiculo}. Si notás vibraciones en el volante es momento de revisarlo. ¿Querés que te reservemos un turno?'
from public.servicios;

insert into public.campanas (nombre, tipo, meses, mensaje) values
  ('Te extrañamos (1 año sin venir)', 'inactivos', 12,
   'Hola {nombre}! Hace tiempo que no te vemos por {negocio}. Si tu {vehiculo} necesita alineación, balanceo o cubiertas, estamos para ayudarte. Escribinos y te damos turno.');
