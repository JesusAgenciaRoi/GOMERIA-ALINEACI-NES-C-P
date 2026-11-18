import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Encabezado, Vacio } from "@/components/ui";
import { fechaCorta, localAISO, pesos } from "@/lib/fechas";
import { MEDIOS_COMPRA } from "@/lib/negocio";

export default async function ComprasPage({ searchParams }: { searchParams: Promise<{ proveedor?: string }> }) {
  const { proveedor } = await searchParams;
  const supabase = await createClient();
  let consulta = supabase
    .from("compras")
    .select("id, numero, fecha, factura, medio, total, estado, proveedores(nombre), compra_items(count)")
    .order("fecha", { ascending: false })
    .order("numero", { ascending: false })
    .limit(200);
  if (proveedor) consulta = consulta.eq("proveedor_id", proveedor);
  const [{ data: compras }, { data: proveedores }] = await Promise.all([
    consulta,
    supabase.from("proveedores").select("id, nombre").order("nombre"),
  ]);
  const deuda = (compras ?? []).filter((c) => c.estado === "registrada" && c.medio === "cuenta_corriente").reduce((a, c) => a + c.total, 0);

  return (
    <div className="max-w-6xl">
      <Encabezado titulo="Compras" subtitulo="Mercadería, productos nuevos, herramientas y gastos">
        <Link href="/panel/compras/nueva" className="btn btn-primario">+ Registrar compra</Link>
      </Encabezado>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <form className="flex gap-2">
          <select name="proveedor" defaultValue={proveedor ?? ""} className="input w-auto" aria-label="Filtrar por proveedor">
            <option value="">Todos los proveedores</option>
            {(proveedores ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <button className="btn btn-secundario">Filtrar</button>
        </form>
        {deuda > 0 && (
          <span className="ml-auto text-sm rounded-full bg-amber-100 text-amber-900 px-3 py-1 font-semibold">
            En cuenta corriente: {pesos(deuda)}
          </span>
        )}
      </div>

      {compras && compras.length > 0 ? (
        <ul className="tarjeta divide-y divide-borde">
          {compras.map((c) => {
            const lineas = (c.compra_items as unknown as { count: number }[])[0]?.count ?? 0;
            return (
              <li key={c.id}>
                <Link href={`/panel/compras/${c.id}`} className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-fondo ${c.estado === "anulada" ? "opacity-50" : ""}`}>
                  <span className="titulo text-xl w-14">#{c.numero}</span>
                  <span className="w-28 tabular-nums">{fechaCorta(localAISO(c.fecha, "12:00"))}</span>
                  <span className="flex-1 min-w-40">
                    <span className="font-semibold">{c.proveedores?.nombre ?? "Sin proveedor"}</span>
                    <span className="block text-xs text-suave">{[c.factura ? `Fact. ${c.factura}` : null, `${lineas} línea${lineas === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="text-sm text-suave">{MEDIOS_COMPRA[c.medio] ?? c.medio}</span>
                  <span className="font-bold tabular-nums">{pesos(c.total)}</span>
                  {c.estado === "anulada" && <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-zinc-100 text-zinc-500">Anulada</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Vacio>Todavía no hay compras registradas.</Vacio>
      )}
    </div>
  );
}
