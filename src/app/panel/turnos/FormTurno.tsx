"use client";

import { useActionState, useState } from "react";
import { crearTurno, actualizarTurno } from "./actions";
import { pesos } from "@/lib/fechas";

type Servicio = { id: string; nombre: string; duracion_min: number; precio: number | null; tipo_recurso: string; activo: boolean };
type Recurso = { id: string; nombre: string; tipo: string };
type Vehiculo = { id: string; patente: string | null; marca: string | null; modelo: string | null };

export type ValoresTurno = {
  id?: string;
  servicio_id?: string;
  vehiculo_id?: string | null;
  recurso_id?: string;
  fecha?: string;
  hora?: string;
  duracion?: number;
  precio?: number | null;
  notas?: string | null;
};

export default function FormTurno({
  clienteId,
  servicios,
  recursos,
  vehiculos,
  valores = {},
}: {
  clienteId: string;
  servicios: Servicio[];
  recursos: Recurso[];
  vehiculos: Vehiculo[];
  valores?: ValoresTurno;
}) {
  const editando = Boolean(valores.id);
  const [estado, accion, cargando] = useActionState(editando ? actualizarTurno : crearTurno, undefined);
  const [servicioId, setServicioId] = useState(valores.servicio_id ?? servicios.find((s) => s.activo)?.id ?? "");
  const servicio = servicios.find((s) => s.id === servicioId);
  const [duracion, setDuracion] = useState<number | "">(valores.duracion ?? servicio?.duracion_min ?? 30);

  return (
    <form action={accion} className="grid sm:grid-cols-2 gap-4">
      {valores.id && <input type="hidden" name="id" value={valores.id} />}
      <input type="hidden" name="cliente_id" value={clienteId} />

      <div className="sm:col-span-2">
        <label className="etiqueta" htmlFor="servicio_id">Servicio *</label>
        <select
          className="input"
          id="servicio_id"
          name="servicio_id"
          value={servicioId}
          onChange={(e) => {
            setServicioId(e.target.value);
            const s = servicios.find((x) => x.id === e.target.value);
            if (s) setDuracion(s.duracion_min);
          }}
          required
        >
          {servicios.map((s) => (
            <option key={s.id} value={s.id} disabled={!s.activo && s.id !== valores.servicio_id}>
              {s.nombre} · {s.duracion_min} min · {pesos(s.precio)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="etiqueta" htmlFor="fecha">Fecha *</label>
        <input className="input" type="date" id="fecha" name="fecha" defaultValue={valores.fecha} required />
      </div>
      <div>
        <label className="etiqueta" htmlFor="hora">Hora *</label>
        <input className="input" type="time" id="hora" name="hora" step={300} defaultValue={valores.hora} required />
      </div>

      <div>
        <label className="etiqueta" htmlFor="duracion">Duración (min)</label>
        <input
          className="input"
          type="number"
          id="duracion"
          name="duracion"
          min={5}
          max={600}
          step={5}
          value={duracion}
          onChange={(e) => setDuracion(e.target.value === "" ? "" : Number(e.target.value))}
        />
      </div>
      <div>
        <label className="etiqueta" htmlFor="recurso_id">Elevador / máquina</label>
        <select className="input" id="recurso_id" name="recurso_id" defaultValue={valores.recurso_id ?? ""}>
          <option value="">Automático (primero libre)</option>
          {recursos
            .filter((r) => !servicio || r.tipo === servicio.tipo_recurso || r.id === valores.recurso_id)
            .map((r) => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
        </select>
      </div>

      <div>
        <label className="etiqueta" htmlFor="vehiculo_id">Vehículo</label>
        <select className="input" id="vehiculo_id" name="vehiculo_id" defaultValue={valores.vehiculo_id ?? vehiculos[0]?.id ?? ""}>
          <option value="">Sin especificar</option>
          {vehiculos.map((v) => (
            <option key={v.id} value={v.id}>{[v.patente, v.marca, v.modelo].filter(Boolean).join(" ")}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="etiqueta" htmlFor="precio">Precio</label>
        <input className="input" type="number" id="precio" name="precio" min={0} step={100} defaultValue={valores.precio ?? undefined} placeholder={servicio?.precio != null ? String(servicio.precio) : "Consultar"} />
      </div>

      {!editando && (
        <div>
          <label className="etiqueta" htmlFor="origen">Cómo se agendó</label>
          <select className="input" id="origen" name="origen" defaultValue="local">
            <option value="local">En el local</option>
            <option value="telefono">Teléfono</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>
      )}

      <div className="sm:col-span-2">
        <label className="etiqueta" htmlFor="notas">Notas</label>
        <textarea className="input min-h-20" id="notas" name="notas" defaultValue={valores.notas ?? ""} placeholder="Ej: trae cubiertas propias, ruido en tren delantero..." />
      </div>

      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <button className="btn btn-primario" disabled={cargando}>
          {cargando ? "Guardando..." : editando ? "Guardar cambios" : "Agendar turno"}
        </button>
        {estado?.error && <p className="text-sm text-peligro" role="alert">{estado.error}</p>}
        {estado?.ok && editando && <p className="text-sm text-ok" role="status">{estado.ok}</p>}
      </div>
    </form>
  );
}
