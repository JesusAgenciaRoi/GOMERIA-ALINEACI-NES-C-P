import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Encabezado, Vacio } from "@/components/ui";
import { fechaCorta, hora, pesos } from "@/lib/fechas";
import { estadoOrden } from "@/lib/negocio";

const FILTROS = {
  activas: { label: "Activas", estados: ["abierta", "en_proceso", "terminada"] },
  cobradas: { label: "Cobradas", estados: ["cobrada"] },
  anuladas: { label: "Anuladas", estados: ["anulada"] },
  todas: { label: "Todas", estados: null },
} as const;

export default async function OrdenesPage({ searchParams }: { searchParams: Promise<{ f?: string; q?: string; error?: string }> }) {
  const { f = "activas", q = "", error } = await searchParams;
  const filtro = FILTROS[f as keyof typeof FILTROS] ?? FILTROS.activas;
  const supabase = await createClient();

  let consulta = supabase
    .from("ordenes")
    .select("id, numero, estado, total, created_at, cobrada_en, clientes(nombre), vehiculos(patente, marca, modelo), orden_items(count)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filtro.estados) consulta = consulta.in("estado", [...filtro.estados]);
  const nroBuscado = Number(q.replace(/[^0-9]/g, ""));
  if (q && nroBuscado) consulta = consulta.eq("numero", nroBuscado);
  const { data: ordenes } = await consulta;

  return (
    <div className="max-w-6xl">
      <Encabezado titulo="Órdenes de trabajo" subtitulo="Lo que se le hace a cada vehículo, y su cobro">
        <Link href="/panel/ordenes/nueva" className="btn btn-primario">+ Nueva orden</Link>
      </Encabezado>
      {error && <p className="tarjeta border-rose-300 bg-rose-50 px-4 py-3 mb-4 text-sm" role="alert">{error}</p>}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex p-1 bg-superficie border border-borde rounded-lg">
          {Object.entries(FILTROS).map(([k, v]) => (
            <Link key={k} href={`/panel/ordenes?f=${k}`} className={`px-3 py-1.5 rounded-md text-sm font-semibold ${f === k ? "bg-asfalto text-white" : "text-suave"}`}>
              {v.label}
            </Link>
          ))}
        </div>
        <form className="flex gap-2 ml-auto" role="search">
          <input type="hidden" name="f" value="todas" />
          <input className="input w-36" name="q" defaultValue={q} placeholder="N.º de orden" aria-label="Buscar por número" inputMode="numeric" />
          <button className="btn btn-secundario">Buscar</button>
        </form>
      </div>

      {ordenes && ordenes.length > 0 ? (
        <ul className="tarjeta divide-y divide-borde">
          {ordenes.map((o) => {
            const e = estadoOrden(o.estado);
            const items = (o.orden_items as unknown as { count: number }[])[0]?.count ?? 0;
            return (
              <li key={o.id}>
                <Link href={`/panel/ordenes/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-fondo">
                  <span className="titulo text-xl w-16">#{o.numero}</span>
                  <span className="flex-1 min-w-44">
                    <span className="font-semibold">{o.clientes?.nombre}</span>
                    {o.vehiculos && <span className="text-suave"> · {[o.vehiculos.patente, o.vehiculos.marca, o.vehiculos.modelo].filter(Boolean).join(" ")}</span>}
                    <span className="block text-xs text-suave">{fechaCorta(o.created_at)} {hora(o.created_at)} · {items} ítem{items === 1 ? "" : "s"}</span>
                  </span>
                  <span className="font-bold tabular-nums">{pesos(o.total)}</span>
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${e.clase}`}>{e.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <Vacio>No hay órdenes {f === "activas" ? "activas" : "con ese filtro"}. Creá una desde un turno o con “Nueva orden”.</Vacio>
      )}
    </div>
  );
}
