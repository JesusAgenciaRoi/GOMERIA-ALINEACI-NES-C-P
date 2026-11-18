import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Encabezado, Volver } from "@/components/ui";
import { fechaLocal } from "@/lib/fechas";
import FormTurno from "../FormTurno";

export default async function NuevoTurno({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; q?: string; fecha?: string; hora?: string }>;
}) {
  const { cliente: clienteId, q = "", fecha, hora } = await searchParams;
  const supabase = await createClient();

  if (!clienteId) {
    const termino = q.replace(/[,()%*\\]/g, " ").trim();
    const { data: resultados } = termino
      ? await supabase
          .from("clientes")
          .select("id, nombre, telefono, vehiculos(patente)")
          .or(`nombre.ilike.%${termino}%,telefono.ilike.%${termino.replace(/[^0-9]/g, "") || termino}%`)
          .limit(20)
      : await supabase.from("clientes").select("id, nombre, telefono, vehiculos(patente)").order("created_at", { ascending: false }).limit(10);
    const extra = new URLSearchParams({ ...(fecha ? { fecha } : {}), ...(hora ? { hora } : {}) }).toString();

    return (
      <div className="max-w-2xl">
        <Volver href="/panel/agenda">Agenda</Volver>
        <Encabezado titulo="Nuevo turno" subtitulo="Paso 1: elegí el cliente" />
        <form className="flex gap-2 mb-4" role="search">
          {fecha && <input type="hidden" name="fecha" value={fecha} />}
          {hora && <input type="hidden" name="hora" value={hora} />}
          <input className="input" name="q" defaultValue={q} placeholder="Buscar por nombre o teléfono..." autoFocus aria-label="Buscar cliente" />
          <button className="btn btn-oscuro">Buscar</button>
        </form>
        <ul className="tarjeta divide-y divide-borde mb-4">
          {(resultados ?? []).map((c) => (
            <li key={c.id}>
              <Link href={`/panel/turnos/nuevo?cliente=${c.id}${extra ? "&" + extra : ""}`} className="flex justify-between gap-3 px-4 py-3 hover:bg-fondo">
                <span className="font-semibold">{c.nombre}</span>
                <span className="text-sm text-suave">{[c.telefono, ...c.vehiculos.map((v) => v.patente)].filter(Boolean).join(" · ")}</span>
              </Link>
            </li>
          ))}
          {(resultados ?? []).length === 0 && <li className="px-4 py-6 text-center text-suave">Sin resultados.</li>}
        </ul>
        <Link href="/panel/clientes?nuevo=1" className="btn btn-secundario">+ Cargar cliente nuevo</Link>
      </div>
    );
  }

  const [{ data: cliente }, { data: servicios }, { data: recursos }, { data: vehiculos }] = await Promise.all([
    supabase.from("clientes").select("id, nombre, telefono").eq("id", clienteId).single(),
    supabase.from("servicios").select("id, nombre, duracion_min, precio, tipo_recurso, activo").eq("activo", true).order("orden"),
    supabase.from("recursos").select("id, nombre, tipo").eq("activo", true).order("nombre"),
    supabase.from("vehiculos").select("id, patente, marca, modelo").eq("cliente_id", clienteId),
  ]);

  return (
    <div className="max-w-2xl">
      <Volver href="/panel/turnos/nuevo">Cambiar cliente</Volver>
      <Encabezado titulo="Nuevo turno" subtitulo={`Cliente: ${cliente?.nombre ?? ""}`} />
      <div className="tarjeta p-5">
        <FormTurno
          clienteId={clienteId}
          servicios={servicios ?? []}
          recursos={recursos ?? []}
          vehiculos={vehiculos ?? []}
          valores={{ fecha: fecha ?? fechaLocal(), hora }}
        />
      </div>
    </div>
  );
}
