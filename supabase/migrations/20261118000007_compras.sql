-- Compras: una compra suma stock, crea productos nuevos y registra el pago en caja en un solo paso.

create table public.compras (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity unique,
  proveedor_id uuid references public.proveedores(id) on delete set null,
  fecha date not null default ((now() at time zone 'America/Montevideo')::date),
  factura text,
  medio text not null default 'efectivo'
    check (medio in ('efectivo', 'debito', 'credito', 'transferencia', 'mercadopago', 'otro', 'cuenta_corriente')),
  total numeric(12,2) not null default 0,
  notas text,
  estado text not null default 'registrada' check (estado in ('registrada', 'anulada')),
  creado_por uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index compras_proveedor_idx on public.compras (proveedor_id);
create index compras_fecha_idx on public.compras (fecha desc);
create index compras_creado_por_idx on public.compras (creado_por);

create table public.compra_items (
  id uuid primary key default gen_random_uuid(),
  compra_id uuid not null references public.compras(id) on delete cascade,
  tipo text not null check (tipo in ('producto', 'gasto')),
  producto_id uuid references public.productos(id) on delete set null,
  categoria_gasto text check (categoria_gasto in ('herramienta', 'gasto', 'otro_egreso')),
  descripcion text not null,
  cantidad numeric(12,2) not null check (cantidad > 0),
  costo_unitario numeric(12,2) not null check (costo_unitario >= 0),
  subtotal numeric(12,2) generated always as (round(cantidad * costo_unitario, 2)) stored
);
create index compra_items_compra_idx on public.compra_items (compra_id);
create index compra_items_producto_idx on public.compra_items (producto_id);

-- Vinculos con stock y caja
alter table public.movimientos_stock add column compra_id uuid references public.compras(id) on delete set null;
create index movimientos_compra_idx on public.movimientos_stock (compra_id);
alter table public.caja_movimientos add column compra_id uuid references public.compras(id) on delete set null;
create index caja_compra_idx on public.caja_movimientos (compra_id);

-- Nueva categoria de caja: herramientas
alter table public.caja_movimientos drop constraint caja_movimientos_categoria_check;
alter table public.caja_movimientos add constraint caja_movimientos_categoria_check
  check (categoria in ('venta', 'sena', 'otro_ingreso', 'compra', 'herramienta', 'gasto', 'sueldo', 'retiro', 'anulacion', 'otro_egreso'));

-- Los movimientos generados por ordenes o compras no se borran a mano
drop policy caja_admin_del on public.caja_movimientos;
create policy caja_admin_del on public.caja_movimientos for delete to authenticated
  using ((select public.es_admin()) and orden_id is null and compra_id is null);

-- Insumo incluido: producto que se consume en la orden sin cobrarse aparte (precio 0)
alter table public.orden_items drop constraint orden_items_tipo_check;
alter table public.orden_items add constraint orden_items_tipo_check
  check (tipo in ('servicio', 'producto', 'insumo', 'mano_obra', 'otro'));

-- Stock reservado en ordenes todavia no cobradas
create view public.productos_reservado with (security_invoker = on) as
  select i.producto_id, sum(i.cantidad) as reservado
  from public.orden_items i
  join public.ordenes o on o.id = i.orden_id
  where o.estado in ('abierta', 'en_proceso', 'terminada') and i.producto_id is not null
  group by i.producto_id;

-- ============ Registrar compra ============
-- p_datos: { proveedor_id, fecha, factura, medio, notas, items: [
--   {tipo:'producto', producto_id, cantidad, costo_unitario},
--   {tipo:'nuevo', nombre, categoria, medida, marca, condicion, precio_venta, stock_minimo, cantidad, costo_unitario},
--   {tipo:'gasto', categoria, descripcion, cantidad, costo_unitario} ] }
create function public.registrar_compra(p_datos jsonb)
returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_compra public.compras%rowtype;
  v_item jsonb;
  v_tipo text;
  v_prod uuid;
  v_nombre text;
  v_cant numeric(12,2);
  v_costo numeric(12,2);
  v_proveedor uuid := nullif(p_datos->>'proveedor_id', '')::uuid;
  v_prov_nombre text;
  v_fecha date := coalesce(nullif(p_datos->>'fecha', '')::date, (now() at time zone 'America/Montevideo')::date);
  v_medio text := coalesce(nullif(p_datos->>'medio', ''), 'efectivo');
  v_cuando timestamptz;
  v_grupo record;
begin
  if not public.es_staff() then raise exception 'sin_permiso'; end if;
  if jsonb_typeof(p_datos->'items') <> 'array' or jsonb_array_length(p_datos->'items') = 0 then raise exception 'compra_sin_items'; end if;

  insert into public.compras (proveedor_id, fecha, factura, medio, notas)
  values (v_proveedor, v_fecha, nullif(btrim(p_datos->>'factura'), ''), v_medio, nullif(btrim(p_datos->>'notas'), ''))
  returning * into v_compra;

  for v_item in select * from jsonb_array_elements(p_datos->'items') loop
    v_tipo := v_item->>'tipo';
    v_cant := (v_item->>'cantidad')::numeric;
    v_costo := coalesce(nullif(v_item->>'costo_unitario', '')::numeric, 0);
    if v_cant is null or v_cant <= 0 then raise exception 'cantidad_invalida'; end if;
    if v_costo < 0 then raise exception 'costo_invalido'; end if;

    if v_tipo in ('producto', 'nuevo') then
      if v_tipo = 'nuevo' then
        v_nombre := btrim(coalesce(v_item->>'nombre', ''));
        if char_length(v_nombre) < 2 then raise exception 'producto_sin_nombre'; end if;
        insert into public.productos (nombre, categoria, medida, marca, condicion, precio_costo, precio_venta, stock_minimo, proveedor_id)
        values (
          v_nombre,
          coalesce(nullif(v_item->>'categoria', ''), 'repuesto'),
          nullif(upper(btrim(v_item->>'medida')), ''),
          nullif(btrim(v_item->>'marca'), ''),
          coalesce(nullif(v_item->>'condicion', ''), 'nueva'),
          v_costo,
          nullif(v_item->>'precio_venta', '')::numeric,
          coalesce(nullif(v_item->>'stock_minimo', '')::numeric, 0),
          v_proveedor
        )
        returning id into v_prod;
      else
        v_prod := (v_item->>'producto_id')::uuid;
        select nombre into v_nombre from public.productos where id = v_prod;
        if v_nombre is null then raise exception 'producto_inexistente'; end if;
        update public.productos
          set precio_costo = v_costo,
              proveedor_id = coalesce(proveedor_id, v_proveedor),
              precio_venta = coalesce(nullif(v_item->>'precio_venta', '')::numeric, precio_venta)
          where id = v_prod;
      end if;

      insert into public.compra_items (compra_id, tipo, producto_id, descripcion, cantidad, costo_unitario)
      values (v_compra.id, 'producto', v_prod, v_nombre, v_cant, v_costo);
      insert into public.movimientos_stock (producto_id, tipo, cantidad, costo_unitario, proveedor_id, compra_id, motivo)
      values (v_prod, 'ingreso', v_cant, v_costo, v_proveedor, v_compra.id, 'Compra #' || v_compra.numero);

    elsif v_tipo = 'gasto' then
      v_nombre := btrim(coalesce(v_item->>'descripcion', ''));
      if v_nombre = '' then raise exception 'gasto_sin_descripcion'; end if;
      insert into public.compra_items (compra_id, tipo, categoria_gasto, descripcion, cantidad, costo_unitario)
      values (v_compra.id, 'gasto', coalesce(nullif(v_item->>'categoria', ''), 'gasto'), v_nombre, v_cant, v_costo);
    else
      raise exception 'tipo_item_invalido';
    end if;
  end loop;

  update public.compras set total = (select coalesce(sum(subtotal), 0) from public.compra_items where compra_id = v_compra.id)
  where id = v_compra.id
  returning * into v_compra;

  -- Pago en caja (salvo cuenta corriente), agrupado por categoria para los reportes
  if v_medio <> 'cuenta_corriente' then
    select nombre into v_prov_nombre from public.proveedores where id = v_proveedor;
    v_cuando := case when v_fecha = (now() at time zone 'America/Montevideo')::date then now()
                     else (v_fecha + time '12:00') at time zone 'America/Montevideo' end;
    for v_grupo in
      select case when tipo = 'producto' then 'compra' else categoria_gasto end as categoria, sum(subtotal) as monto
      from public.compra_items where compra_id = v_compra.id
      group by 1 having sum(subtotal) > 0
    loop
      insert into public.caja_movimientos (fecha, tipo, categoria, medio, monto, concepto, compra_id)
      values (v_cuando, 'egreso', v_grupo.categoria, v_medio, v_grupo.monto,
              'Compra #' || v_compra.numero || coalesce(' - ' || v_prov_nombre, '') || coalesce(' - Fact. ' || v_compra.factura, ''),
              v_compra.id);
    end loop;
  end if;

  return jsonb_build_object('id', v_compra.id, 'numero', v_compra.numero, 'total', v_compra.total);
end $$;

-- Anular compra (solo admin): descuenta el stock que habia sumado y borra el pago de caja.
create function public.anular_compra(p_compra uuid, p_motivo text default null)
returns void language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_c public.compras%rowtype;
begin
  if not public.es_admin() then raise exception 'solo_admin'; end if;
  select * into v_c from public.compras where id = p_compra for update;
  if not found then raise exception 'compra_inexistente'; end if;
  if v_c.estado = 'anulada' then return; end if;

  insert into public.movimientos_stock (producto_id, tipo, cantidad, compra_id, motivo)
  select i.producto_id, 'ajuste', -i.cantidad, v_c.id, 'Anulación compra #' || v_c.numero
  from public.compra_items i where i.compra_id = v_c.id and i.tipo = 'producto' and i.producto_id is not null;

  delete from public.caja_movimientos where compra_id = v_c.id;

  update public.compras set estado = 'anulada',
    notas = case when p_motivo is null then notas else coalesce(notas || E'\n', '') || 'Anulada: ' || p_motivo end
  where id = v_c.id;
end $$;

-- ============ RLS ============
alter table public.compras enable row level security;
alter table public.compra_items enable row level security;

-- Todo el staff ve y registra compras (via registrar_compra); anular solo admin (via anular_compra)
create policy compras_staff_sel on public.compras for select to authenticated using ((select public.es_staff()));
create policy compra_items_staff_sel on public.compra_items for select to authenticated using ((select public.es_staff()));

revoke execute on function public.registrar_compra(jsonb) from public, anon;
revoke execute on function public.anular_compra(uuid, text) from public, anon;
grant execute on function public.registrar_compra(jsonb) to authenticated;
grant execute on function public.anular_compra(uuid, text) to authenticated;
grant select on public.productos_reservado to authenticated;
revoke select on public.productos_reservado from anon;
