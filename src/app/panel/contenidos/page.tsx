import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Encabezado, Vacio } from "@/components/ui";
import { DIAS, diaSemana, fechaCorta, fechaLocal, localAISO, sumarDias } from "@/lib/fechas";
import { cambiarEstadoDiseno, eliminarDiseno } from "./actions";

const ESTADOS: Record<string, { label: string; clase: string }> = {
  borrador: { label: "Borrador", clase: "bg-zinc-100 text-zinc-700 border-zinc-300" },
  listo: { label: "Listo", clase: "bg-sky-100 text-sky-900 border-sky-300" },
  programado: { label: "Programado", clase: "bg-amber-100 text-amber-900 border-amber-300" },
  publicado: { label: "Publicado", clase: "bg-emerald-100 text-emerald-900 border-emerald-300" },
};
const FORMATO: Record<string, string> = { post: "Post 1:1", vertical: "Post 4:5", historia: "Historia", afiche: "Afiche" };

export default async function ContenidosPage({ searchParams }: { searchParams: Promise<{ vista?: string; estado?: string; mes?: string }> }) {
  const { vista = "galeria", estado, mes } = await searchParams;
  const supabase = await createClient();
  let consulta = supabase
    .from("disenos")
    .select("id, titulo, formato, ancho, alto, estado, fecha_publicacion, redes, preview_path, updated_at")
    .order("updated_at", { ascending: false })
    .limit(300);
  if (estado && estado in ESTADOS) consulta = consulta.eq("estado", estado);
  const { data: disenos } = await consulta;
  const url = (ruta: string | null, version: string) =>
    ruta ? `${supabase.storage.from("contenidos").getPublicUrl(ruta).data.publicUrl}?v=${encodeURIComponent(version)}` : null;

  // Calendario
  const hoy = fechaLocal();
  const mesActual = /^\d{4}-\d{2}$/.test(mes ?? "") ? mes! : hoy.slice(0, 7);
  const primero = `${mesActual}-01`;
  const desplazamiento = (diaSemana(primero) + 6) % 7; // semana empieza lunes
  const inicioGrilla = sumarDias(primero, -desplazamiento);
  const dias = Array.from({ length: 42 }, (_, i) => sumarDias(inicioGrilla, i));
  const [y, m] = mesActual.split("-").map(Number);
  const mesPrev = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;
  const mesSig = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}`;
  const mesTexto = new Intl.DateTimeFormat("es-UY", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 15)));
  const nombreMes = mesTexto.charAt(0).toUpperCase() + mesTexto.slice(1);
  const sinFecha = (disenos ?? []).filter((d) => !d.fecha_publicacion && d.estado !== "publicado");

  return (
    <div className="max-w-7xl">
      <Encabezado titulo="Contenidos" subtitulo="Diseños para redes y su calendario de publicación">
        <Link href="/panel/contenidos/editor" className="btn btn-primario">+ Nuevo diseño</Link>
      </Encabezado>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex p-1 bg-superficie border border-borde rounded-lg">
          {[["galeria", "Galería"], ["calendario", "Calendario"]].map(([k, l]) => (
            <Link key={k} href={`/panel/contenidos?vista=${k}`} className={`px-3 py-1.5 rounded-md text-sm font-semibold ${vista === k ? "bg-asfalto text-white" : "text-suave"}`}>{l}</Link>
          ))}
        </div>
        {vista === "galeria" && (
          <div className="flex flex-wrap gap-1.5">
            <Link href="/panel/contenidos" className={`px-3 py-1 rounded-full text-sm border ${!estado ? "bg-asfalto text-white border-asfalto" : "border-borde bg-superficie"}`}>Todos</Link>
            {Object.entries(ESTADOS).map(([k, e]) => (
              <Link key={k} href={`/panel/contenidos?estado=${k}`} className={`px-3 py-1 rounded-full text-sm border ${estado === k ? "bg-asfalto text-white border-asfalto" : "border-borde bg-superficie"}`}>{e.label}</Link>
            ))}
          </div>
        )}
      </div>

      {vista === "galeria" ? (
        disenos && disenos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {disenos.map((d) => {
              const prev = url(d.preview_path, d.updated_at);
              const e = ESTADOS[d.estado] ?? ESTADOS.borrador;
              return (
                <div key={d.id} className="tarjeta overflow-hidden flex flex-col">
                  <Link href={`/panel/contenidos/editor?id=${d.id}`} className="block bg-asfalto" style={{ aspectRatio: `${d.ancho} / ${d.alto}` }}>
                    {prev ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={prev} alt={d.titulo} className="w-full h-full object-contain" loading="lazy" />
                    ) : (
                      <span className="grid place-items-center h-full text-zinc-500 text-sm">Sin vista previa</span>
                    )}
                  </Link>
                  <div className="p-3 flex-1 flex flex-col gap-1.5">
                    <Link href={`/panel/contenidos/editor?id=${d.id}`} className="font-semibold leading-tight hover:underline">{d.titulo}</Link>
                    <div className="text-xs text-suave">
                      {FORMATO[d.formato] ?? d.formato}
                      {d.fecha_publicacion ? ` · ${fechaCorta(localAISO(d.fecha_publicacion, "12:00"))}` : ""}
                      {d.redes.length ? ` · ${d.redes.join(", ")}` : ""}
                    </div>
                    <form action={cambiarEstadoDiseno} className="flex gap-1 mt-auto pt-1">
                      <input type="hidden" name="id" value={d.id} />
                      <select name="estado" defaultValue={d.estado} className={`text-xs font-semibold rounded-full border px-2 py-1 ${e.clase}`} aria-label="Estado">
                        {Object.entries(ESTADOS).map(([k, x]) => <option key={k} value={k}>{x.label}</option>)}
                      </select>
                      <button className="text-xs underline">Guardar</button>
                    </form>
                    <div className="flex gap-3 text-xs pt-1 border-t border-borde">
                      <Link href={`/panel/contenidos/editor?copia=${d.id}`} className="underline">Duplicar</Link>
                      {prev && <a href={prev} target="_blank" rel="noopener noreferrer" className="underline">Ver</a>}
                      <form action={eliminarDiseno} className="ml-auto">
                        <input type="hidden" name="id" value={d.id} />
                        <button className="text-peligro hover:underline">Borrar</button>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Vacio>
            Todavía no hay diseños. <Link href="/panel/contenidos/editor" className="underline">Creá el primero</Link> a partir de una plantilla.
          </Vacio>
        )
      ) : (
        <div className="grid lg:grid-cols-[1fr_260px] gap-6">
          <section className="tarjeta p-4 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <Link href={`/panel/contenidos?vista=calendario&mes=${mesPrev}`} className="btn btn-chico btn-secundario" aria-label="Mes anterior">&larr;</Link>
              <h2 className="titulo text-xl">{nombreMes}</h2>
              <Link href={`/panel/contenidos?vista=calendario&mes=${mesSig}`} className="btn btn-chico btn-secundario" aria-label="Mes siguiente">&rarr;</Link>
            </div>
            <div className="grid grid-cols-7 text-xs text-suave font-semibold mb-1">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => <div key={d} className="px-1">{DIAS[d].slice(0, 3)}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {dias.map((dia) => {
                const delDia = (disenos ?? []).filter((d) => d.fecha_publicacion === dia);
                const otroMes = !dia.startsWith(mesActual);
                return (
                  <div key={dia} className={`min-h-24 rounded-md border p-1 ${dia === hoy ? "border-senal ring-1 ring-senal" : "border-borde"} ${otroMes ? "opacity-40" : ""}`}>
                    <div className="text-xs font-semibold mb-1">{Number(dia.slice(8))}</div>
                    <div className="space-y-1">
                      {delDia.map((d) => {
                        const prev = url(d.preview_path, d.updated_at);
                        return (
                          <Link key={d.id} href={`/panel/contenidos/editor?id=${d.id}`} className={`flex items-center gap-1 rounded border px-1 py-0.5 text-[0.65rem] leading-tight ${ESTADOS[d.estado]?.clase}`} title={d.titulo}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {prev && <img src={prev} alt="" className="w-5 h-5 object-cover rounded-sm shrink-0" />}
                            <span className="truncate">{d.titulo}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <aside className="tarjeta p-4 h-fit">
            <h2 className="titulo text-lg mb-2">Sin fecha</h2>
            <p className="text-xs text-suave mb-3">Abrí un diseño y poné la fecha de publicación para verlo en el calendario.</p>
            <ul className="space-y-1.5 text-sm">
              {sinFecha.map((d) => (
                <li key={d.id}><Link href={`/panel/contenidos/editor?id=${d.id}`} className="hover:underline">{d.titulo}</Link></li>
              ))}
              {sinFecha.length === 0 && <li className="text-suave">Nada pendiente.</li>}
            </ul>
          </aside>
        </div>
      )}
    </div>
  );
}
