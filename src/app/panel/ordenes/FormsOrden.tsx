"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { pesos } from "@/lib/fechas";
import { MEDIOS_PAGO, num } from "@/lib/negocio";
import { actualizarOrden, agregarItem, cobrar, type Resultado } from "./actions";

function Mensaje({ estado }: { estado: Resultado }) {
  if (estado?.error) return <p className="text-sm text-peligro" role="alert">{estado.error}</p>;
  if (estado?.ok) return <p className="text-sm text-ok" role="status">{estado.ok}</p>;
  return null;
}

type Servicio = { id: string; nombre: string; precio: number | null };
type Producto = { id: string; nombre: string; medida: string | null; marca: string | null; precio_venta: number | null; stock: number; reservado: number };

const TIPOS = [
  { v: "servicio", l: "Servicio" },
  { v: "producto", l: "Producto del stock" },
  { v: "insumo", l: "Insumo incluido" },
  { v: "mano_obra", l: "Mano de obra" },
  { v: "otro", l: "Otro" },
] as const;

export function AgregarItem({ ordenId, servicios, productos }: { ordenId: string; servicios: Servicio[]; productos: Producto[] }) {
  const [estado, accion, cargando] = useActionState(agregarItem, undefined);
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]["v"]>("servicio");
  const [selId, setSelId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState<string>("");
  const [filtro, setFiltro] = useState("");
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!estado?.ok) return;
    ref.current?.reset();
    const t = setTimeout(() => { setSelId(""); setDescripcion(""); setPrecio(""); setFiltro(""); }, 0);
    return () => clearTimeout(t);
  }, [estado]);

  const productosFiltrados = useMemo(() => {
    const f = filtro.toLowerCase().trim();
    return f ? productos.filter((p) => `${p.nombre} ${p.medida ?? ""} ${p.marca ?? ""}`.toLowerCase().includes(f)) : productos;
  }, [filtro, productos]);
  const productoSel = productos.find((p) => p.id === selId);

  function elegir(id: string) {
    setSelId(id);
    if (tipo === "servicio") {
      const s = servicios.find((x) => x.id === id);
      setDescripcion(s?.nombre ?? "");
      setPrecio(s?.precio != null ? String(s.precio) : "");
    } else {
      const p = productos.find((x) => x.id === id);
      setDescripcion(p ? [p.nombre, p.medida].filter(Boolean).join(" ") : "");
      setPrecio(tipo === "insumo" ? "0" : p?.precio_venta != null ? String(p.precio_venta) : "");
    }
  }

  return (
    <form ref={ref} action={accion} className="space-y-3">
      <input type="hidden" name="orden_id" value={ordenId} />
      <input type="hidden" name="tipo" value={tipo} />
      <div className="flex flex-wrap gap-1 p-1 bg-fondo rounded-lg" role="tablist">
        {TIPOS.map((t) => (
          <button
            key={t.v}
            type="button"
            role="tab"
            aria-selected={tipo === t.v}
            onClick={() => { setTipo(t.v); setSelId(""); setDescripcion(""); setPrecio(""); }}
            className={`flex-1 rounded-md px-2 py-1.5 text-sm font-semibold ${tipo === t.v ? "bg-superficie shadow-sm" : "text-suave"}`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {tipo === "servicio" && (
        <div>
          <label className="etiqueta" htmlFor="servicio_id">Servicio</label>
          <select className="input" id="servicio_id" name="servicio_id" value={selId} onChange={(e) => elegir(e.target.value)} required>
            <option value="">Elegí un servicio...</option>
            {servicios.map((s) => <option key={s.id} value={s.id}>{s.nombre} · {pesos(s.precio)}</option>)}
          </select>
        </div>
      )}

      {tipo === "insumo" && (
        <p className="text-xs text-suave">
          Para lo que se usa en el trabajo y ya está incluido en el precio del servicio (parches, pesas, válvulas...). Descuenta stock al cobrar, sin sumar al total.
        </p>
      )}

      {(tipo === "producto" || tipo === "insumo") && (
        <div className="space-y-2">
          <input className="input" placeholder="Filtrar por nombre o medida (ej: 175/65)..." value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar productos" />
          <select className="input" name="producto_id" value={selId} onChange={(e) => elegir(e.target.value)} required size={Math.min(6, Math.max(productosFiltrados.length, 2))} aria-label="Producto">
            {productosFiltrados.map((p) => (
              <option key={p.id} value={p.id}>
                {[p.nombre, p.medida, p.marca].filter(Boolean).join(" · ")} | disponible {num(p.stock - p.reservado)}{p.reservado > 0 ? ` (${num(p.reservado)} reservado)` : ""}{tipo === "producto" ? ` | ${pesos(p.precio_venta)}` : ""}
              </option>
            ))}
          </select>
          {productos.length === 0 && <p className="text-xs text-suave">No hay productos activos en el inventario.</p>}
          {productoSel && productoSel.stock - productoSel.reservado <= 0 && (
            <p className="text-xs text-amber-700">Atención: no hay unidades disponibles (stock {num(productoSel.stock)}, reservado en otras órdenes {num(productoSel.reservado)}).</p>
          )}
        </div>
      )}

      <div>
        <label className="etiqueta" htmlFor="descripcion">Descripción</label>
        <input
          className="input"
          id="descripcion"
          name="descripcion"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder={tipo === "mano_obra" ? "Ej: cambio de pastillas de freno" : "Descripción"}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="etiqueta" htmlFor="cantidad">Cantidad</label>
          <input className="input" id="cantidad" name="cantidad" type="number" min="0.01" step="any" defaultValue={1} required />
        </div>
        <div>
          <label className="etiqueta" htmlFor="precio_unitario">Precio unitario</label>
          {tipo === "insumo" ? (
            <>
              <input type="hidden" name="precio_unitario" value="0" />
              <div className="input bg-fondo text-suave">Incluido ($ 0)</div>
            </>
          ) : (
            <input className="input" id="precio_unitario" name="precio_unitario" type="number" min={0} step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} required />
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-oscuro" disabled={cargando}>{cargando ? "Agregando..." : "+ Agregar a la orden"}</button>
        <Mensaje estado={estado} />
      </div>
    </form>
  );
}

type Vehiculo = { id: string; patente: string | null; marca: string | null; modelo: string | null };

export function DatosOrden({
  orden,
  vehiculos,
  editable,
}: {
  orden: { id: string; km: number | null; notas: string | null; factura: string | null; vehiculo_id: string | null; descuento: number };
  vehiculos: Vehiculo[];
  editable: boolean;
}) {
  const [estado, accion, cargando] = useActionState(actualizarOrden, undefined);
  return (
    <form action={accion} className="grid sm:grid-cols-2 gap-3">
      <input type="hidden" name="id" value={orden.id} />
      <div>
        <label className="etiqueta" htmlFor="vehiculo_id">Vehículo</label>
        <select className="input" id="vehiculo_id" name="vehiculo_id" defaultValue={orden.vehiculo_id ?? ""}>
          <option value="">Sin especificar</option>
          {vehiculos.map((v) => <option key={v.id} value={v.id}>{[v.patente, v.marca, v.modelo].filter(Boolean).join(" ")}</option>)}
        </select>
      </div>
      <div>
        <label className="etiqueta" htmlFor="km">Kilometraje</label>
        <input className="input" id="km" name="km" type="number" min={0} defaultValue={orden.km ?? undefined} />
      </div>
      <div>
        <label className="etiqueta" htmlFor="descuento">Descuento ($)</label>
        <input className="input" id="descuento" name="descuento" type="number" min={0} step="0.01" defaultValue={orden.descuento} disabled={!editable} />
        {!editable && <input type="hidden" name="descuento" value={orden.descuento} />}
      </div>
      <div>
        <label className="etiqueta" htmlFor="factura">N.º de factura</label>
        <input className="input" id="factura" name="factura" defaultValue={orden.factura ?? ""} placeholder="Opcional" />
      </div>
      <div className="sm:col-span-2">
        <label className="etiqueta" htmlFor="notas">Notas / diagnóstico</label>
        <textarea className="input min-h-20" id="notas" name="notas" defaultValue={orden.notas ?? ""} />
      </div>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button className="btn btn-secundario" disabled={cargando}>{cargando ? "Guardando..." : "Guardar datos"}</button>
        <Mensaje estado={estado} />
      </div>
    </form>
  );
}

export function Cobrar({ ordenId, total, factura }: { ordenId: string; total: number; factura: string | null }) {
  const [estado, accion, cargando] = useActionState(cobrar, undefined);
  const [pagos, setPagos] = useState([{ medio: "efectivo", monto: String(total) }]);
  const suma = pagos.reduce((a, p) => a + (Number(p.monto) || 0), 0);
  const diferencia = Math.round((total - suma) * 100) / 100;

  const set = (i: number, campo: "medio" | "monto", v: string) => setPagos(pagos.map((p, k) => (k === i ? { ...p, [campo]: v } : p)));

  return (
    <form action={accion} className="space-y-3">
      <input type="hidden" name="id" value={ordenId} />
      {pagos.map((p, i) => (
        <div key={i} className="flex gap-2">
          <select className="input" name="medio" value={p.medio} onChange={(e) => set(i, "medio", e.target.value)} aria-label={`Medio de pago ${i + 1}`}>
            {Object.entries(MEDIOS_PAGO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input className="input w-36" name="monto" type="number" min={0} step="0.01" value={p.monto} onChange={(e) => set(i, "monto", e.target.value)} aria-label={`Monto ${i + 1}`} />
          {pagos.length > 1 && (
            <button type="button" className="btn btn-chico btn-peligro" onClick={() => setPagos(pagos.filter((_, k) => k !== i))} aria-label="Quitar pago">✕</button>
          )}
        </div>
      ))}
      <button
        type="button"
        className="text-sm font-semibold underline underline-offset-4"
        onClick={() => setPagos([...pagos, { medio: "transferencia", monto: diferencia > 0 ? String(diferencia) : "" }])}
      >
        + Dividir en otro medio de pago
      </button>
      <div>
        <label className="etiqueta" htmlFor="factura-cobro">N.º de factura (opcional)</label>
        <input className="input" id="factura-cobro" name="factura" defaultValue={factura ?? ""} />
      </div>
      <div className={`text-sm font-semibold ${diferencia === 0 ? "text-ok" : "text-peligro"}`}>
        {diferencia === 0 ? `Total a cobrar: ${pesos(total)}` : diferencia > 0 ? `Faltan ${pesos(diferencia)}` : `Sobran ${pesos(-diferencia)}`}
      </div>
      <button className="btn btn-primario w-full text-lg py-3" disabled={cargando || diferencia !== 0}>
        {cargando ? "Cobrando..." : `Cobrar ${pesos(total)}`}
      </button>
      <Mensaje estado={estado} />
    </form>
  );
}
