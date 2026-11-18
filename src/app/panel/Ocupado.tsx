import { createClient } from "@/lib/supabase/server";
import { hora } from "@/lib/fechas";
import { MOTIVO_OCUPADO } from "@/lib/turnos";
import { liberarOcupado, marcarOcupado } from "./ocupado-actions";

/** Tarjeta del inicio: avisar que se está atendiendo a alguien sin turno. */
export default async function Ocupado() {
  const supabase = await createClient();
  const ahora = new Date().toISOString();
  const { data: activo } = await supabase
    .from("bloqueos")
    .select("id, fin")
    .is("recurso_id", null)
    .eq("motivo", MOTIVO_OCUPADO)
    .lte("inicio", ahora)
    .gt("fin", ahora)
    .order("fin", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <section className={`tarjeta p-4 mb-8 flex flex-wrap items-center gap-3 ${activo ? "border-amber-400 bg-amber-50" : ""}`}>
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold">{activo ? `Ocupado hasta las ${hora(activo.fin)}` : "¿Llegó alguien sin turno?"}</h2>
        <p className="text-sm text-suave">
          {activo
            ? "La web y el agente no ofrecen turnos hasta esa hora. Podés sumar tiempo o liberar antes."
            : "Marcá el tiempo que vas a estar ocupado y la web (y el agente) no ofrecen turnos en ese rato."}
        </p>
      </div>
      <form action={marcarOcupado} className="flex flex-wrap gap-1.5">
        {[15, 30, 60, 90].map((m) => (
          <button key={m} name="minutos" value={m} className="btn btn-chico btn-secundario">
            {activo ? "+" : ""}{m < 60 ? `${m} min` : `${m / 60} h`.replace(".5", ",5")}
          </button>
        ))}
      </form>
      {activo && (
        <form action={liberarOcupado}>
          <input type="hidden" name="id" value={activo.id} />
          <button className="btn btn-chico btn-oscuro">Ya me liberé</button>
        </form>
      )}
    </section>
  );
}
