"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { obtenerHorarios, reservar, type ResultadoReserva } from "./reserva-actions";
import { diaSemana, fechaLarga, hora, pesos, sumarDias } from "@/lib/fechas";

type Servicio = { id: string; nombre: string; descripcion: string | null; duracion_min: number; precio: number | null };

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function Paso({ n, titulo, activo, children }: { n: number; titulo: string; activo: boolean; children: React.ReactNode }) {
  return (
    <div className={`min-w-0 ${activo ? "" : "opacity-40 pointer-events-none"}`} aria-disabled={!activo}>
      <h3 className="flex items-center gap-3 mb-3">
        <span className="grid place-items-center w-8 h-8 rounded-full bg-asfalto text-senal titulo text-lg">{n}</span>
        <span className="titulo text-xl">{titulo}</span>
      </h3>
      {children}
    </div>
  );
}

export default function Reserva({
  servicios,
  hoy,
  diasAbiertos,
  diasMax,
  whatsapp,
}: {
  servicios: Servicio[];
  hoy: string;
  diasAbiertos: number[];
  diasMax: number;
  whatsapp: string | null;
}) {
  const [servicioId, setServicioId] = useState<string | null>(null);
  const [fecha, setFecha] = useState<string | null>(null);
  const [horarios, setHorarios] = useState<string[] | null>(null);
  const [inicio, setInicio] = useState<string | null>(null);
  const [cargandoHorarios, startHorarios] = useTransition();
  const [enviando, startEnvio] = useTransition();
  const [resultado, setResultado] = useState<ResultadoReserva | null>(null);

  const dias = Array.from({ length: Math.min(diasMax, 21) + 1 }, (_, i) => sumarDias(hoy, i)).filter((d) =>
    diasAbiertos.includes(diaSemana(d)),
  );
  const servicio = servicios.find((s) => s.id === servicioId);
  const exitoRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (resultado?.ok) exitoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [resultado]);

  function cargarHorarios(sId: string | null, f: string | null) {
    setInicio(null);
    if (!sId || !f) return setHorarios(null);
    startHorarios(async () => setHorarios(await obtenerHorarios(sId, f)));
  }

  function enviar(form: FormData) {
    if (!servicioId || !inicio) return;
    startEnvio(async () => {
      const r = await reservar({
        servicioId,
        inicio,
        nombre: String(form.get("nombre") ?? ""),
        telefono: String(form.get("telefono") ?? ""),
        email: String(form.get("email") ?? ""),
        patente: String(form.get("patente") ?? ""),
        marca: String(form.get("marca") ?? ""),
        modelo: String(form.get("modelo") ?? ""),
        notas: String(form.get("notas") ?? ""),
      });
      setResultado(r);
      if (!r.ok && fecha) setHorarios(await obtenerHorarios(servicioId, fecha));
    });
  }

  if (resultado?.ok) {
    const t = resultado.turno;
    return (
      <div ref={exitoRef} className="tarjeta p-6 sm:p-8 text-center max-w-xl mx-auto" role="status">
        <div className="franja h-2 rounded-full mb-6" />
        <h3 className="titulo text-3xl mb-2">¡Turno reservado!</h3>
        <p className="text-lg">
          <strong>{t.servicio}</strong>
          <br />
          {fechaLarga(t.inicio)} a las <strong>{hora(t.inicio)} hs</strong>
        </p>
        <p className="text-suave mt-3">Te vamos a contactar por WhatsApp para confirmarte. Si no podés venir, avisanos.</p>
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {whatsapp && (
            <a className="btn btn-oscuro" href={whatsapp} target="_blank" rel="noopener noreferrer">Escribinos por WhatsApp</a>
          )}
          <button className="btn btn-secundario" onClick={() => { setResultado(null); setInicio(null); setFecha(null); setServicioId(null); setHorarios(null); }}>
            Reservar otro turno
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-8">
      <div className="space-y-8 min-w-0">
        <Paso n={1} titulo="Elegí el servicio" activo>
          <div className="grid sm:grid-cols-2 gap-2">
            {servicios.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setServicioId(s.id); cargarHorarios(s.id, fecha); }}
                aria-pressed={servicioId === s.id}
                className={`text-left rounded-lg border-2 px-4 py-3 transition-colors ${servicioId === s.id ? "border-senal bg-senal/10" : "border-borde bg-superficie hover:border-zinc-400"}`}
              >
                <div className="font-semibold">{s.nombre}</div>
                <div className="text-sm text-suave">{s.duracion_min} min · {pesos(s.precio)}</div>
              </button>
            ))}
          </div>
        </Paso>

        <Paso n={2} titulo="Elegí el día" activo={Boolean(servicioId)}>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {dias.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => { setFecha(d); cargarHorarios(servicioId, d); }}
                aria-pressed={fecha === d}
                className={`shrink-0 w-16 rounded-lg border-2 py-2 text-center ${fecha === d ? "border-asfalto bg-asfalto text-white" : "border-borde bg-superficie hover:border-zinc-400"}`}
              >
                <div className="text-xs uppercase">{d === hoy ? "Hoy" : DIAS_CORTOS[diaSemana(d)]}</div>
                <div className="titulo text-2xl leading-tight">{Number(d.slice(8))}</div>
                <div className="text-xs">{MESES[Number(d.slice(5, 7)) - 1]}</div>
              </button>
            ))}
          </div>
        </Paso>

        <Paso n={3} titulo="Elegí el horario" activo={Boolean(servicioId && fecha)}>
          {cargandoHorarios ? (
            <p className="text-suave">Buscando horarios...</p>
          ) : horarios && horarios.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {horarios.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setInicio(h)}
                  aria-pressed={inicio === h}
                  className={`rounded-md border-2 py-2 font-semibold tabular-nums ${inicio === h ? "border-senal bg-senal text-asfalto" : "border-borde bg-superficie hover:border-zinc-400"}`}
                >
                  {hora(h)}
                </button>
              ))}
            </div>
          ) : horarios ? (
            <p className="text-suave">No quedan horarios libres ese día. Probá con otro.</p>
          ) : (
            <p className="text-suave">Elegí servicio y día para ver los horarios.</p>
          )}
        </Paso>
      </div>

      <Paso n={4} titulo="Tus datos" activo={Boolean(inicio)}>
        <form action={enviar} className="tarjeta p-5 space-y-4">
          {servicio && inicio && (
            <div className="rounded-lg bg-asfalto text-white px-4 py-3">
              <div className="text-senal titulo text-lg">{servicio.nombre}</div>
              <div className="text-sm">{fechaLarga(inicio)} · {hora(inicio)} hs · {pesos(servicio.precio)}</div>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="etiqueta" htmlFor="r-nombre">Nombre y apellido *</label>
              <input className="input" id="r-nombre" name="nombre" autoComplete="name" required minLength={2} maxLength={120} />
            </div>
            <div>
              <label className="etiqueta" htmlFor="r-telefono">WhatsApp *</label>
              <input className="input" id="r-telefono" name="telefono" type="tel" autoComplete="tel" placeholder="099 123 456" required />
            </div>
            <div>
              <label className="etiqueta" htmlFor="r-email">Email</label>
              <input className="input" id="r-email" name="email" type="email" autoComplete="email" />
            </div>
            <div>
              <label className="etiqueta" htmlFor="r-patente">Patente</label>
              <input className="input uppercase" id="r-patente" name="patente" placeholder="ABC 1234" maxLength={10} />
            </div>
            <div>
              <label className="etiqueta" htmlFor="r-marca">Marca y modelo</label>
              <div className="flex gap-2">
                <input className="input" id="r-marca" name="marca" placeholder="Marca" aria-label="Marca" />
                <input className="input" name="modelo" placeholder="Modelo" aria-label="Modelo" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="etiqueta" htmlFor="r-notas">Comentario</label>
              <textarea className="input min-h-16" id="r-notas" name="notas" maxLength={500} placeholder="Ej: el auto tira para un lado" />
            </div>
          </div>
          {resultado && !resultado.ok && <p className="text-sm text-peligro" role="alert">{resultado.error}</p>}
          <button className="btn btn-primario w-full text-lg py-3" disabled={!inicio || enviando}>
            {enviando ? "Reservando..." : "Confirmar turno"}
          </button>
        </form>
      </Paso>
    </div>
  );
}
