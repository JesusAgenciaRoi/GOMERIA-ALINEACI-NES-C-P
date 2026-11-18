import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requerirStaff } from "@/lib/auth";
import { fechaLarga, hora, pesos } from "@/lib/fechas";
import { estadoOrden, num } from "@/lib/negocio";
import BotonImprimir from "./BotonImprimir";

export const metadata = { title: "Orden de trabajo" };

export default async function ImprimirOrden({ params }: { params: Promise<{ id: string }> }) {
  await requerirStaff();
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: o }, { data: cfg }] = await Promise.all([
    supabase.from("ordenes").select("*, clientes(nombre, telefono, email), vehiculos(patente, marca, modelo, anio), orden_items(*)").eq("id", id).maybeSingle(),
    supabase.from("config_negocio").select("nombre, telefono, direccion, email").eq("id", 1).single(),
  ]);
  if (!o) notFound();
  const items = [...(o.orden_items ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const subtotal = items.reduce((a, i) => a + i.subtotal, 0);

  return (
    <main className="bg-white text-black min-h-screen">
      <div className="max-w-3xl mx-auto p-8 print:p-0">
        <div className="flex justify-between items-start border-b-4 border-black pb-4 mb-6">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/fotos/logo.webp" alt="" className="h-16 w-auto rounded" />
            <div>
              <div className="titulo text-2xl">{cfg?.nombre}</div>
              <div className="text-sm">{[cfg?.direccion, cfg?.telefono, cfg?.email].filter(Boolean).join(" · ")}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="titulo text-3xl">Orden #{o.numero}</div>
            <div className="text-sm">{fechaLarga(o.created_at)} {hora(o.created_at)}</div>
            <div className="text-sm font-semibold">{estadoOrden(o.estado).label}{o.factura ? ` · Factura ${o.factura}` : ""}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <div>
            <div className="font-bold uppercase text-xs mb-1">Cliente</div>
            <div>{o.clientes?.nombre}</div>
            <div>{[o.clientes?.telefono, o.clientes?.email].filter(Boolean).join(" · ")}</div>
          </div>
          <div>
            <div className="font-bold uppercase text-xs mb-1">Vehículo</div>
            <div>{o.vehiculos ? [o.vehiculos.marca, o.vehiculos.modelo, o.vehiculos.anio].filter(Boolean).join(" ") : "-"}</div>
            <div>{o.vehiculos?.patente ? `Patente ${o.vehiculos.patente}` : ""}{o.km != null ? ` · ${num(o.km)} km` : ""}</div>
          </div>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="py-2">Detalle</th>
              <th className="py-2 text-right">Cant.</th>
              <th className="py-2 text-right">Precio</th>
              <th className="py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b border-zinc-300">
                <td className="py-2">{i.descripcion}</td>
                <td className="py-2 text-right">{num(i.cantidad)}</td>
                <td className="py-2 text-right">{i.tipo === "insumo" ? "Incluido" : pesos(i.precio_unitario)}</td>
                <td className="py-2 text-right">{i.tipo === "insumo" ? "-" : pesos(i.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {o.descuento > 0 && (
              <>
                <tr><td colSpan={3} className="pt-2 text-right">Subtotal</td><td className="pt-2 text-right">{pesos(subtotal)}</td></tr>
                <tr><td colSpan={3} className="text-right">Descuento</td><td className="text-right">-{pesos(o.descuento)}</td></tr>
              </>
            )}
            <tr><td colSpan={3} className="pt-3 text-right titulo text-xl">Total</td><td className="pt-3 text-right titulo text-2xl">{pesos(o.total)}</td></tr>
          </tfoot>
        </table>

        {o.notas && (
          <div className="text-sm mb-6">
            <div className="font-bold uppercase text-xs mb-1">Notas</div>
            <p className="whitespace-pre-line">{o.notas}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-10 mt-16 text-sm text-center">
          <div className="border-t border-black pt-2">Firma del cliente</div>
          <div className="border-t border-black pt-2">{cfg?.nombre}</div>
        </div>

        <div className="mt-8 print:hidden text-center">
          <BotonImprimir />
        </div>
      </div>
    </main>
  );
}
