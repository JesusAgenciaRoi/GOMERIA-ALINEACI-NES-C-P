import { createClient } from "@/lib/supabase/server";
import { Encabezado, Volver } from "@/components/ui";
import { fechaLocal } from "@/lib/fechas";
import FormCompra from "../FormCompra";

export default async function NuevaCompra({ searchParams }: { searchParams: Promise<{ producto?: string }> }) {
  const { producto } = await searchParams;
  const supabase = await createClient();
  const [{ data: productos }, { data: proveedores }] = await Promise.all([
    supabase.from("productos").select("id, nombre, medida, marca, stock, precio_costo, precio_venta").eq("activo", true).order("nombre").limit(2000),
    supabase.from("proveedores").select("id, nombre").order("nombre"),
  ]);

  return (
    <div className="max-w-6xl">
      <Volver href="/panel/compras">Compras</Volver>
      <Encabezado
        titulo="Registrar compra"
        subtitulo="Cargá todo lo que vino en la factura: lo del inventario suma stock, lo nuevo se crea y el pago se registra en caja."
      />
      <FormCompra productos={productos ?? []} proveedores={proveedores ?? []} hoy={fechaLocal()} productoInicial={producto} />
    </div>
  );
}
