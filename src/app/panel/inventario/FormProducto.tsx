"use client";

import { useActionState, useEffect, useRef } from "react";
import { Campo } from "@/components/ui";
import { CATEGORIAS_PRODUCTO, CONDICION } from "@/lib/negocio";
import type { Tables } from "@/lib/database.types";
import { actualizarProducto, crearProducto, moverStock, type Resultado } from "./actions";

function Mensaje({ estado }: { estado: Resultado }) {
  if (estado?.error) return <p className="text-sm text-peligro" role="alert">{estado.error}</p>;
  if (estado?.ok) return <p className="text-sm text-ok" role="status">{estado.ok}</p>;
  return null;
}

type Proveedor = { id: string; nombre: string };

export function FormProducto({ producto, proveedores }: { producto?: Tables<"productos">; proveedores: Proveedor[] }) {
  const [estado, accion, cargando] = useActionState(producto ? actualizarProducto : crearProducto, undefined);
  const p = producto;
  return (
    <form action={accion} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {p && <input type="hidden" name="id" value={p.id} />}
      <Campo label="Nombre *" name="nombre" defaultValue={p?.nombre} required className="sm:col-span-2" placeholder="Cubierta Pirelli P400" />
      <div>
        <label className="etiqueta" htmlFor="categoria">Categoría</label>
        <select className="input" id="categoria" name="categoria" defaultValue={p?.categoria ?? "cubierta"}>
          {Object.entries(CATEGORIAS_PRODUCTO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div>
        <label className="etiqueta" htmlFor="condicion">Condición</label>
        <select className="input" id="condicion" name="condicion" defaultValue={p?.condicion ?? "nueva"}>
          {Object.entries(CONDICION).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <Campo label="Medida" name="medida" defaultValue={p?.medida} placeholder="175/65 R14" />
      <Campo label="Marca" name="marca" defaultValue={p?.marca} />
      <Campo label="Código" name="codigo" defaultValue={p?.codigo} placeholder="Opcional" />
      <div>
        <label className="etiqueta" htmlFor="proveedor_id">Proveedor</label>
        <select className="input" id="proveedor_id" name="proveedor_id" defaultValue={p?.proveedor_id ?? ""}>
          <option value="">Sin proveedor</option>
          {proveedores.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
        </select>
      </div>
      <Campo label="Precio de costo" name="precio_costo" type="number" min={0} step="0.01" defaultValue={p?.precio_costo} />
      <Campo label="Precio de venta" name="precio_venta" type="number" min={0} step="0.01" defaultValue={p?.precio_venta} />
      <Campo label="Stock mínimo (alerta)" name="stock_minimo" type="number" min={0} step="1" defaultValue={p?.stock_minimo ?? 0} />
      {!p && <Campo label="Stock inicial" name="stock_inicial" type="number" min={0} step="1" defaultValue={0} />}
      <Campo label="Notas" name="notas" defaultValue={p?.notas} className="sm:col-span-2" />
      {p && (
        <label className="flex items-center gap-2 text-sm self-end pb-2.5">
          <input type="checkbox" name="activo" defaultChecked={p.activo} /> Activo (aparece en órdenes)
        </label>
      )}
      <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-3">
        <button className="btn btn-oscuro" disabled={cargando}>{cargando ? "Guardando..." : p ? "Guardar cambios" : "Crear producto"}</button>
        <Mensaje estado={estado} />
      </div>
    </form>
  );
}

export function FormMovimiento({ productoId, proveedores, esAdmin, costo }: { productoId: string; proveedores: Proveedor[]; esAdmin: boolean; costo: number | null }) {
  const [estado, accion, cargando] = useActionState(moverStock, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado?.ok) ref.current?.reset();
  }, [estado]);
  return (
    <form ref={ref} action={accion} className="grid grid-cols-2 gap-3">
      <input type="hidden" name="producto_id" value={productoId} />
      <div className="col-span-2">
        <label className="etiqueta" htmlFor="tipo">Tipo</label>
        <select className="input" id="tipo" name="tipo" defaultValue="ingreso">
          <option value="ingreso">Ingreso sin compra (devolución, regalo de proveedor)</option>
          {esAdmin && <option value="ajuste">Ajuste (+ o -, por conteo)</option>}
        </select>
      </div>
      <Campo label="Cantidad *" name="cantidad" type="number" step="1" required />
      <Campo label="Costo unitario" name="costo_unitario" type="number" min={0} step="0.01" placeholder={costo != null ? String(costo) : ""} />
      <div className="col-span-2">
        <label className="etiqueta" htmlFor="mv-proveedor">Proveedor</label>
        <select className="input" id="mv-proveedor" name="proveedor_id" defaultValue="">
          <option value="">-</option>
          {proveedores.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
        </select>
      </div>
      <Campo label="Motivo / factura de compra" name="motivo" className="col-span-2" />
      <div className="col-span-2 flex items-center gap-3">
        <button className="btn btn-primario" disabled={cargando}>{cargando ? "Registrando..." : "Registrar"}</button>
        <Mensaje estado={estado} />
      </div>
    </form>
  );
}
