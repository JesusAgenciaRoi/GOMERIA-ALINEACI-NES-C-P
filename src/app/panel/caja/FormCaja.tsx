"use client";

import { useActionState, useEffect, useRef } from "react";
import { CATEGORIAS_CAJA, MEDIOS_PAGO } from "@/lib/negocio";
import { registrarMovimiento } from "./actions";

export default function FormCaja() {
  const [estado, accion, cargando] = useActionState(registrarMovimiento, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado?.ok) ref.current?.reset();
  }, [estado]);
  const manuales = Object.entries(CATEGORIAS_CAJA).filter(([k]) => k !== "venta" && k !== "anulacion");

  return (
    <form ref={ref} action={accion} className="space-y-3">
      <div>
        <label className="etiqueta" htmlFor="categoria">Tipo de movimiento</label>
        <select className="input" id="categoria" name="categoria" defaultValue="gasto" required>
          <optgroup label="Egresos">
            {manuales.filter(([, c]) => c.tipo === "egreso").map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
          </optgroup>
          <optgroup label="Ingresos">
            {manuales.filter(([, c]) => c.tipo === "ingreso").map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
          </optgroup>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="etiqueta" htmlFor="monto">Monto *</label>
          <input className="input" id="monto" name="monto" type="number" min="0.01" step="0.01" required />
        </div>
        <div>
          <label className="etiqueta" htmlFor="medio">Medio</label>
          <select className="input" id="medio" name="medio" defaultValue="efectivo">
            {Object.entries(MEDIOS_PAGO).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="etiqueta" htmlFor="concepto">Concepto</label>
        <input className="input" id="concepto" name="concepto" placeholder="Ej: compra de parches, luz, adelanto Juan" />
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-oscuro" disabled={cargando}>{cargando ? "Guardando..." : "Registrar"}</button>
        {estado?.error && <p className="text-sm text-peligro" role="alert">{estado.error}</p>}
        {estado?.ok && <p className="text-sm text-ok" role="status">{estado.ok}</p>}
      </div>
    </form>
  );
}
