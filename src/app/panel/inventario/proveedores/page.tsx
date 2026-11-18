import { createClient } from "@/lib/supabase/server";
import { requerirAdmin } from "@/lib/auth";
import { Campo, Encabezado, Volver } from "@/components/ui";
import { linkWhatsApp } from "@/lib/turnos";
import { eliminarProveedor, guardarProveedor } from "../actions";

export default async function ProveedoresPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requerirAdmin();
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const { data: proveedores } = await supabase.from("proveedores").select("*, productos(count)").order("nombre");

  return (
    <div className="max-w-4xl">
      <Volver href="/panel/inventario">Inventario</Volver>
      <Encabezado titulo="Proveedores" />
      {ok && <p className="tarjeta border-emerald-300 bg-emerald-50 px-4 py-3 mb-4 text-sm" role="status">Guardado.</p>}
      {error && <p className="tarjeta border-rose-300 bg-rose-50 px-4 py-3 mb-4 text-sm" role="alert">{error}</p>}

      <div className="space-y-3">
        {[...(proveedores ?? []), null].map((p) => {
          const wa = p ? linkWhatsApp(p.telefono, "Hola, te escribo de Gomería C&P.") : null;
          return (
            <div key={p?.id ?? "nuevo"} className={`tarjeta p-4 ${p ? "" : "border-dashed border-senal bg-senal/5"}`}>
              <form action={guardarProveedor} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                {p && <input type="hidden" name="id" value={p.id} />}
                <Campo label={p ? "Nombre" : "Nuevo proveedor"} name="nombre" defaultValue={p?.nombre} required />
                <Campo label="Teléfono" name="telefono" type="tel" defaultValue={p?.telefono} />
                <Campo label="Email" name="email" type="email" defaultValue={p?.email} />
                <Campo label="Notas" name="notas" defaultValue={p?.notas} />
                <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-2">
                  <button className="btn btn-chico btn-secundario">{p ? "Guardar" : "Agregar"}</button>
                  {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-chico btn-secundario">WhatsApp</a>}
                  {p && <a href={`/panel/compras?proveedor=${p.id}`} className="btn btn-chico btn-secundario">Ver compras</a>}
                  {p && <span className="text-xs text-suave ml-auto">{(p.productos as unknown as { count: number }[])[0]?.count ?? 0} productos</span>}
                </div>
              </form>
              {p && (
                <form action={eliminarProveedor} className="mt-2">
                  <input type="hidden" name="id" value={p.id} />
                  <button className="text-xs text-peligro hover:underline">Eliminar proveedor</button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
