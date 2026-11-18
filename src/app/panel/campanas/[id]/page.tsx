import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Encabezado, Vacio, Volver } from "@/components/ui";
import { fechaCorta, TZ } from "@/lib/fechas";
import { linkWhatsApp } from "@/lib/turnos";
import { armarMensaje, TIPOS_CAMPANA } from "@/lib/campanas";
import { BotonEnviar, FormCampana } from "../Componentes";
import { alternarCampana, eliminarCampana } from "../actions";

export const metadata = { title: "Campaña | Gomería C&P" };

const fechaConAnio = (d: string) =>
  new Intl.DateTimeFormat("es-UY", { day: "numeric", month: "short", year: "numeric", timeZone: TZ }).format(new Date(d));

export default async function CampanaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ver?: string }> }) {
  const { id } = await params;
  const { ver = "pendientes" } = await searchParams;
  const supabase = await createClient();
  const [{ data: c }, { data: servicios }, { data: cfg }] = await Promise.all([
    supabase.from("campanas").select("*").eq("id", id).maybeSingle(),
    supabase.from("servicios").select("id, nombre").eq("activo", true).order("orden"),
    supabase.from("config_negocio").select("nombre").eq("id", 1).single(),
  ]);
  if (!c) notFound();
  const negocio = cfg?.nombre ?? "Gomería C&P";

  const { data: dest, error } = await supabase.rpc("campana_destinatarios", { p_campana: id });
  const todos = dest ?? [];
  const pendientes = todos.filter((d) => !d.ya_enviado);
  const lista = ver === "enviados" ? todos.filter((d) => d.ya_enviado) : ver === "todos" ? todos : pendientes;

  const filtros: [string, string, number][] = [
    ["pendientes", "Por enviar", pendientes.length],
    ["enviados", "Enviados", todos.length - pendientes.length],
    ["todos", "Todos", todos.length],
  ];

  return (
    <div className="max-w-6xl">
      <Volver href="/panel/campanas">Campañas</Volver>
      <Encabezado titulo={c.nombre} subtitulo={TIPOS_CAMPANA[c.tipo]?.label}>
        <form action={alternarCampana}>
          <input type="hidden" name="id" value={c.id} />
          <input type="hidden" name="activa" value={String(!c.activa)} />
          <button className="btn btn-secundario">{c.activa ? "Pausar" : "Reactivar"}</button>
        </form>
      </Encabezado>

      {!c.activa && <div className="tarjeta p-3 mb-4 text-sm bg-amber-50 border-amber-300">Campaña pausada: no aparece en el conteo. Reactivala para volver a usarla.</div>}
      {error && <div className="tarjeta p-3 mb-4 text-sm text-peligro">{error.message}</div>}

      <div className="flex flex-wrap gap-1.5 mb-4">
        {filtros.map(([k, l, n]) => (
          <Link key={k} href={`/panel/campanas/${id}?ver=${k}`} className={`px-3 py-1 rounded-full text-sm border ${ver === k ? "bg-asfalto text-white border-asfalto" : "border-borde bg-superficie"}`}>
            {l} ({n})
          </Link>
        ))}
      </div>

      {lista.length === 0 ? (
        <Vacio>
          {ver === "pendientes"
            ? todos.length
              ? "Ya les escribiste a todos. Cuando haya clientes nuevos que cumplan la condición van a aparecer acá."
              : "Por ahora ningún cliente cumple la condición. La lista se arma sola con los turnos completados y las órdenes terminadas."
            : "No hay clientes en esta lista."}
        </Vacio>
      ) : (
        <ul className="space-y-3">
          {lista.map((d) => {
            const texto = armarMensaje(c.mensaje, { nombre: d.nombre, servicio: d.servicio, vehiculo: d.vehiculo, meses: d.meses, negocio });
            return (
              <li key={d.cliente_id} className="tarjeta p-4 grid md:grid-cols-[220px_1fr_auto] gap-3 items-start">
                <div className="min-w-0">
                  <Link href={`/panel/clientes/${d.cliente_id}`} className="font-semibold hover:underline">{d.nombre}</Link>
                  <div className="text-sm text-suave">{d.telefono}</div>
                  {d.ultima_visita && (
                    <div className="text-xs text-suave mt-1">
                      Última vez: {fechaConAnio(d.ultima_visita)}{d.meses != null ? ` (hace ${d.meses} meses)` : ""}
                      {d.servicio ? <><br />{d.servicio}{d.vehiculo ? ` · ${d.vehiculo}` : ""}</> : null}
                    </div>
                  )}
                  {d.turno_proximo && (
                    <div className="mt-1 inline-block text-xs font-semibold px-2 py-0.5 rounded-full border bg-sky-100 text-sky-900 border-sky-300">
                      Ya tiene turno el {fechaCorta(d.turno_proximo)}
                    </div>
                  )}
                  {d.ya_enviado && d.enviado_en && <div className="mt-1 text-xs text-ok">Enviado el {fechaCorta(d.enviado_en)}</div>}
                </div>
                <p className="text-sm whitespace-pre-wrap bg-fondo rounded-md p-2 border border-borde min-w-0">{texto}</p>
                <BotonEnviar campanaId={c.id} clienteId={d.cliente_id} link={linkWhatsApp(d.telefono, texto)} enviado={d.ya_enviado} />
              </li>
            );
          })}
        </ul>
      )}

      <details className="tarjeta mt-8">
        <summary className="p-4 cursor-pointer font-semibold">Editar campaña</summary>
        <div className="px-5 pb-5">
          <FormCampana campana={c} servicios={servicios ?? []} negocio={negocio} />
          <form action={eliminarCampana} className="mt-6 pt-4 border-t border-borde">
            <input type="hidden" name="id" value={c.id} />
            <button className="text-sm text-peligro hover:underline">Eliminar campaña y su historial de envíos</button>
          </form>
        </div>
      </details>
    </div>
  );
}
