-- Fase 2: inventario, ordenes de trabajo y caja

-- ============ Inventario ============
create table public.proveedores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 2 and 120),
  telefono text,
  email text,
  notas text,
  created_at timestamptz not null default now()
);

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  codigo text unique,
  nombre text not null check (char_length(nombre) between 2 and 160),
  categoria text not null default 'repuesto'
    check (categoria in ('cubierta', 'llanta', 'camara', 'valvula', 'repuesto', 'insumo', 'lubricante', 'otro')),
  marca text,
  medida text,
  condicion text not null default 'nueva' check (condicion in ('nueva', 'ocasion')),
  precio_costo numeric(12,2) check (precio_costo >= 0),
  precio_venta numeric(12,2) check (precio_venta >= 0),
  stock numeric(12,2) not null default 0,
  stock_minimo numeric(12,2) not null default 0 check (stock_minimo >= 0),
  proveedor_id uuid references public.proveedores(id) on delete set null,
  activo boolean not null default true,
  notas text,
  created_at timestamptz not null default now()
);
create index productos_categoria_idx on public.productos (categoria);
create index productos_proveedor_idx on public.productos (proveedor_id);

-- ============ Ordenes de trabajo ============
create table public.ordenes (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  vehiculo_id uuid references public.vehiculos(id) on delete set null,
  turno_id uuid unique references public.turnos(id) on delete set null,
  estado text not null default 'abierta'
    check (estado in ('abierta', 'en_proceso', 'terminada', 'cobrada', 'anulada')),
  km int check (km >= 0),
  notas text,
  descuento numeric(12,2) not null default 0 check (descuento >= 0),
  total numeric(12,2) not null default 0,
  factura text,
  cobrada_en timestamptz,
  creado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index ordenes_cliente_idx on public.ordenes (cliente_id);
create index ordenes_vehiculo_idx on public.ordenes (vehiculo_id);
create index ordenes_estado_idx on public.ordenes (estado, created_at desc);
create index ordenes_creado_por_idx on public.ordenes (creado_por);

create table public.orden_items (
  id uuid primary key default gen_random_uuid(),
  orden_id uuid not null references public.ordenes(id) on delete cascade,
  tipo text not null default 'servicio' check (tipo in ('servicio', 'producto', 'mano_obra', 'otro')),
  servicio_id uuid references public.servicios(id) on delete set null,
  producto_id uuid references public.productos(id) on delete restrict,
  descripcion text not null,
  cantidad numeric(12,2) not null default 1 check (cantidad > 0),
  precio_unitario numeric(12,2) not null default 0 check (precio_unitario >= 0),
  subtotal numeric(12,2) generated always as (round(cantidad * precio_unitario, 2)) stored,
  created_at timestamptz not null default now()
);
create index orden_items_orden_idx on public.orden_items (orden_id);
create index orden_items_servicio_idx on public.orden_items (servicio_id);
create index orden_items_producto_idx on public.orden_items (producto_id);

-- ============ Movimientos de stock ============
create table public.movimientos_stock (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id) on delete cascade,
  tipo text not null check (tipo in ('ingreso', 'venta', 'ajuste', 'devolucion')),
  cantidad numeric(12,2) not null check (cantidad <> 0), -- positivo entra, negativo sale
  costo_unitario numeric(12,2),
  proveedor_id uuid references public.proveedores(id) on delete set null,
  orden_id uuid references public.ordenes(id) on delete set null,
  motivo text,
  creado_por uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index movimientos_producto_idx on public.movimientos_stock (producto_id, created_at desc);
create index movimientos_proveedor_idx on public.movimientos_stock (proveedor_id);
create index movimientos_orden_idx on public.movimientos_stock (orden_id);
create index movimientos_creado_por_idx on public.movimientos_stock (creado_por);

-- ============ Caja ============
create table public.caja_movimientos (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null default now(),
  tipo text not null check (tipo in ('ingreso', 'egreso')),
  categoria text not null default 'venta'
    check (categoria in ('venta', 'sena', 'otro_ingreso', 'compra', 'gasto', 'sueldo', 'retiro', 'anulacion', 'otro_egreso')),
  medio text not null default 'efectivo'
    check (medio in ('efectivo', 'debito', 'credito', 'transferencia', 'mercadopago', 'otro')),
  monto numeric(12,2) not null check (monto > 0),
  concepto text,
  orden_id uuid references public.ordenes(id) on delete set null,
  creado_por uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index caja_fecha_idx on public.caja_movimientos (fecha desc);
create index caja_orden_idx on public.caja_movimientos (orden_id);
create index caja_creado_por_idx on public.caja_movimientos (creado_por);

-- ============ Triggers ============

-- El stock se actualiza solo a partir de los movimientos
create function public.aplicar_movimiento_stock()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.productos set stock = stock + new.cantidad where id = new.producto_id;
  return new;
end $$;
create trigger movimientos_stock_aplicar after insert on public.movimientos_stock
  for each row execute function public.aplicar_movimiento_stock();

-- Total de la orden = suma de items - descuento
create function public.recalcular_orden(p_orden uuid)
returns void language sql security definer set search_path = ''
as $$
  update public.ordenes o
  set total = greatest(0, coalesce((select sum(i.subtotal) from public.orden_items i where i.orden_id = o.id), 0) - o.descuento)
  where o.id = p_orden
$$;

create function public.orden_items_cambio()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_orden uuid := coalesce(new.orden_id, old.orden_id);
  v_estado text;
begin
  select estado into v_estado from public.ordenes where id = v_orden;
  if v_estado in ('cobrada', 'anulada') then raise exception 'orden_cerrada'; end if;
  perform public.recalcular_orden(v_orden);
  return null;
end $$;
create trigger orden_items_recalcular after insert or update or delete on public.orden_items
  for each row execute function public.orden_items_cambio();

-- Proteccion de estados: cobrar/anular una orden cobrada solo via funciones
create function public.ordenes_control()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.descuento is distinct from old.descuento then
    if old.estado in ('cobrada', 'anulada') then raise exception 'orden_cerrada'; end if;
    new.total := greatest(0, coalesce((select sum(i.subtotal) from public.orden_items i where i.orden_id = new.id), 0) - new.descuento);
  end if;
  if new.estado is distinct from old.estado and coalesce(current_setting('app.orden_op', true), '') <> 'si' then
    if new.estado = 'cobrada' then raise exception 'usar_cobrar_orden'; end if;
    if old.estado = 'cobrada' then raise exception 'usar_anular_orden'; end if;
    if old.estado = 'anulada' then raise exception 'orden_cerrada'; end if;
  end if;
  return new;
end $$;
create trigger ordenes_control before update on public.ordenes
  for each row execute function public.ordenes_control();

-- ============ Funciones de negocio ============

-- Cobra una orden: registra pagos en caja, descuenta stock y completa el turno.
-- p_pagos: [{"medio": "efectivo", "monto": 1000}, ...]
create function public.cobrar_orden(p_orden uuid, p_pagos jsonb, p_factura text default null)
returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_o public.ordenes%rowtype;
  v_suma numeric(12,2);
  v_pago jsonb;
begin
  if not public.es_staff() then raise exception 'sin_permiso'; end if;
  select * into v_o from public.ordenes where id = p_orden for update;
  if not found then raise exception 'orden_inexistente'; end if;
  if v_o.estado in ('cobrada', 'anulada') then raise exception 'orden_cerrada'; end if;

  select coalesce(sum((x->>'monto')::numeric), 0) into v_suma from jsonb_array_elements(coalesce(p_pagos, '[]'::jsonb)) x;
  if v_suma <> v_o.total then raise exception 'pagos_no_coinciden'; end if;

  for v_pago in select * from jsonb_array_elements(coalesce(p_pagos, '[]'::jsonb)) loop
    if (v_pago->>'monto')::numeric > 0 then
      insert into public.caja_movimientos (tipo, categoria, medio, monto, concepto, orden_id)
      values ('ingreso', 'venta', v_pago->>'medio', (v_pago->>'monto')::numeric, 'Orden #' || v_o.numero, v_o.id);
    end if;
  end loop;

  insert into public.movimientos_stock (producto_id, tipo, cantidad, orden_id, motivo)
  select i.producto_id, 'venta', -i.cantidad, v_o.id, 'Orden #' || v_o.numero
  from public.orden_items i where i.orden_id = v_o.id and i.producto_id is not null;

  perform set_config('app.orden_op', 'si', true);
  update public.ordenes set estado = 'cobrada', cobrada_en = now(), factura = coalesce(nullif(btrim(p_factura), ''), factura)
  where id = v_o.id;
  perform set_config('app.orden_op', '', true);

  if v_o.turno_id is not null then
    update public.turnos set estado = 'completado'
    where id = v_o.turno_id and estado in ('confirmado', 'en_curso', 'pendiente_pago');
  end if;

  return jsonb_build_object('numero', v_o.numero, 'total', v_o.total);
end $$;

-- Anula una orden. Si estaba cobrada (solo admin): devuelve stock y registra el reintegro en caja.
create function public.anular_orden(p_orden uuid, p_motivo text default null)
returns void language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_o public.ordenes%rowtype;
begin
  if not public.es_staff() then raise exception 'sin_permiso'; end if;
  select * into v_o from public.ordenes where id = p_orden for update;
  if not found then raise exception 'orden_inexistente'; end if;
  if v_o.estado = 'anulada' then return; end if;

  if v_o.estado = 'cobrada' then
    if not public.es_admin() then raise exception 'solo_admin'; end if;
    insert into public.movimientos_stock (producto_id, tipo, cantidad, orden_id, motivo)
    select i.producto_id, 'devolucion', i.cantidad, v_o.id, 'Anulación orden #' || v_o.numero
    from public.orden_items i where i.orden_id = v_o.id and i.producto_id is not null;

    insert into public.caja_movimientos (tipo, categoria, medio, monto, concepto, orden_id)
    select 'egreso', 'anulacion', c.medio, c.monto, 'Anulación orden #' || v_o.numero || coalesce(' - ' || p_motivo, ''), v_o.id
    from public.caja_movimientos c where c.orden_id = v_o.id and c.tipo = 'ingreso';
  end if;

  perform set_config('app.orden_op', 'si', true);
  update public.ordenes set estado = 'anulada',
    notas = case when p_motivo is null then notas else coalesce(notas || E'\n', '') || 'Anulada: ' || p_motivo end
  where id = v_o.id;
  perform set_config('app.orden_op', '', true);
end $$;

-- ============ RLS ============
alter table public.proveedores enable row level security;
alter table public.productos enable row level security;
alter table public.ordenes enable row level security;
alter table public.orden_items enable row level security;
alter table public.movimientos_stock enable row level security;
alter table public.caja_movimientos enable row level security;

create policy proveedores_staff_sel on public.proveedores for select to authenticated using ((select public.es_staff()));
create policy proveedores_admin_ins on public.proveedores for insert to authenticated with check ((select public.es_admin()));
create policy proveedores_admin_upd on public.proveedores for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
create policy proveedores_admin_del on public.proveedores for delete to authenticated using ((select public.es_admin()));

create policy productos_staff_sel on public.productos for select to authenticated using ((select public.es_staff()));
create policy productos_admin_ins on public.productos for insert to authenticated with check ((select public.es_admin()));
create policy productos_admin_upd on public.productos for update to authenticated using ((select public.es_admin())) with check ((select public.es_admin()));
create policy productos_admin_del on public.productos for delete to authenticated using ((select public.es_admin()));

create policy ordenes_staff_sel on public.ordenes for select to authenticated using ((select public.es_staff()));
create policy ordenes_staff_ins on public.ordenes for insert to authenticated with check ((select public.es_staff()));
create policy ordenes_staff_upd on public.ordenes for update to authenticated using ((select public.es_staff())) with check ((select public.es_staff()));

create policy orden_items_staff_sel on public.orden_items for select to authenticated using ((select public.es_staff()));
create policy orden_items_staff_ins on public.orden_items for insert to authenticated with check ((select public.es_staff()));
create policy orden_items_staff_upd on public.orden_items for update to authenticated using ((select public.es_staff())) with check ((select public.es_staff()));
create policy orden_items_staff_del on public.orden_items for delete to authenticated using ((select public.es_staff()));

-- Stock: staff carga ingresos; ajustes solo admin. Los movimientos no se editan ni borran.
create policy movimientos_staff_sel on public.movimientos_stock for select to authenticated using ((select public.es_staff()));
create policy movimientos_staff_ins on public.movimientos_stock for insert to authenticated
  with check ((select public.es_staff()) and (tipo = 'ingreso' or (select public.es_admin())));

-- Caja: solo admin (los cobros de ordenes entran via cobrar_orden)
create policy caja_admin_sel on public.caja_movimientos for select to authenticated using ((select public.es_admin()));
create policy caja_admin_ins on public.caja_movimientos for insert to authenticated with check ((select public.es_admin()));
create policy caja_admin_del on public.caja_movimientos for delete to authenticated using ((select public.es_admin()) and orden_id is null);

-- Permisos de funciones
revoke execute on function public.aplicar_movimiento_stock() from public, anon, authenticated;
revoke execute on function public.orden_items_cambio() from public, anon, authenticated;
revoke execute on function public.ordenes_control() from public, anon, authenticated;
revoke execute on function public.recalcular_orden(uuid) from public, anon, authenticated;
revoke execute on function public.cobrar_orden(uuid, jsonb, text) from public, anon;
revoke execute on function public.anular_orden(uuid, text) from public, anon;
grant execute on function public.cobrar_orden(uuid, jsonb, text) to authenticated;
grant execute on function public.anular_orden(uuid, text) to authenticated;
