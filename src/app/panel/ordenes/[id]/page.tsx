import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/auth";
import { Encabezado, Volver } from "@/components/ui";
import { fechaCorta, fechaLarga, hora, pesos } from "@/lib/fechas";
import { estadoOrden, MEDIOS_PAGO, num } from "@/lib/negocio";
import { linkWhatsApp } from "@/lib/turnos";
import { AgregarItem, Cobrar, DatosOrden } from "../FormsOrden";
import { anular, cambiarEstadoOrden, quitarItem } from "../actions";

const SIGUIENTE: Record<string, { estado: string; label: string }[]> = {
  abierta: [{ estado: "en_proceso", label: "Empezar trabajo" }],
  en_proceso: [{ estado: "terminada", label: "Marcar terminada" }, { estado: "abierta", label: "Volver a abierta" }],
  terminada: [{ estado: "en_proceso", label: "Volver a en proceso" }],
};

export default async function OrdenDetalle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const perfil = await obtenerPerfil();
  const esAdmin = perfil?.rol === "admin";
  const supabase = await createClient();

  const { data: o } = await supabase
    .from("ordenes")
    .select("*, clientes(id, nombre, telefono), vehiculos(patente, marca, modelo), turnos(id, inicio), orden_items(*)")
    .eq("id", id)
    .maybeSingle();
  if (!o) notFound();

  const abierta = !["cobrada", "anulada"].includes(o.estado);
  const [{ data: servicios }, { data: productosBase }, { data: vehiculos }, { data: pagos }, { data: reservas }] = await Promise.all([
    abierta ? supabase.from("servicios").select("id, nombre, precio").eq("activo", true).order("orden") : Promise.resolve({ data: [] }),
    abierta ? supabase.from("productos").select("id, nombre, medida, marca, precio_venta, stock").eq("activo", true).order("nombre").limit(1000) : Promise.resolve({ data: [] }),
    supabase.from("vehiculos").select("id, patente, marca, modelo").eq("cliente_id", o.cliente_id),
    esAdmin ? supabase.from("caja_movimientos").select("tipo, medio, monto, fecha").eq("orden_id", o.id).order("fecha") : Promise.resolve({ data: null }),
    abierta ? supabase.from("productos_reservado").select("producto_id, reservado") : Promise.resolve({ data: [] }),
  ]);
  const reservadoDe = new Map((reservas ?? []).map((r) => [r.producto_id, Number(r.reservado ?? 0)]));
  // Lo reservado por esta misma orden no cuenta como "reservado en otras"
  for (const i of o.orden_items ?? []) if (i.producto_id) reservadoDe.set(i.producto_id, (reservadoDe.get(i.producto_id) ?? 0) - i.cantidad);
  const productos = (productosBase ?? []).map((p) => ({ ...p, reservado: Math.max(0, reservadoDe.get(p.id) ?? 0) }));

  const items = [...(o.orden_items ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const subtotal = items.reduce((a, i) => a + i.subtotal, 0);
  const e = estadoOrden(o.estado);
  const vehiculoTxt = o.vehiculos ? [o.vehiculos.marca, o.vehiculos.modelo, o.vehiculos.patente].filter(Boolean).join(" ") : "tu vehículo";
  const avisoListo = linkWhatsApp(
    o.clientes?.telefono,
    `Hola ${o.clientes?.nombre.split(" ")[0] ?? ""}! Te avisamos que ${vehiculoTxt} ya está listo para retirar. Total: ${pesos(o.total)}. Gomería & Alineaciones C&P.`,
  );

  return (
    <div className="max-w-6xl">
      <Volver href="/panel/ordenes">Órdenes</Volver>
      <Encabezado titulo={`Orden #${o.numero}`} subtitulo={`Abierta el ${fechaLarga(o.created_at)}`}>
        <span className={`self-center text-sm font-semibold px-3 py-1 rounded-full border ${e.clase}`}>{e.label}</span>
        <Link href={`/imprimir/orden/${o.id}`} target="_blank" className="btn btn-secundario">Imprimir</Link>
        {avisoListo && o.estado !== "anulada" && (
          <a href={avisoListo} target="_blank" rel="noopener noreferrer" className="btn btn-secundario">Avisar que está listo</a>
        )}
      </Encabezado>

      {error && <p className="tarjeta border-rose-300 bg-rose-50 px-4 py-3 mb-6 text-sm" role="alert">{error}</p>}

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="tarjeta p-4">
          <div className="text-sm text-suave mb-1">Cliente</div>
          <Link href={`/panel/clientes/${o.cliente_id}`} className="font-semibold hover:underline">{o.clientes?.nombre}</Link>
          <div className="text-sm text-suave">{o.clientes?.telefono}</div>
        </div>
        <div className="tarjeta p-4">
          <div className="text-sm text-suave mb-1">Vehículo</div>
          <div className="font-semibold">{o.vehiculos ? [o.vehiculos.patente, o.vehiculos.marca, o.vehiculos.modelo].filter(Boolean).join(" ") : "Sin especificar"}</div>
          {o.km != null && <div className="text-sm text-suave">{num(o.km)} km</div>}
        </div>
        <div className="tarjeta p-4">
          <div className="text-sm text-suave mb-1">Turno</div>
          {o.turnos ? (
            <Link href={`/panel/turnos/${o.turnos.id}`} className="font-semibold hover:underline">{fechaCorta(o.turnos.inicio)} {hora(o.turnos.inicio)}</Link>
          ) : (
            <div className="text-suave">Sin turno (atención directa)</div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-6 min-w-0">
          <section className="tarjeta overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead className="text-left text-suave border-b border-borde bg-fondo">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Detalle</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Cant.</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Precio</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Subtotal</th>
                  {abierta && <th className="w-10" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-borde">
                {items.map((i) => (
                  <tr key={i.id}>
                    <td className="px-4 py-2.5">
                      {i.descripcion}
                      <span className="block text-xs text-suave">{({ producto: "Producto", insumo: "Insumo incluido", servicio: "Servicio", mano_obra: "Mano de obra" } as Record<string, string>)[i.tipo] ?? "Otro"}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{num(i.cantidad)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{i.tipo === "insumo" ? "Incluido" : pesos(i.precio_unitario)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{i.tipo === "insumo" ? "-" : pesos(i.subtotal)}</td>
                    {abierta && (
                      <td className="pr-3 text-right">
                        <form action={quitarItem}>
                          <input type="hidden" name="id" value={i.id} />
                          <input type="hidden" name="orden_id" value={o.id} />
                          <button className="text-peligro text-xs hover:underline" aria-label={`Quitar ${i.descripcion}`}>Quitar</button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-suave">Todavía no hay ítems. Agregá servicios, productos o mano de obra.</td></tr>
                )}
              </tbody>
              <tfoot className="border-t-2 border-borde">
                {o.descuento > 0 && (
                  <>
                    <tr><td colSpan={3} className="px-4 pt-2 text-right text-suave">Subtotal</td><td className="px-4 pt-2 text-right tabular-nums">{pesos(subtotal)}</td>{abierta && <td />}</tr>
                    <tr><td colSpan={3} className="px-4 text-right text-suave">Descuento</td><td className="px-4 text-right tabular-nums text-peligro">-{pesos(o.descuento)}</td>{abierta && <td />}</tr>
                  </>
                )}
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right titulo text-lg">Total</td>
                  <td className="px-4 py-3 text-right titulo text-2xl tabular-nums">{pesos(o.total)}</td>
                  {abierta && <td />}
                </tr>
              </tfoot>
            </table>
          </section>

          {abierta && (
            <section className="tarjeta p-5">
              <h2 className="titulo text-lg mb-4">Agregar a la orden</h2>
              <AgregarItem ordenId={o.id} servicios={servicios ?? []} productos={productos ?? []} />
            </section>
          )}

          <section className="tarjeta p-5">
            <h2 className="titulo text-lg mb-4">Datos de la orden</h2>
            <DatosOrden orden={o} vehiculos={vehiculos ?? []} editable={abierta} />
          </section>
        </div>

        <aside className="space-y-6">
          {abierta && (SIGUIENTE[o.estado] ?? []).length > 0 && (
            <section className="tarjeta p-5">
              <h2 className="titulo text-lg mb-3">Estado</h2>
              <div className="flex flex-wrap gap-2">
                {SIGUIENTE[o.estado].map((s) => (
                  <form key={s.estado} action={cambiarEstadoOrden}>
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="estado" value={s.estado} />
                    <button className="btn btn-chico btn-secundario">{s.label}</button>
                  </form>
                ))}
              </div>
            </section>
          )}

          {abierta && (
            <section className="tarjeta p-5 border-senal border-2">
              <h2 className="titulo text-xl mb-3">Cobrar</h2>
              {items.length > 0 ? (
                <Cobrar key={o.total} ordenId={o.id} total={o.total} factura={o.factura} />
              ) : (
                <p className="text-sm text-suave">Agregá al menos un ítem para poder cobrar.</p>
              )}
            </section>
          )}

          {o.estado === "cobrada" && (
            <section className="tarjeta p-5 bg-emerald-50 border-emerald-300">
              <h2 className="titulo text-xl">Cobrada</h2>
              <p className="text-sm">{o.cobrada_en ? `${fechaLarga(o.cobrada_en)} ${hora(o.cobrada_en)}` : ""}</p>
              {o.factura && <p className="text-sm mt-1">Factura: <strong>{o.factura}</strong></p>}
              {pagos && pagos.length > 0 && (
                <ul className="mt-3 text-sm space-y-1">
                  {pagos.filter((p) => p.tipo === "ingreso").map((p, k) => (
                    <li key={k} className="flex justify-between"><span>{MEDIOS_PAGO[p.medio] ?? p.medio}</span><strong>{pesos(p.monto)}</strong></li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {o.estado !== "anulada" && (abierta || esAdmin) && (
            <details className="tarjeta p-5">
              <summary className="cursor-pointer text-sm font-semibold text-peligro">Anular orden</summary>
              <form action={anular} className="mt-3 space-y-2">
                <input type="hidden" name="id" value={o.id} />
                <input className="input" name="motivo" placeholder="Motivo (opcional)" aria-label="Motivo de anulación" />
                {o.estado === "cobrada" && <p className="text-xs text-suave">Se devuelve el stock y se registra el reintegro en caja.</p>}
                <button className="btn btn-chico btn-peligro">Confirmar anulación</button>
              </form>
            </details>
          )}
        </aside>
      </div>
    </div>
  );
}
