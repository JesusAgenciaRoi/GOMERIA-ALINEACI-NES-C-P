-- CRM Gomeria & Alineaciones C&P - esquema inicial (fase 1)
create extension if not exists btree_gist with schema extensions;

-- ============ Configuracion del negocio (fila unica) ============
create table public.config_negocio (
  id smallint primary key default 1 check (id = 1),
  nombre text not null default 'Gomeria & Alineaciones C&P',
  telefono text,
  whatsapp text,
  email text,
  direccion text,
  instagram text,
  facebook text,
  zona_horaria text not null default 'America/Argentina/Buenos_Aires',
  intervalo_min int not null default 30 check (intervalo_min between 5 and 240),
  anticipacion_min_horas int not null default 2 check (anticipacion_min_horas >= 0),
  dias_max_reserva int not null default 30 check (dias_max_reserva between 1 and 365),
  sena_activa boolean not null default false,
  sena_minutos_vencimiento int not null default 30
);

-- ============ Perfiles y roles ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  email text,
  rol text not null default 'pendiente' check (rol in ('admin', 'empleado', 'pendiente')),
  created_at timestamptz not null default now()
);

create function public.rol_actual()
returns text language sql stable security definer set search_path = ''
as $$ select rol from public.profiles where id = (select auth.uid()) $$;

create function public.es_staff()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce((select rol from public.profiles where id = (select auth.uid())) in ('admin','empleado'), false) $$;

create function public.es_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce((select rol from public.profiles where id = (select auth.uid())) = 'admin', false) $$;

-- El primer usuario registrado es admin; los siguientes quedan pendientes hasta que el admin los apruebe.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nombre, email, rol)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nombre', ''), split_part(new.email, '@', 1)),
    new.email,
    case when exists (select 1 from public.profiles where rol = 'admin') then 'pendiente' else 'admin' end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ Clientes y vehiculos ============
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 2 and 120),
  telefono text unique,
  email text,
  notas text,
  origen text not null default 'local' check (origen in ('local', 'web', 'whatsapp', 'agente', 'referido', 'redes')),
  created_at timestamptz not null default now()
);
create index clientes_nombre_idx on public.clientes using gin (to_tsvector('simple', nombre));

create table public.vehiculos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  patente text unique,
  marca text,
  modelo text,
  anio int check (anio between 1900 and 2100),
  medida_cubierta text,
  notas text,
  created_at timestamptz not null default now()
);
create index vehiculos_cliente_idx on public.vehiculos (cliente_id);

-- ============ Servicios, recursos y horarios ============
create table public.servicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  duracion_min int not null check (duracion_min between 5 and 600),
  precio numeric(12,2),
  tipo_recurso text not null default 'elevador',
  requiere_sena boolean not null default false,
  monto_sena numeric(12,2),
  reservable_web boolean not null default true,
  activo boolean not null default true,
  orden int not null default 0
);

create table public.recursos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo text not null default 'elevador',
  activo boolean not null default true
);

create table public.horarios (
  id uuid primary key default gen_random_uuid(),
  dia_semana smallint not null check (dia_semana between 0 and 6), -- 0 = domingo
  apertura time not null,
  cierre time not null,
  check (cierre > apertura)
);

create table public.bloqueos (
  id uuid primary key default gen_random_uuid(),
  recurso_id uuid references public.recursos(id) on delete cascade, -- null = todo el local
  inicio timestamptz not null,
  fin timestamptz not null,
  motivo text,
  check (fin > inicio)
);
create index bloqueos_recurso_idx on public.bloqueos (recurso_id);

-- ============ Turnos ============
create table public.turnos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  vehiculo_id uuid references public.vehiculos(id) on delete set null,
  servicio_id uuid not null references public.servicios(id) on delete restrict,
  recurso_id uuid not null references public.recursos(id) on delete restrict,
  inicio timestamptz not null,
  fin timestamptz not null,
  estado text not null default 'confirmado'
    check (estado in ('pendiente_pago', 'confirmado', 'en_curso', 'completado', 'cancelado', 'no_asistio')),
  origen text not null default 'local' check (origen in ('local', 'web', 'whatsapp', 'agente', 'telefono')),
  precio numeric(12,2),
  notas text,
  sena_vence_en timestamptz,
  creado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (fin > inicio),
  constraint turnos_sin_superposicion exclude using gist (
    recurso_id with =,
    tstzrange(inicio, fin) with &&
  ) where (estado in ('pendiente_pago', 'confirmado', 'en_curso', 'completado'))
);
create index turnos_inicio_idx on public.turnos (inicio);
create index turnos_cliente_idx on public.turnos (cliente_id);
create index turnos_vehiculo_idx on public.turnos (vehiculo_id);
create index turnos_servicio_idx on public.turnos (servicio_id);
create index turnos_creado_por_idx on public.turnos (creado_por);

-- ============ Pagos (sena via Mercado Pago, fase 3) ============
create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  turno_id uuid references public.turnos(id) on delete set null,
  proveedor text not null default 'mercadopago',
  monto numeric(12,2) not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado', 'reembolsado')),
  referencia_externa text unique,
  datos jsonb,
  created_at timestamptz not null default now()
);
create index pagos_turno_idx on public.pagos (turno_id);

-- ============ RLS ============
alter table public.config_negocio enable row level security;
alter table public.profiles enable row level security;
alter table public.clientes enable row level security;
alter table public.vehiculos enable row level security;
alter table public.servicios enable row level security;
alter table public.recursos enable row level security;
alter table public.horarios enable row level security;
alter table public.bloqueos enable row level security;
alter table public.turnos enable row level security;
alter table public.pagos enable row level security;

-- Datos publicos (web): config, servicios activos, horarios
create policy config_lectura on public.config_negocio for select to anon, authenticated using (true);
create policy config_admin on public.config_negocio for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

create policy servicios_lectura on public.servicios for select to anon, authenticated
  using (activo or (select public.es_staff()));
create policy servicios_admin_ins on public.servicios for insert to authenticated with check ((select public.es_admin()));
create policy servicios_admin_upd on public.servicios for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy servicios_admin_del on public.servicios for delete to authenticated using ((select public.es_admin()));

create policy horarios_lectura on public.horarios for select to anon, authenticated using (true);
create policy horarios_admin_ins on public.horarios for insert to authenticated with check ((select public.es_admin()));
create policy horarios_admin_upd on public.horarios for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy horarios_admin_del on public.horarios for delete to authenticated using ((select public.es_admin()));

-- Perfiles: cada uno ve el suyo; el admin ve y edita todos
create policy profiles_lectura on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.es_admin()));
create policy profiles_admin_upd on public.profiles for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));

-- Operacion diaria: staff lee/crea/edita; borrar solo admin
create policy clientes_staff_sel on public.clientes for select to authenticated using ((select public.es_staff()));
create policy clientes_staff_ins on public.clientes for insert to authenticated with check ((select public.es_staff()));
create policy clientes_staff_upd on public.clientes for update to authenticated
  using ((select public.es_staff())) with check ((select public.es_staff()));
create policy clientes_admin_del on public.clientes for delete to authenticated using ((select public.es_admin()));

create policy vehiculos_staff_sel on public.vehiculos for select to authenticated using ((select public.es_staff()));
create policy vehiculos_staff_ins on public.vehiculos for insert to authenticated with check ((select public.es_staff()));
create policy vehiculos_staff_upd on public.vehiculos for update to authenticated
  using ((select public.es_staff())) with check ((select public.es_staff()));
create policy vehiculos_staff_del on public.vehiculos for delete to authenticated using ((select public.es_staff()));

create policy turnos_staff_sel on public.turnos for select to authenticated using ((select public.es_staff()));
create policy turnos_staff_ins on public.turnos for insert to authenticated with check ((select public.es_staff()));
create policy turnos_staff_upd on public.turnos for update to authenticated
  using ((select public.es_staff())) with check ((select public.es_staff()));
create policy turnos_admin_del on public.turnos for delete to authenticated using ((select public.es_admin()));

create policy recursos_staff_sel on public.recursos for select to authenticated using ((select public.es_staff()));
create policy recursos_admin_ins on public.recursos for insert to authenticated with check ((select public.es_admin()));
create policy recursos_admin_upd on public.recursos for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy recursos_admin_del on public.recursos for delete to authenticated using ((select public.es_admin()));

create policy bloqueos_staff_sel on public.bloqueos for select to authenticated using ((select public.es_staff()));
create policy bloqueos_staff_ins on public.bloqueos for insert to authenticated with check ((select public.es_staff()));
create policy bloqueos_staff_upd on public.bloqueos for update to authenticated
  using ((select public.es_staff())) with check ((select public.es_staff()));
create policy bloqueos_staff_del on public.bloqueos for delete to authenticated using ((select public.es_staff()));

create policy pagos_admin_sel on public.pagos for select to authenticated using ((select public.es_admin()));

-- ============ Logica de turnos (reutilizable por web, panel y agente IA) ============

-- Recurso libre de un tipo para un rango (null si no hay)
create function public.recurso_libre(p_tipo text, p_inicio timestamptz, p_fin timestamptz, p_excluir_turno uuid default null)
returns uuid language sql stable security definer set search_path = ''
as $$
  select r.id from public.recursos r
  where r.activo and r.tipo = p_tipo
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

-- Horarios disponibles para un servicio en una fecha (hora local del negocio)
create function public.disponibilidad(p_servicio_id uuid, p_fecha date)
returns table (hora timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_serv public.servicios%rowtype;
  v_cfg public.config_negocio%rowtype;
  v_hoy date;
begin
  select * into v_serv from public.servicios s where s.id = p_servicio_id and s.activo and s.reservable_web;
  if not found then return; end if;
  select * into v_cfg from public.config_negocio c where c.id = 1;
  v_hoy := (now() at time zone v_cfg.zona_horaria)::date;
  if p_fecha < v_hoy or p_fecha > v_hoy + v_cfg.dias_max_reserva then return; end if;

  return query
  with franjas as (
    select (p_fecha + h.apertura) at time zone v_cfg.zona_horaria as desde,
           (p_fecha + h.cierre) at time zone v_cfg.zona_horaria as hasta
    from public.horarios h
    where h.dia_semana = extract(dow from p_fecha)::int
  ), slots as (
    select gs as ini, gs + make_interval(mins => v_serv.duracion_min) as fin
    from franjas f,
      generate_series(f.desde, f.hasta - make_interval(mins => v_serv.duracion_min),
                      make_interval(mins => v_cfg.intervalo_min)) gs
  )
  select s.ini from slots s
  where s.ini >= now() + make_interval(hours => v_cfg.anticipacion_min_horas)
    and public.recurso_libre(v_serv.tipo_recurso, s.ini, s.fin) is not null
  order by s.ini;
end $$;

-- Reserva publica (web / agente). Crea o reutiliza cliente por telefono y vehiculo por patente.
create function public.reservar_turno(
  p_servicio_id uuid,
  p_inicio timestamptz,
  p_nombre text,
  p_telefono text,
  p_email text default null,
  p_patente text default null,
  p_marca text default null,
  p_modelo text default null,
  p_notas text default null,
  p_origen text default 'web'
) returns jsonb
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_serv public.servicios%rowtype;
  v_cfg public.config_negocio%rowtype;
  v_tel text := regexp_replace(coalesce(p_telefono, ''), '[^0-9+]', '', 'g');
  v_pat text := nullif(upper(regexp_replace(coalesce(p_patente, ''), '[^A-Za-z0-9]', '', 'g')), '');
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_fin timestamptz;
  v_recurso uuid;
  v_cliente uuid;
  v_vehiculo uuid;
  v_estado text;
  v_turno uuid;
begin
  if char_length(v_nombre) not between 2 and 120 then raise exception 'nombre_invalido'; end if;
  if char_length(v_tel) not between 6 and 20 then raise exception 'telefono_invalido'; end if;
  if p_origen not in ('web', 'agente', 'whatsapp') then raise exception 'origen_invalido'; end if;
  if char_length(coalesce(p_notas, '')) > 500 then raise exception 'notas_muy_largas'; end if;

  select * into v_serv from public.servicios s where s.id = p_servicio_id and s.activo and s.reservable_web;
  if not found then raise exception 'servicio_invalido'; end if;
  select * into v_cfg from public.config_negocio c where c.id = 1;

  if not exists (
    select 1 from public.disponibilidad(p_servicio_id, (p_inicio at time zone v_cfg.zona_horaria)::date) d
    where d.hora = p_inicio
  ) then
    raise exception 'horario_no_disponible';
  end if;

  v_fin := p_inicio + make_interval(mins => v_serv.duracion_min);
  v_recurso := public.recurso_libre(v_serv.tipo_recurso, p_inicio, v_fin);
  if v_recurso is null then raise exception 'horario_no_disponible'; end if;

  insert into public.clientes (nombre, telefono, email, origen)
  values (v_nombre, v_tel, nullif(btrim(p_email), ''), case when p_origen = 'web' then 'web' else p_origen end)
  on conflict (telefono) do update
    set email = coalesce(public.clientes.email, excluded.email)
  returning id into v_cliente;

  if v_pat is not null then
    insert into public.vehiculos (cliente_id, patente, marca, modelo)
    values (v_cliente, v_pat, nullif(btrim(p_marca), ''), nullif(btrim(p_modelo), ''))
    on conflict (patente) do update
      set marca = coalesce(public.vehiculos.marca, excluded.marca),
          modelo = coalesce(public.vehiculos.modelo, excluded.modelo)
    returning id into v_vehiculo;
  end if;

  v_estado := case when v_serv.requiere_sena and v_cfg.sena_activa then 'pendiente_pago' else 'confirmado' end;

  begin
    insert into public.turnos (cliente_id, vehiculo_id, servicio_id, recurso_id, inicio, fin, estado, origen, precio, notas, sena_vence_en)
    values (v_cliente, v_vehiculo, v_serv.id, v_recurso, p_inicio, v_fin, v_estado, p_origen, v_serv.precio,
            nullif(btrim(p_notas), ''),
            case when v_estado = 'pendiente_pago' then now() + make_interval(mins => v_cfg.sena_minutos_vencimiento) end)
    returning id into v_turno;
  exception when exclusion_violation then
    raise exception 'horario_no_disponible';
  end;

  return jsonb_build_object(
    'id', v_turno,
    'estado', v_estado,
    'inicio', p_inicio,
    'fin', v_fin,
    'servicio', v_serv.nombre,
    'precio', v_serv.precio,
    'monto_sena', case when v_estado = 'pendiente_pago' then v_serv.monto_sena end
  );
end $$;

-- Permisos de funciones
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.recurso_libre(text, timestamptz, timestamptz, uuid) from public, anon;
grant execute on function public.recurso_libre(text, timestamptz, timestamptz, uuid) to authenticated;
grant execute on function public.disponibilidad(uuid, date) to anon, authenticated;
grant execute on function public.reservar_turno(uuid, timestamptz, text, text, text, text, text, text, text, text) to anon, authenticated;
