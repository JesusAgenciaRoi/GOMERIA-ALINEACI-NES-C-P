import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/auth";
import { Encabezado, Volver } from "@/components/ui";
import { fechaLarga, localAISO, pesos } from "@/lib/fechas";
import { CATEGORIAS_GASTO_COMPRA, MEDIOS_COMPRA, num } from "@/lib/negocio";
import { anularCompra } from "../actions";

export default async function CompraDetalle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { id } = await params;
  const { ok, error } = await searchParams;
  const perfil = await obtenerPerfil();
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("compras")
    .select("*, proveedores(id, nombre, telefono), compra_items(*, productos(id, nombre, stock))")
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();

  const items = c.compra_items ?? [];
  const stock = items.filter((i) => i.tipo === "producto");
  const gastos = items.filter((i) => i.tipo === "gasto");

  return (
    <div className="max-w-5xl">
      <Volver href="/panel/compras">Compras</Volver>
      <Encabezado titulo={`Compra #${c.numero}`} subtitulo={fechaLarga(localAISO(c.fecha, "12:00"))}>
        {c.estado === "anulada" && <span className="self-center text-sm font-semibold px-3 py-1 rounded-full border bg-zinc-100 text-zinc-500">Anulada</span>}
        <Link href="/panel/compras/nueva" className="btn btn-secundario">+ Otra compra</Link>
      </Encabezado>
      {ok && <p className="tarjeta border-emerald-300 bg-emerald-50 px-4 py-3 mb-6 text-sm" role="status">Compra registrada. El stock y la caja ya están actualizados.</p>}
      {error && <p className="tarjeta border-rose-300 bg-rose-50 px-4 py-3 mb-6 text-sm" role="alert">{error}</p>}

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="tarjeta p-4">
          <div className="text-sm text-suave mb-1">Proveedor</div>
          <div className="font-semibold">{c.proveedores?.nombre ?? "Sin proveedor"}</div>
          {c.factura && <div className="text-sm text-suave">Factura {c.factura}</div>}
        </div>
        <div className="tarjeta p-4">
          <div className="text-sm text-suave mb-1">Pago</div>
          <div className="font-semibold">{MEDIOS_COMPRA[c.medio] ?? c.medio}</div>
          <div className="text-xs text-suave">{c.medio === "cuenta_corriente" ? "Sin salida de caja" : "Registrado en caja"}</div>
        </div>
        <div className="tarjeta p-4 bg-asfalto text-white border-asfalto">
          <div className="text-sm text-zinc-400 mb-1">Total</div>
          <div className="titulo text-3xl text-senal">{pesos(c.total)}</div>
        </div>
      </div>

      {stock.length > 0 && (
        <section className="mb-6">
          <h2 className="titulo text-xl mb-3">Al inventario</h2>
          <div className="tarjeta overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead className="text-left text-suave border-b border-borde bg-fondo">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Producto</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Cant.</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Costo</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Subtotal</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Stock hoy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borde">
                {stock.map((i) => (
                  <tr key={i.id}>
                    <td className="px-4 py-2.5">
                      {i.productos ? <Link href={`/panel/inventario/${i.productos.id}`} className="font-semibold hover:underline">{i.descripcion}</Link> : i.descripcion}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">+{num(i.cantidad)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{pesos(i.costo_unitario)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{pesos(i.subtotal)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{i.productos ? num(i.productos.stock) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {gastos.length > 0 && (
        <section className="mb-6">
          <h2 className="titulo text-xl mb-3">No va al inventario</h2>
          <ul className="tarjeta divide-y divide-borde text-sm">
            {gastos.map((i) => (
              <li key={i.id} className="flex flex-wrap justify-between gap-3 px-4 py-2.5">
                <span><strong>{i.descripcion}</strong> <span className="text-suave">· {CATEGORIAS_GASTO_COMPRA[i.categoria_gasto ?? ""] ?? i.categoria_gasto} · {num(i.cantidad)} x {pesos(i.costo_unitario)}</span></span>
                <strong className="tabular-nums">{pesos(i.subtotal)}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      {c.notas && <p className="tarjeta p-4 text-sm whitespace-pre-line mb-6">{c.notas}</p>}

      {perfil?.rol === "admin" && c.estado === "registrada" && (
        <details className="tarjeta p-5 max-w-md">
          <summary className="cursor-pointer text-sm font-semibold text-peligro">Anular compra</summary>
          <form action={anularCompra} className="mt-3 space-y-2">
            <input type="hidden" name="id" value={c.id} />
            <input className="input" name="motivo" placeholder="Motivo (opcional)" aria-label="Motivo de anulación" />
            <p className="text-xs text-suave">Se descuenta del stock lo que había sumado y se borra el pago de caja. Los productos creados quedan en el inventario con su stock ajustado.</p>
            <button className="btn btn-chico btn-peligro">Confirmar anulación</button>
          </form>
        </details>
      )}
    </div>
  );
}
