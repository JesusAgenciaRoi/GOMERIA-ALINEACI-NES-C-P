import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/auth";
import { Encabezado, Volver } from "@/components/ui";
import { fechaCorta, hora, pesos } from "@/lib/fechas";
import { CATEGORIAS_PRODUCTO, CONDICION, TIPOS_MOV_STOCK, num } from "@/lib/negocio";
import { FormMovimiento, FormProducto } from "../FormProducto";
import { eliminarProducto } from "../actions";

export default async function ProductoDetalle({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const perfil = await obtenerPerfil();
  const esAdmin = perfil?.rol === "admin";
  const supabase = await createClient();

  const [{ data: p }, { data: movimientos }, { data: proveedores }, { data: reserva }] = await Promise.all([
    supabase.from("productos").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("movimientos_stock")
      .select("id, tipo, cantidad, costo_unitario, motivo, created_at, orden_id, compra_id, proveedores(nombre), ordenes(numero), compras(numero)")
      .eq("producto_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("proveedores").select("id, nombre").order("nombre"),
    supabase.from("productos_reservado").select("reservado").eq("producto_id", id).maybeSingle(),
  ]);
  if (!p) notFound();
  const reservado = Number(reserva?.reservado ?? 0);

  const margen = p.precio_costo && p.precio_venta ? Math.round(((p.precio_venta - p.precio_costo) / p.precio_costo) * 100) : null;

  return (
    <div className="max-w-6xl">
      <Volver href="/panel/inventario">Inventario</Volver>
      <Encabezado
        titulo={p.nombre}
        subtitulo={[CATEGORIAS_PRODUCTO[p.categoria]?.split(" (")[0], p.medida, p.marca, CONDICION[p.condicion]].filter(Boolean).join(" · ")}
      />
      {error && <p className="tarjeta border-rose-300 bg-rose-50 px-4 py-3 mb-6 text-sm" role="alert">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className={`tarjeta p-4 ${p.stock <= p.stock_minimo && p.stock_minimo > 0 ? "border-amber-400 bg-amber-50" : ""}`}>
          <div className="text-sm text-suave">Stock actual</div>
          <div className="titulo text-4xl">{num(p.stock)}</div>
          <div className="text-xs text-suave">Mínimo: {num(p.stock_minimo)}</div>
          {reservado > 0 && <div className="text-xs text-amber-800 mt-1">{num(reservado)} reservado en órdenes abiertas · {num(p.stock - reservado)} disponible</div>}
        </div>
        <div className="tarjeta p-4">
          <div className="text-sm text-suave">Precio de venta</div>
          <div className="titulo text-3xl">{pesos(p.precio_venta)}</div>
        </div>
        {esAdmin && (
          <>
            <div className="tarjeta p-4">
              <div className="text-sm text-suave">Costo</div>
              <div className="titulo text-3xl">{p.precio_costo != null ? pesos(p.precio_costo) : "-"}</div>
            </div>
            <div className="tarjeta p-4">
              <div className="text-sm text-suave">Margen</div>
              <div className="titulo text-3xl">{margen != null ? `${margen}%` : "-"}</div>
            </div>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6 min-w-0">
          {esAdmin && (
            <section className="tarjeta p-5">
              <h2 className="titulo text-lg mb-4">Datos del producto</h2>
              <FormProducto producto={p} proveedores={proveedores ?? []} />
            </section>
          )}
          <section>
            <h2 className="titulo text-xl mb-3">Movimientos</h2>
            {movimientos && movimientos.length > 0 ? (
              <div className="tarjeta overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-suave border-b border-borde">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Fecha</th>
                      <th className="px-4 py-2.5 font-semibold">Tipo</th>
                      <th className="px-4 py-2.5 font-semibold">Detalle</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borde">
                    {movimientos.map((m) => (
                      <tr key={m.id}>
                        <td className="px-4 py-2.5 whitespace-nowrap">{fechaCorta(m.created_at)} {hora(m.created_at)}</td>
                        <td className="px-4 py-2.5">{TIPOS_MOV_STOCK[m.tipo] ?? m.tipo}</td>
                        <td className="px-4 py-2.5 text-suave">
                          {m.orden_id ? <Link href={`/panel/ordenes/${m.orden_id}`} className="underline">Orden #{m.ordenes?.numero}</Link> : null}
                          {m.compra_id ? <Link href={`/panel/compras/${m.compra_id}`} className="underline">Compra #{m.compras?.numero}</Link> : null}
                          {[m.motivo && !m.orden_id && !m.compra_id ? m.motivo : null, m.proveedores?.nombre, esAdmin && m.costo_unitario != null ? `costo ${pesos(m.costo_unitario)}` : null].filter(Boolean).join(" · ")}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-bold tabular-nums ${m.cantidad > 0 ? "text-ok" : "text-peligro"}`}>
                          {m.cantidad > 0 ? "+" : ""}{num(m.cantidad)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-suave text-sm">Sin movimientos.</p>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <Link href={`/panel/compras/nueva?producto=${p.id}`} className="btn btn-primario w-full">Registrar compra de este producto</Link>
          <section className="tarjeta p-5">
            <h2 className="titulo text-lg mb-1">Ajustar stock</h2>
            <p className="text-xs text-suave mb-4">Para compras usá “Registrar compra” (así también se registra el pago). Esto es para devoluciones o correcciones por conteo.</p>
            <FormMovimiento productoId={p.id} proveedores={proveedores ?? []} esAdmin={esAdmin} costo={p.precio_costo} />
          </section>
          {esAdmin && (
            <form action={eliminarProducto}>
              <input type="hidden" name="id" value={p.id} />
              <button className="btn btn-chico btn-peligro">Eliminar producto</button>
              <p className="text-xs text-suave mt-1">Si ya se usó en órdenes, desactivalo en lugar de borrarlo.</p>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
