import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Encabezado, Vacio } from "@/components/ui";
import { ORIGENES } from "@/lib/turnos";
import { FormNuevoCliente } from "./Formularios";

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string; nuevo?: string }> }) {
  const { q = "", nuevo } = await searchParams;
  const supabase = await createClient();
  const termino = q.replace(/[,()%*\\]/g, " ").trim();

  let consulta = supabase
    .from("clientes")
    .select("id, nombre, telefono, email, origen, created_at, vehiculos(patente, marca, modelo)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (termino) {
    const patente = termino.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const { data: porPatente } = patente
      ? await supabase.from("vehiculos").select("cliente_id").ilike("patente", `%${patente}%`).limit(50)
      : { data: [] };
    const ids = (porPatente ?? []).map((v) => v.cliente_id);
    const filtros = [`nombre.ilike.%${termino}%`, `telefono.ilike.%${termino.replace(/[^0-9]/g, "") || termino}%`];
    if (ids.length) filtros.push(`id.in.(${ids.join(",")})`);
    consulta = consulta.or(filtros.join(","));
  }

  const { data: clientes, error } = await consulta;

  return (
    <div className="max-w-6xl">
      <Encabezado titulo="Clientes" subtitulo="Buscá por nombre, teléfono o patente" />

      <details className="tarjeta mb-6 group" open={nuevo === "1"}>
        <summary className="cursor-pointer list-none px-5 py-4 font-semibold flex items-center justify-between">
          + Nuevo cliente
          <span className="text-suave text-sm group-open:hidden">Abrir</span>
        </summary>
        <div className="px-5 pb-5">
          <FormNuevoCliente />
        </div>
      </details>

      <form className="flex gap-2 mb-4" role="search">
        <input className="input" name="q" defaultValue={q} placeholder="Nombre, teléfono o patente..." aria-label="Buscar clientes" />
        <button className="btn btn-oscuro">Buscar</button>
        {q && <Link href="/panel/clientes" className="btn btn-secundario">Limpiar</Link>}
      </form>

      {error && <p className="text-peligro mb-4">{error.message}</p>}

      {clientes && clientes.length > 0 ? (
        <div className="tarjeta overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-suave border-b border-borde">
              <tr>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Teléfono</th>
                <th className="px-4 py-3 font-semibold">Vehículos</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Origen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {clientes.map((c) => (
                <tr key={c.id} className="hover:bg-fondo">
                  <td className="px-4 py-3">
                    <Link href={`/panel/clientes/${c.id}`} className="font-semibold hover:underline">{c.nombre}</Link>
                    {c.email && <div className="text-suave text-xs">{c.email}</div>}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{c.telefono ?? "-"}</td>
                  <td className="px-4 py-3">
                    {c.vehiculos.length
                      ? c.vehiculos.map((v) => (
                          <span key={v.patente ?? v.modelo} className="inline-block mr-2 mb-1 px-2 py-0.5 rounded bg-fondo border border-borde text-xs font-semibold">
                            {v.patente ?? "s/patente"} {v.marca && <span className="font-normal text-suave">{v.marca} {v.modelo}</span>}
                          </span>
                        ))
                      : "-"}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-suave">{ORIGENES[c.origen] ?? c.origen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Vacio>{q ? "No se encontraron clientes." : "Todavía no hay clientes cargados."}</Vacio>
      )}
    </div>
  );
}
