import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Encabezado } from "@/components/ui";
import { DIAS, diaSemana, fechaCorta, fechaLarga, fechaLocal, hora, inicioSemana, localAISO, rangoDia, sumarDias } from "@/lib/fechas";
import { estadoInfo } from "@/lib/turnos";

const PX_MIN = 1.3; // alto en px por minuto en la vista dia

const aMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ fecha?: string; vista?: string }> }) {
  const sp = await searchParams;
  const hoy = fechaLocal();
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha ?? "") ? sp.fecha! : hoy;
  const vista = sp.vista === "semana" ? "semana" : "dia";
  const supabase = await createClient();

  const desdeFecha = vista === "semana" ? inicioSemana(fecha) : fecha;
  const dias = vista === "semana" ? 7 : 1;
  const desde = localAISO(desdeFecha, "00:00");
  const hasta = localAISO(sumarDias(desdeFecha, dias), "00:00");

  const [{ data: turnos }, { data: recursos }, { data: horarios }] = await Promise.all([
    supabase
      .from("turnos")
      .select("id, inicio, fin, estado, recurso_id, clientes(nombre), vehiculos(patente), servicios(nombre)")
      .gte("inicio", desde)
      .lt("inicio", hasta)
      .order("inicio"),
    supabase.from("recursos").select("id, nombre, tipo").eq("activo", true).order("tipo").order("nombre"),
    supabase.from("horarios").select("dia_semana, apertura, cierre"),
  ]);

  const paso = vista === "semana" ? 7 : 1;
  const url = (f: string, v = vista) => `/panel/agenda?fecha=${f}&vista=${v}`;

  // Rango horario a mostrar en vista dia
  const delDia = (horarios ?? []).filter((h) => h.dia_semana === diaSemana(fecha));
  const base = delDia.length ? delDia : horarios ?? [];
  const minIni = Math.floor(Math.min(...base.map((h) => aMin(h.apertura)), 8 * 60) / 60) * 60;
  const maxFin = Math.ceil(Math.max(...base.map((h) => aMin(h.cierre)), 19 * 60) / 60) * 60;
  const [diaIni] = rangoDia(fecha);
  const minutoDe = (iso: string) => Math.round((new Date(iso).getTime() - new Date(diaIni).getTime()) / 60000);
  const horas = Array.from({ length: (maxFin - minIni) / 60 }, (_, i) => minIni + i * 60);

  return (
    <div className="max-w-7xl">
      <Encabezado
        titulo="Agenda"
        subtitulo={vista === "dia" ? fechaLarga(localAISO(fecha, "12:00")) : `Semana del ${fechaCorta(localAISO(desdeFecha, "12:00"))}`}
      >
        <Link href={`/panel/turnos/nuevo?fecha=${fecha}`} className="btn btn-primario">+ Nuevo turno</Link>
      </Encabezado>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex">
          <Link href={url(sumarDias(fecha, -paso))} className="btn btn-secundario rounded-r-none" aria-label="Anterior">&larr;</Link>
          <Link href={url(hoy)} className="btn btn-secundario rounded-none border-x-0">Hoy</Link>
          <Link href={url(sumarDias(fecha, paso))} className="btn btn-secundario rounded-l-none" aria-label="Siguiente">&rarr;</Link>
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="vista" value={vista} />
          <input type="date" name="fecha" defaultValue={fecha} className="input w-auto" aria-label="Ir a fecha" />
          <button className="btn btn-secundario">Ir</button>
        </form>
        <div className="flex ml-auto p-1 bg-superficie border border-borde rounded-lg">
          {(["dia", "semana"] as const).map((v) => (
            <Link key={v} href={url(fecha, v)} className={`px-3 py-1.5 rounded-md text-sm font-semibold ${vista === v ? "bg-asfalto text-white" : "text-suave"}`}>
              {v === "dia" ? "Día" : "Semana"}
            </Link>
          ))}
        </div>
      </div>

      {vista === "dia" ? (
        <div className="tarjeta overflow-x-auto">
          <div className="grid min-w-[640px]" style={{ gridTemplateColumns: `56px repeat(${Math.max(recursos?.length ?? 1, 1)}, minmax(160px, 1fr))` }}>
            <div className="border-b border-borde" />
            {(recursos ?? []).map((r) => (
              <div key={r.id} className="border-b border-l border-borde px-3 py-2">
                <div className="font-semibold">{r.nombre}</div>
                <div className="text-xs text-suave capitalize">{r.tipo}</div>
              </div>
            ))}

            <div className="relative" style={{ height: (maxFin - minIni) * PX_MIN }}>
              {horas.map((m) => (
                <div key={m} className="absolute right-2 text-xs text-suave tabular-nums -translate-y-1/2" style={{ top: (m - minIni) * PX_MIN }}>
                  {m > minIni ? `${String(m / 60).padStart(2, "0")}:00` : ""}
                </div>
              ))}
            </div>

            {(recursos ?? []).map((r) => (
              <div key={r.id} className="relative border-l border-borde" style={{ height: (maxFin - minIni) * PX_MIN }}>
                {horas.map((m) => (
                  <Link
                    key={m}
                    href={`/panel/turnos/nuevo?fecha=${fecha}&hora=${String(m / 60).padStart(2, "0")}:00`}
                    className="absolute inset-x-0 border-t border-borde/70 hover:bg-senal/10"
                    style={{ top: (m - minIni) * PX_MIN, height: 60 * PX_MIN }}
                    aria-label={`Nuevo turno ${m / 60}:00`}
                  />
                ))}
                {(turnos ?? [])
                  .filter((t) => t.recurso_id === r.id)
                  .map((t) => {
                    const top = (minutoDe(t.inicio) - minIni) * PX_MIN;
                    const alto = Math.max((minutoDe(t.fin) - minutoDe(t.inicio)) * PX_MIN - 2, 22);
                    return (
                      <Link
                        key={t.id}
                        href={`/panel/turnos/${t.id}`}
                        className={`absolute inset-x-1 rounded-md border px-2 py-1 text-xs overflow-hidden shadow-sm hover:z-10 hover:shadow-md ${estadoInfo(t.estado).clase}`}
                        style={{ top, height: alto }}
                      >
                        <div className="font-bold tabular-nums">{hora(t.inicio)} {t.clientes?.nombre}</div>
                        <div className="truncate">{t.servicios?.nombre}{t.vehiculos?.patente ? ` · ${t.vehiculos.patente}` : ""}</div>
                      </Link>
                    );
                  })}
              </div>
            ))}
          </div>
          {(recursos ?? []).length === 0 && <p className="p-6 text-suave">No hay elevadores o máquinas cargados. Agregalos en Configuración.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }, (_, i) => sumarDias(desdeFecha, i)).map((d) => {
            const delDiaT = (turnos ?? []).filter((t) => fechaLocal(t.inicio) === d);
            return (
              <div key={d} className={`tarjeta p-2 min-h-32 ${d === hoy ? "ring-2 ring-senal" : ""}`}>
                <Link href={url(d, "dia")} className="block px-1 pb-2 mb-2 border-b border-borde">
                  <span className="text-xs text-suave">{DIAS[diaSemana(d)]}</span>
                  <span className="titulo text-xl ml-1">{Number(d.slice(8))}</span>
                </Link>
                <div className="space-y-1.5">
                  {delDiaT.map((t) => (
                    <Link key={t.id} href={`/panel/turnos/${t.id}`} className={`block rounded-md border px-2 py-1 text-xs ${estadoInfo(t.estado).clase}`}>
                      <div className="font-bold tabular-nums">{hora(t.inicio)}</div>
                      <div className="truncate">{t.clientes?.nombre}</div>
                      <div className="truncate opacity-80">{t.servicios?.nombre}</div>
                    </Link>
                  ))}
                  {delDiaT.length === 0 && <p className="text-xs text-suave px-1">Sin turnos</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
