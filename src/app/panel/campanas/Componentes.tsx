"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Campo } from "@/components/ui";
import { armarMensaje, EJEMPLO, TIPOS_CAMPANA, VARIABLES } from "@/lib/campanas";
import { deshacerEnvio, guardarCampana, registrarEnvio, type Resultado } from "./actions";

type Campana = { id: string; nombre: string; tipo: string; meses: number; mensaje: string; servicio_ids: string[] };
type Servicio = { id: string; nombre: string };

function Aviso({ estado }: { estado: Resultado }) {
  if (estado?.error) return <p className="text-sm text-peligro" role="alert">{estado.error}</p>;
  if (estado?.ok) return <p className="text-sm text-ok" role="status">{estado.ok}</p>;
  return null;
}

export function FormCampana({ campana, servicios, negocio }: { campana?: Campana; servicios: Servicio[]; negocio: string }) {
  const [estado, accion, cargando] = useActionState(guardarCampana, undefined);
  const [tipo, setTipo] = useState(campana?.tipo ?? "recordatorio");
  const [mensaje, setMensaje] = useState(campana?.mensaje ?? "Hola {nombre}! Te escribimos de {negocio}. ");
  const area = useRef<HTMLTextAreaElement>(null);

  function insertar(v: string) {
    const el = area.current;
    if (!el) return setMensaje((m) => m + v);
    const ini = el.selectionStart ?? mensaje.length;
    const fin = el.selectionEnd ?? mensaje.length;
    const nuevo = mensaje.slice(0, ini) + v + mensaje.slice(fin);
    setMensaje(nuevo);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(ini + v.length, ini + v.length);
    });
  }

  return (
    <form action={accion} className="grid lg:grid-cols-[1fr_320px] gap-6">
      {campana && <input type="hidden" name="id" value={campana.id} />}
      <div className="space-y-4 min-w-0">
        <Campo label="Nombre de la campaña *" name="nombre" defaultValue={campana?.nombre} required placeholder="Alineación cada 6 meses" />

        <fieldset>
          <legend className="etiqueta">A quién le escribimos</legend>
          <div className="grid sm:grid-cols-3 gap-2">
            {Object.entries(TIPOS_CAMPANA).map(([k, t]) => (
              <label key={k} className={`cursor-pointer rounded-lg border p-3 text-sm ${tipo === k ? "border-asfalto ring-2 ring-senal bg-superficie" : "border-borde"}`}>
                <input type="radio" name="tipo" value={k} checked={tipo === k} onChange={() => setTipo(k)} className="sr-only" />
                <span className="font-semibold block">{t.label}</span>
                <span className="text-suave text-xs">{t.ayuda}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {tipo === "recordatorio" && (
          <fieldset>
            <legend className="etiqueta">Servicios que cuentan</legend>
            <p className="text-xs text-suave mb-2">Si no marcás ninguno, cuenta cualquier servicio.</p>
            <div className="flex flex-wrap gap-2">
              {servicios.map((s) => (
                <label key={s.id} className="flex items-center gap-1.5 rounded-full border border-borde px-3 py-1 text-sm cursor-pointer has-[:checked]:bg-asfalto has-[:checked]:text-white">
                  <input type="checkbox" name="servicio_ids" value={s.id} defaultChecked={campana?.servicio_ids.includes(s.id)} className="accent-senal" />
                  {s.nombre}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {tipo !== "libre" && (
          <Campo
            label={tipo === "recordatorio" ? "Meses desde la última vez *" : "Meses sin venir *"}
            name="meses"
            type="number"
            min={0}
            max={60}
            defaultValue={campana && campana.tipo === tipo ? campana.meses : tipo === "inactivos" ? 12 : 6}
            key={tipo}
            className="max-w-48"
            required
          />
        )}

        <div>
          <label className="etiqueta" htmlFor="mensaje">Mensaje de WhatsApp *</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {VARIABLES.map((v) => (
              <button type="button" key={v.clave} onClick={() => insertar(v.clave)} title={v.ayuda} className="rounded-md border border-borde bg-superficie px-2 py-0.5 text-xs font-mono hover:border-asfalto">
                {v.clave}
              </button>
            ))}
          </div>
          <textarea
            ref={area}
            id="mensaje"
            name="mensaje"
            className="input min-h-36"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            maxLength={2000}
            required
          />
          <p className="text-xs text-suave mt-1">Tocá una variable para insertarla. Se reemplaza con los datos de cada cliente.</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn btn-oscuro" disabled={cargando}>{cargando ? "Guardando..." : campana ? "Guardar cambios" : "Crear campaña"}</button>
          <Aviso estado={estado} />
        </div>
      </div>

      <aside className="min-w-0">
        <div className="etiqueta">Así le llega al cliente</div>
        <div className="rounded-xl bg-[#e5ddd5] p-4">
          <div className="ml-auto max-w-[90%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 text-sm text-zinc-900 whitespace-pre-wrap shadow-sm">
            {armarMensaje(mensaje, { ...EJEMPLO, negocio })}
          </div>
        </div>
        <p className="text-xs text-suave mt-2">Ejemplo con un cliente &quot;Juan Pérez&quot;, Ford Fiesta, alineación hace 7 meses.</p>
      </aside>
    </form>
  );
}

export function BotonEnviar({ campanaId, clienteId, link, enviado }: { campanaId: string; clienteId: string; link: string | null; enviado: boolean }) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!link) return <span className="text-xs text-peligro">Teléfono inválido</span>;

  function enviar() {
    window.open(link!, "_blank", "noopener,noreferrer");
    iniciar(async () => {
      const r = await registrarEnvio(campanaId, clienteId);
      setError(r.error ?? null);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={enviar} disabled={pendiente} className={`btn btn-chico ${enviado ? "btn-secundario" : "btn-primario"}`}>
        {enviado ? "Reenviar" : "Enviar por WhatsApp"}
      </button>
      {enviado && (
        <button
          type="button"
          className="text-xs underline text-suave"
          disabled={pendiente}
          onClick={() => iniciar(async () => { await deshacerEnvio(campanaId, clienteId); })}
        >
          Desmarcar
        </button>
      )}
      {error && <span className="text-xs text-peligro">{error}</span>}
    </div>
  );
}
