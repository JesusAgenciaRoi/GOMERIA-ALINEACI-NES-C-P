import { createClient } from "@/lib/supabase/server";
import { Encabezado, Volver } from "@/components/ui";
import { FormCampana } from "../Componentes";

export const metadata = { title: "Nueva campaña | Gomería C&P" };

export default async function NuevaCampanaPage() {
  const supabase = await createClient();
  const [{ data: servicios }, { data: cfg }] = await Promise.all([
    supabase.from("servicios").select("id, nombre").eq("activo", true).order("orden"),
    supabase.from("config_negocio").select("nombre").eq("id", 1).single(),
  ]);
  return (
    <div className="max-w-5xl">
      <Volver href="/panel/campanas">Campañas</Volver>
      <Encabezado titulo="Nueva campaña" />
      <div className="tarjeta p-5">
        <FormCampana servicios={servicios ?? []} negocio={cfg?.nombre ?? "Gomería C&P"} />
      </div>
    </div>
  );
}
