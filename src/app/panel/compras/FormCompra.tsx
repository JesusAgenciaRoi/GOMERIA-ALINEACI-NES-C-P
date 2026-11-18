"use client";

import { useActionState, useMemo, useState } from "react";
import { pesos } from "@/lib/fechas";
import { CATEGORIAS_GASTO_COMPRA, CATEGORIAS_PRODUCTO, CONDICION, MEDIOS_COMPRA, num } from "@/lib/negocio";
import { guardarCompra } from "./actions";

type Producto = { id: string; nombre: string; medida: string | null; marca: string | null; stock: number; precio_costo: number | null; precio_venta: number | null };
type Proveedor = { id: string; nombre: string };

type Linea =
  | { key: number; tipo: "producto"; producto_id: string; filtro: string; cantidad: string; costo_unitario: string; precio_venta: string }
  | { key: number; tipo: "nuevo"; nombre: string; categoria: string; medida: string; marca: string; condicion: string; precio_venta: string; stock_minimo: string; cantidad: string; costo_unitario: string }
  | { key: number; tipo: "gasto"; categoria: string; descripcion: string; cantidad: string; costo_unitario: string };

let siguiente = 1;
const nueva = (tipo: Linea["tipo"], productoId = ""): Linea => {
  const key = siguiente++;
  if (tipo === "producto") return { key, tipo, producto_id: productoId, filtro: "", cantidad: "1", costo_unitario: "", precio_venta: "" };
  if (tipo === "nuevo") return { key, tipo, nombre: "", categoria: "cubierta", medida: "", marca: "", condicion: "nueva", precio_venta: "", stock_minimo: "0", cantidad: "1", costo_unitario: "" };
  return { key, tipo, categoria: "herramienta", descripcion: "", cantidad: "1", costo_unitario: "" };
};

const ETIQUETA: Record<Linea["tipo"], { titulo: string; ayuda: string; color: string }> = {
  producto: { titulo: "Producto del inventario", ayuda: "Suma stock y actualiza el costo", color: "border-l-emerald-500" },
  nuevo: { titulo: "Producto nuevo", ayuda: "Se crea en el inventario con este stock", color: "border-l-sky-500" },
  gasto: { titulo: "No va al inventario", ayuda: "Herramientas, gastos o servicios", color: "border-l-zinc-400" },
};

export default function FormCompra({ productos, proveedores, hoy, productoInicial }: { productos: Producto[]; proveedores: Proveedor[]; hoy: string; productoInicial?: string }) {
  const [estado, accion, cargando] = useActionState(guardarCompra, undefined);
  const [lineas, setLineas] = useState<Linea[]>(() => [productoInicial ? nueva("producto", productoInicial) : nueva("producto")]);
  const [proveedor, setProveedor] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [factura, setFactura] = useState("");
  const [medio, setMedio] = useState("efectivo");
  const [notas, setNotas] = useState("");

  const subtotal = (l: Linea) => (Number(l.cantidad) || 0) * (Number(l.costo_unitario) || 0);
  const total = lineas.reduce((a, l) => a + subtotal(l), 0);
  const totalStock = lineas.filter((l) => l.tipo !== "gasto").reduce((a, l) => a + subtotal(l), 0);
  const totalGastos = total - totalStock;

  const actualizar = (key: number, cambios: Partial<Record<string, string>>) =>
    setLineas((ls) => ls.map((l) => (l.key === key ? ({ ...l, ...cambios } as Linea) : l)));

  const datos = useMemo(
    () =>
      JSON.stringify({
        proveedor_id: proveedor || null,
        fecha,
        factura,
        medio,
        notas,
        items: lineas.map((l) => {
          if (l.tipo === "producto") return { tipo: "producto", producto_id: l.producto_id, cantidad: l.cantidad, costo_unitario: l.costo_unitario, precio_venta: l.precio_venta };
          if (l.tipo === "nuevo") {
            const { key, ...resto } = l;
            void key;
            return resto;
          }
          return { tipo: "gasto", categoria: l.categoria, descripcion: l.descripcion, cantidad: l.cantidad, costo_unitario: l.costo_unitario };
        }),
      }),
    [proveedor, fecha, factura, medio, notas, lineas],
  );

  const faltaProducto = lineas.some((l) => l.tipo === "producto" && !l.producto_id);

  return (
    <form action={accion} className="space-y-6">
      <input type="hidden" name="datos" value={datos} />

      <section className="tarjeta p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="etiqueta" htmlFor="proveedor">Proveedor</label>
          <select className="input" id="proveedor" value={proveedor} onChange={(e) => setProveedor(e.target.value)}>
            <option value="">Sin proveedor</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="etiqueta" htmlFor="fecha">Fecha</label>
          <input className="input" id="fecha" type="date" value={fecha} max={hoy} onChange={(e) => setFecha(e.target.value)} required />
        </div>
        <div>
          <label className="etiqueta" htmlFor="factura">N.º de factura / remito</label>
          <input className="input" id="factura" value={factura} onChange={(e) => setFactura(e.target.value)} placeholder="Opcional" />
        </div>
        <div>
          <label className="etiqueta" htmlFor="medio">Cómo se pagó</label>
          <select className="input" id="medio" value={medio} onChange={(e) => setMedio(e.target.value)}>
            {Object.entries(MEDIOS_COMPRA).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </section>

      <section className="space-y-3">
        {lineas.map((l, idx) => {
          const et = ETIQUETA[l.tipo];
          return (
            <div key={l.key} className={`tarjeta border-l-4 ${et.color} p-4`}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <span className="font-semibold">{idx + 1}. {et.titulo}</span>
                  <span className="text-xs text-suave ml-2">{et.ayuda}</span>
                </div>
                {lineas.length > 1 && (
                  <button type="button" className="text-xs text-peligro hover:underline" onClick={() => setLineas(lineas.filter((x) => x.key !== l.key))}>
                    Quitar línea
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 items-end">
                {l.tipo === "producto" && <LineaProducto l={l} productos={productos} actualizar={actualizar} />}

                {l.tipo === "nuevo" && (
                  <>
                    <Txt label="Nombre *" v={l.nombre} on={(v) => actualizar(l.key, { nombre: v })} className="col-span-2" placeholder="Cubierta Pirelli P400" />
                    <div>
                      <label className="etiqueta">Categoría</label>
                      <select className="input" value={l.categoria} onChange={(e) => actualizar(l.key, { categoria: e.target.value })}>
                        {Object.entries(CATEGORIAS_PRODUCTO).map(([v, t]) => <option key={v} value={v}>{t.split(" (")[0]}</option>)}
                      </select>
                    </div>
                    <Txt label="Medida" v={l.medida} on={(v) => actualizar(l.key, { medida: v })} placeholder="175/65 R14" />
                    <Txt label="Marca" v={l.marca} on={(v) => actualizar(l.key, { marca: v })} />
                    <div>
                      <label className="etiqueta">Condición</label>
                      <select className="input" value={l.condicion} onChange={(e) => actualizar(l.key, { condicion: e.target.value })}>
                        {Object.entries(CONDICION).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                      </select>
                    </div>
                    <Txt label="Precio de venta" v={l.precio_venta} on={(v) => actualizar(l.key, { precio_venta: v })} type="number" />
                    <Txt label="Stock mínimo" v={l.stock_minimo} on={(v) => actualizar(l.key, { stock_minimo: v })} type="number" />
                  </>
                )}

                {l.tipo === "gasto" && (
                  <>
                    <div className="col-span-2 lg:col-span-1">
                      <label className="etiqueta">Tipo</label>
                      <select className="input" value={l.categoria} onChange={(e) => actualizar(l.key, { categoria: e.target.value })}>
                        {Object.entries(CATEGORIAS_GASTO_COMPRA).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                      </select>
                    </div>
                    <Txt label="Descripción *" v={l.descripcion} on={(v) => actualizar(l.key, { descripcion: v })} className="col-span-2 lg:col-span-3" placeholder="Ej: llave de impacto, guantes, aceite para compresor" />
                  </>
                )}

                <Txt label="Cantidad" v={l.cantidad} on={(v) => actualizar(l.key, { cantidad: v })} type="number" min="0.01" />
                <Txt label="Costo unitario" v={l.costo_unitario} on={(v) => actualizar(l.key, { costo_unitario: v })} type="number" min="0" />
                <div className="col-span-2 lg:col-span-1 text-right lg:text-left pb-2">
                  <span className="text-xs text-suave block">Subtotal</span>
                  <strong className="tabular-nums">{pesos(subtotal(l))}</strong>
                </div>
              </div>
            </div>
          );
        })}

        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-chico btn-secundario" onClick={() => setLineas([...lineas, nueva("producto")])}>+ Producto del inventario</button>
          <button type="button" className="btn btn-chico btn-secundario" onClick={() => setLineas([...lineas, nueva("nuevo")])}>+ Producto nuevo</button>
          <button type="button" className="btn btn-chico btn-secundario" onClick={() => setLineas([...lineas, nueva("gasto")])}>+ No va al inventario</button>
        </div>
      </section>

      <section className="tarjeta p-5 grid lg:grid-cols-[1fr_320px] gap-6">
        <div>
          <label className="etiqueta" htmlFor="notas">Notas</label>
          <textarea className="input min-h-20" id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm"><span className="text-suave">Mercadería (va al stock)</span><span className="tabular-nums">{pesos(totalStock)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-suave">Otros (no va al stock)</span><span className="tabular-nums">{pesos(totalGastos)}</span></div>
          <div className="flex justify-between border-t border-borde pt-2"><span className="titulo text-lg">Total</span><span className="titulo text-2xl tabular-nums">{pesos(total)}</span></div>
          <p className="text-xs text-suave">
            {medio === "cuenta_corriente" ? "No se registra salida de caja: queda como deuda con el proveedor." : "Se registra la salida de plata en Caja automáticamente."}
          </p>
          <button className="btn btn-primario w-full text-lg py-3" disabled={cargando || faltaProducto || lineas.length === 0}>
            {cargando ? "Guardando..." : "Registrar compra"}
          </button>
          {faltaProducto && <p className="text-xs text-peligro">Elegí el producto en todas las líneas de inventario.</p>}
          {estado?.error && <p className="text-sm text-peligro" role="alert">{estado.error}</p>}
        </div>
      </section>
    </form>
  );
}

function Txt({ label, v, on, type = "text", className, placeholder, min }: { label: string; v: string; on: (v: string) => void; type?: string; className?: string; placeholder?: string; min?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="etiqueta">{label}</span>
      <input className="input" type={type} value={v} onChange={(e) => on(e.target.value)} placeholder={placeholder} min={min} step={type === "number" ? "any" : undefined} />
    </label>
  );
}

function LineaProducto({
  l,
  productos,
  actualizar,
}: {
  l: Extract<Linea, { tipo: "producto" }>;
  productos: Producto[];
  actualizar: (key: number, c: Partial<Record<string, string>>) => void;
}) {
  const f = l.filtro.toLowerCase().trim();
  const lista = f ? productos.filter((p) => `${p.nombre} ${p.medida ?? ""} ${p.marca ?? ""}`.toLowerCase().includes(f)) : productos;
  const sel = productos.find((p) => p.id === l.producto_id);
  return (
    <>
      <div className="col-span-2 lg:col-span-3 space-y-2">
        <label className="etiqueta">Producto *</label>
        <input className="input" placeholder="Filtrar por nombre o medida..." value={l.filtro} onChange={(e) => actualizar(l.key, { filtro: e.target.value })} aria-label="Filtrar productos" />
        <select
          className="input"
          value={l.producto_id}
          onChange={(e) => {
            const p = productos.find((x) => x.id === e.target.value);
            actualizar(l.key, { producto_id: e.target.value, costo_unitario: l.costo_unitario || (p?.precio_costo != null ? String(p.precio_costo) : "") });
          }}
          aria-label="Producto"
        >
          <option value="">Elegí un producto...</option>
          {lista.map((p) => (
            <option key={p.id} value={p.id}>{[p.nombre, p.medida, p.marca].filter(Boolean).join(" · ")} (stock {num(p.stock)})</option>
          ))}
        </select>
        {sel && <p className="text-xs text-suave">Stock actual {num(sel.stock)} · costo anterior {sel.precio_costo != null ? pesos(sel.precio_costo) : "-"} · venta {pesos(sel.precio_venta)}</p>}
      </div>
      <div>
        <label className="etiqueta">Nuevo precio venta</label>
        <input className="input" type="number" step="any" min="0" value={l.precio_venta} onChange={(e) => actualizar(l.key, { precio_venta: e.target.value })} placeholder="Sin cambio" />
      </div>
    </>
  );
}
