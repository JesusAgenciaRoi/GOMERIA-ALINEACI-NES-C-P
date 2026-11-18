"use client";

import { useActionState, useEffect, useRef } from "react";
import { Campo } from "@/components/ui";
import { ORIGENES } from "@/lib/turnos";
import { actualizarCliente, agregarVehiculo, crearCliente, type Resultado } from "./actions";
import type { Tables } from "@/lib/database.types";

function Mensaje({ estado }: { estado: Resultado }) {
  if (estado?.error) return <p className="text-sm text-peligro" role="alert">{estado.error}</p>;
  if (estado?.ok) return <p className="text-sm text-ok" role="status">{estado.ok}</p>;
  return null;
}

function SelectOrigen({ valor }: { valor?: string }) {
  return (
    <div>
      <label className="etiqueta" htmlFor="origen">Cómo nos conoció</label>
      <select className="input" id="origen" name="origen" defaultValue={valor ?? "local"}>
        {["local", "web", "whatsapp", "referido", "redes", "agente"].map((o) => (
          <option key={o} value={o}>{ORIGENES[o]}</option>
        ))}
      </select>
    </div>
  );
}

export function FormNuevoCliente() {
  const [estado, accion, cargando] = useActionState(crearCliente, undefined);
  return (
    <form action={accion} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Campo label="Nombre y apellido *" name="nombre" required autoFocus />
      <Campo label="Teléfono / WhatsApp" name="telefono" type="tel" placeholder="099 123 456" />
      <Campo label="Email" name="email" type="email" />
      <Campo label="Patente" name="patente" placeholder="ABC 1234" />
      <Campo label="Marca" name="marca" placeholder="Ford" />
      <Campo label="Modelo" name="modelo" placeholder="Fiesta" />
      <SelectOrigen />
      <Campo label="Notas" name="notas" className="sm:col-span-2" />
      <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-3">
        <button className="btn btn-oscuro" disabled={cargando}>{cargando ? "Guardando..." : "Guardar cliente"}</button>
        <Mensaje estado={estado} />
      </div>
    </form>
  );
}

export function FormEditarCliente({ cliente }: { cliente: Tables<"clientes"> }) {
  const [estado, accion, cargando] = useActionState(actualizarCliente, undefined);
  return (
    <form action={accion} className="grid sm:grid-cols-2 gap-4">
      <input type="hidden" name="id" value={cliente.id} />
      <Campo label="Nombre y apellido *" name="nombre" defaultValue={cliente.nombre} required />
      <Campo label="Teléfono / WhatsApp" name="telefono" type="tel" defaultValue={cliente.telefono} />
      <Campo label="Email" name="email" type="email" defaultValue={cliente.email} />
      <SelectOrigen valor={cliente.origen} />
      <div className="sm:col-span-2">
        <label className="etiqueta" htmlFor="notas">Notas</label>
        <textarea className="input min-h-20" id="notas" name="notas" defaultValue={cliente.notas ?? ""} />
      </div>
      <label className="sm:col-span-2 flex items-center gap-2 text-sm">
        <input type="checkbox" name="acepta_promos" defaultChecked={cliente.acepta_promos} className="w-4 h-4 accent-senal" />
        Acepta recibir recordatorios y promociones por WhatsApp
      </label>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button className="btn btn-oscuro" disabled={cargando}>{cargando ? "Guardando..." : "Guardar cambios"}</button>
        <Mensaje estado={estado} />
      </div>
    </form>
  );
}

export function FormVehiculo({ clienteId }: { clienteId: string }) {
  const [estado, accion, cargando] = useActionState(agregarVehiculo, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado?.ok) ref.current?.reset();
  }, [estado]);
  return (
    <form ref={ref} action={accion} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <input type="hidden" name="cliente_id" value={clienteId} />
      <Campo label="Patente" name="patente" placeholder="ABC 1234" />
      <Campo label="Marca" name="marca" />
      <Campo label="Modelo" name="modelo" />
      <Campo label="Año" name="anio" type="number" min={1900} max={2100} />
      <Campo label="Medida cubierta" name="medida_cubierta" placeholder="195/55 R16" />
      <Campo label="Notas" name="notas" />
      <div className="col-span-2 sm:col-span-3 flex items-center gap-3">
        <button className="btn btn-secundario" disabled={cargando}>{cargando ? "Agregando..." : "+ Agregar vehículo"}</button>
        <Mensaje estado={estado} />
      </div>
    </form>
  );
}
