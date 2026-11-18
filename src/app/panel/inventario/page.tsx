import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/auth";
import { Encabezado, Vacio } from "@/components/ui";
import { pesos } from "@/lib/fechas";
import { CATEGORIAS_PRODUCTO, CONDICION, num } from "@/lib/negocio";
import { FormProducto } from "./FormProducto";

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; bajo?: string; inactivos?: string }>;
}) {
  const { q = "", cat = "", bajo, inactivos } = await searchParams;
  const perfil = await obtenerPerfil();
  const esAdmin = perfil?.rol === "admin";
  const supabase = await createClient();

  let consulta = supabase
    .from("productos")
    .select("id, codigo, nombre, categoria, marca, medida, condicion, precio_venta, precio_costo, stock, stock_minimo, activo, proveedores(nombre)")
    .order("categoria")
    .order("nombre")
    .limit(500);
  if (!inactivos) consulta = consulta.eq("activo", true);
  if (cat && cat in CATEGORIAS_PRODUCTO) consulta = consulta.eq("categoria", cat);
  const termino = q.replace(/[,()%*\\]/g, " ").trim();
  if (termino) consulta = consulta.or(`nombre.ilike.%${termino}%,medida.ilike.%${termino}%,marca.ilike.%${termino}%,codigo.ilike.%${termino}%`);

  const [{ data: productosTodos }, { data: proveedores }, { data: reservas }] = await Promise.all([
    consulta,
    supabase.from("proveedores").select("id, nombre").order("nombre"),
    supabase.from("productos_reservado").select("producto_id, reservado"),
  ]);
  const reservadoDe = new Map((reservas ?? []).map((r) => [r.producto_id, Number(r.reservado ?? 0)]));
  const productos = (productosTodos ?? []).filter((p) => !bajo || p.stock <= p.stock_minimo);
  const bajos = (productosTodos ?? []).filter((p) => p.activo && p.stock <= p.stock_minimo && p.stock_minimo > 0).length;
  const valorStock = (productosTodos ?? []).reduce((a, p) => a + Math.max(p.stock, 0) * (p.precio_costo ?? 0), 0);

  const link = (extra: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const base = { q, cat, bajo, inactivos, ...extra };
    Object.entries(base).forEach(([k, v]) => v && sp.set(k, v));
    return `/panel/inventario?${sp.toString()}`;
  };

  return (
    <div className="max-w-7xl">
      <Encabezado titulo="Inventario" subtitulo="Cubiertas, llantas, repuestos e insumos">
        <Link href="/panel/compras/nueva" className="btn btn-primario">+ Registrar compra</Link>
        {esAdmin && <Link href="/panel/inventario/proveedores" className="btn btn-secundario">Proveedores</Link>}
      </Encabezado>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <div className="tarjeta p-4">
          <div className="text-sm text-suave">Productos activos</div>
          <div className="titulo text-3xl">{(productosTodos ?? []).filter((p) => p.activo).length}</div>
        </div>
        <Link href={link({ bajo: bajo ? undefined : "1" })} className={`tarjeta p-4 ${bajos ? "border-amber-400 bg-amber-50" : ""}`}>
          <div className="text-sm text-suave">Con stock bajo</div>
          <div className="titulo text-3xl">{bajos}</div>
        </Link>
        {esAdmin && (
          <div className="tarjeta p-4 col-span-2 lg:col-span-1">
            <div className="text-sm text-suave">Valor del stock (a costo)</div>
            <div className="titulo text-3xl">{pesos(valorStock)}</div>
          </div>
        )}
      </div>

      {esAdmin && (
        <details className="tarjeta mb-6 group">
          <summary className="cursor-pointer list-none px-5 py-4 font-semibold flex justify-between">
            + Nuevo producto <span className="text-suave text-sm group-open:hidden">Abrir</span>
          </summary>
          <div className="px-5 pb-5"><FormProducto proveedores={proveedores ?? []} /></div>
        </details>
      )}

      <form className="flex flex-wrap gap-2 mb-3" role="search">
        <input className="input flex-1 min-w-48" name="q" defaultValue={q} placeholder="Buscar por nombre, medida (175/65), marca o código..." aria-label="Buscar productos" />
        {cat && <input type="hidden" name="cat" value={cat} />}
        <button className="btn btn-oscuro">Buscar</button>
      </form>
      <div className="flex flex-wrap gap-1.5 mb-4">
        <Link href={link({ cat: undefined })} className={`px-3 py-1 rounded-full text-sm border ${!cat ? "bg-asfalto text-white border-asfalto" : "border-borde bg-superficie"}`}>Todas</Link>
        {Object.entries(CATEGORIAS_PRODUCTO).map(([v, l]) => (
          <Link key={v} href={link({ cat: v })} className={`px-3 py-1 rounded-full text-sm border ${cat === v ? "bg-asfalto text-white border-asfalto" : "border-borde bg-superficie"}`}>
            {l.split(" (")[0]}
          </Link>
        ))}
        <Link href={link({ inactivos: inactivos ? undefined : "1" })} className="px-3 py-1 rounded-full text-sm border border-dashed border-borde ml-auto">
          {inactivos ? "Ocultar inactivos" : "Ver inactivos"}
        </Link>
      </div>

      {productos.length > 0 ? (
        <div className="tarjeta overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-suave border-b border-borde">
              <tr>
                <th className="px-4 py-3 font-semibold">Producto</th>
                <th className="px-4 py-3 font-semibold">Medida</th>
                <th className="px-4 py-3 font-semibold hidden md:table-cell">Categoría</th>
                <th className="px-4 py-3 font-semibold text-right">Precio</th>
                <th className="px-4 py-3 font-semibold text-right">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {productos.map((p) => {
                const bajoStock = p.stock <= p.stock_minimo && p.stock_minimo > 0;
                return (
                  <tr key={p.id} className={`hover:bg-fondo ${p.activo ? "" : "opacity-50"}`}>
                    <td className="px-4 py-3">
                      <Link href={`/panel/inventario/${p.id}`} className="font-semibold hover:underline">{p.nombre}</Link>
                      <div className="text-xs text-suave">
                        {[p.marca, CONDICION[p.condicion], p.codigo, p.proveedores?.nombre].filter(Boolean).join(" · ")}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{p.medida ?? "-"}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-suave">{CATEGORIAS_PRODUCTO[p.categoria]?.split(" (")[0]}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{pesos(p.precio_venta)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-block min-w-12 text-center px-2 py-0.5 rounded-full font-bold tabular-nums ${p.stock <= 0 ? "bg-rose-100 text-rose-900" : bajoStock ? "bg-amber-100 text-amber-900" : "bg-emerald-50 text-emerald-900"}`}>
                        {num(p.stock)}
                      </span>
                      {(reservadoDe.get(p.id) ?? 0) > 0 && (
                        <span className="block text-xs text-suave mt-0.5">{num(reservadoDe.get(p.id))} reservado · {num(p.stock - (reservadoDe.get(p.id) ?? 0))} disp.</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Vacio>{q || cat || bajo ? "No hay productos con ese filtro." : esAdmin ? "Todavía no hay productos. Cargá el primero con “Nuevo producto”." : "Todavía no hay productos cargados."}</Vacio>
      )}
    </div>
  );
}
