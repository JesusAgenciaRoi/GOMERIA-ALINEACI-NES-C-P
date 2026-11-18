import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Encabezado, Vacio } from "@/components/ui";
import { TIPOS_CAMPANA } from "@/lib/campanas";

export const metadata = { title: "Campañas | Gomería C&P" };

export default async function CampanasPage() {
  const supabase = await createClient();
  const [{ data: campanas }, { data: servicios }] = await Promise.all([
    supabase.from("campanas").select("*").order("activa", { ascending: false }).order("created_at"),
    supabase.from("servicios").select("id, nombre"),
  ]);
  const nombreServ = new Map((servicios ?? []).map((s) => [s.id, s.nombre]));

  const conteos = await Promise.all(
    (campanas ?? []).map(async (c) => {
      if (!c.activa) return { pendientes: 0, total: 0 };
      const { data } = await supabase.rpc("campana_destinatarios", { p_campana: c.id });
      const lista = data ?? [];
      return { pendientes: lista.filter((d) => !d.ya_enviado).length, total: lista.length };
    }),
  );

  return (
    <div className="max-w-5xl">
      <Encabezado titulo="Campañas" subtitulo="Mensajes de WhatsApp a tus clientes: recordatorios, clientes que no vuelven y avisos">
        <Link href="/panel/campanas/nueva" className="btn btn-primario">+ Nueva campaña</Link>
      </Encabezado>

      {campanas && campanas.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {campanas.map((c, i) => {
            const n = conteos[i];
            const servs = c.servicio_ids.map((sid) => nombreServ.get(sid)).filter(Boolean).join(", ");
            return (
              <Link key={c.id} href={`/panel/campanas/${c.id}`} className={`tarjeta p-4 flex gap-4 hover:border-asfalto ${c.activa ? "" : "opacity-60"}`}>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold uppercase tracking-wide text-suave">{TIPOS_CAMPANA[c.tipo]?.label}</div>
                  <h2 className="font-semibold text-lg leading-tight">{c.nombre}</h2>
                  <p className="text-sm text-suave mt-1">
                    {c.tipo === "recordatorio" && <>{servs || "Cualquier servicio"} &middot; hace {c.meses}+ meses</>}
                    {c.tipo === "inactivos" && <>Sin venir hace {c.meses}+ meses</>}
                    {c.tipo === "libre" && <>Todos los clientes</>}
                    {!c.activa && <> &middot; Pausada</>}
                  </p>
                </div>
                {c.activa && (
                  <div className="text-right shrink-0">
                    <div className={`titulo text-3xl leading-none ${n.pendientes ? "text-asfalto" : "text-suave"}`}>{n.pendientes}</div>
                    <div className="text-xs text-suave">por enviar</div>
                    <div className="text-xs text-suave">{n.total - n.pendientes} enviados</div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <Vacio>
          Todavía no hay campañas. <Link href="/panel/campanas/nueva" className="underline">Creá la primera</Link>.
        </Vacio>
      )}

      <p className="text-sm text-suave mt-6 max-w-3xl">
        Cómo funciona: cada campaña arma sola la lista de clientes con lo que se registró en turnos completados y órdenes terminadas.
        Al tocar <b>Enviar por WhatsApp</b> se abre el chat con el mensaje listo y el cliente queda marcado como enviado, para no repetirlo
        hasta su próxima visita. Los clientes que no quieren promociones se excluyen desde su ficha.
      </p>
    </div>
  );
}
