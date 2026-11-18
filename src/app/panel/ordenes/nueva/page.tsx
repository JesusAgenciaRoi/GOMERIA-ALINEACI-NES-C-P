import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Encabezado, Volver } from "@/components/ui";
import { crearOrden } from "../actions";

export default async function NuevaOrden({ searchParams }: { searchParams: Promise<{ q?: string; cliente?: string }> }) {
  const { q = "", cliente: clienteId } = await searchParams;
  const supabase = await createClient();

  if (clienteId) {
    const [{ data: cliente }, { data: vehiculos }] = await Promise.all([
      supabase.from("clientes").select("id, nombre, telefono").eq("id", clienteId).single(),
      supabase.from("vehiculos").select("id, patente, marca, modelo").eq("cliente_id", clienteId),
    ]);
    return (
      <div className="max-w-xl">
        <Volver href="/panel/ordenes/nueva">Cambiar cliente</Volver>
        <Encabezado titulo="Nueva orden" subtitulo={`Cliente: ${cliente?.nombre ?? ""}`} />
        <form action={crearOrden} className="tarjeta p-5 space-y-4">
          <input type="hidden" name="cliente_id" value={clienteId} />
          <div>
            <label className="etiqueta" htmlFor="vehiculo_id">Vehículo</label>
            <select className="input" id="vehiculo_id" name="vehiculo_id" defaultValue={vehiculos?.[0]?.id ?? ""}>
              <option value="">Sin especificar</option>
              {(vehiculos ?? []).map((v) => <option key={v.id} value={v.id}>{[v.patente, v.marca, v.modelo].filter(Boolean).join(" ")}</option>)}
            </select>
            <p className="text-xs text-suave mt-1">
              ¿No está? <Link href={`/panel/clientes/${clienteId}`} className="underline">Agregá el vehículo en la ficha del cliente</Link>.
            </p>
          </div>
          <button className="btn btn-primario">Crear orden</button>
        </form>
      </div>
    );
  }

  const termino = q.replace(/[,()%*\\]/g, " ").trim();
  let resultados: { id: string; nombre: string; telefono: string | null; vehiculos: { patente: string | null }[] }[] = [];
  if (termino) {
    const patente = termino.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const { data: porPatente } = patente ? await supabase.from("vehiculos").select("cliente_id").ilike("patente", `%${patente}%`).limit(20) : { data: [] };
    const ids = (porPatente ?? []).map((v) => v.cliente_id);
    const filtros = [`nombre.ilike.%${termino}%`, `telefono.ilike.%${termino.replace(/[^0-9]/g, "") || termino}%`];
    if (ids.length) filtros.push(`id.in.(${ids.join(",")})`);
    const { data } = await supabase.from("clientes").select("id, nombre, telefono, vehiculos(patente)").or(filtros.join(",")).limit(20);
    resultados = data ?? [];
  } else {
    const { data } = await supabase.from("clientes").select("id, nombre, telefono, vehiculos(patente)").order("created_at", { ascending: false }).limit(10);
    resultados = data ?? [];
  }

  return (
    <div className="max-w-2xl">
      <Volver href="/panel/ordenes">Órdenes</Volver>
      <Encabezado titulo="Nueva orden" subtitulo="Elegí el cliente. Si viene con turno, abrí la orden desde el turno." />
      <form className="flex gap-2 mb-4" role="search">
        <input className="input" name="q" defaultValue={q} placeholder="Nombre, teléfono o patente..." autoFocus aria-label="Buscar cliente" />
        <button className="btn btn-oscuro">Buscar</button>
      </form>
      <ul className="tarjeta divide-y divide-borde mb-4">
        {resultados.map((c) => (
          <li key={c.id}>
            <Link href={`/panel/ordenes/nueva?cliente=${c.id}`} className="flex justify-between gap-3 px-4 py-3 hover:bg-fondo">
              <span className="font-semibold">{c.nombre}</span>
              <span className="text-sm text-suave">{[c.telefono, ...c.vehiculos.map((v) => v.patente)].filter(Boolean).join(" · ")}</span>
            </Link>
          </li>
        ))}
        {resultados.length === 0 && <li className="px-4 py-6 text-center text-suave">Sin resultados.</li>}
      </ul>
      <Link href="/panel/clientes?nuevo=1" className="btn btn-secundario">+ Cargar cliente nuevo</Link>
    </div>
  );
}
