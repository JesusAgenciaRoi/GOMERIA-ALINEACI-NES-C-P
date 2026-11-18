import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DIAS } from "@/lib/fechas";
import EditorCarga from "./EditorCarga";

export const metadata = { title: "Editor | Contenidos C&P" };

const FOTOS_LOCAL = [
  "/fotos/frente-cartel.webp",
  "/fotos/interior-elevador.webp",
  "/fotos/interior-cubiertas.webp",
  "/fotos/frente-ancho.webp",
  "/fotos/interior-goodyear.webp",
  "/fotos/folleto-alineacion-3d.webp",
  "/fotos/folleto-servicios.webp",
];

export default async function EditorPage({ searchParams }: { searchParams: Promise<{ id?: string; copia?: string }> }) {
  const { id, copia } = await searchParams;
  const supabase = await createClient();

  const idCargar = id ?? copia;
  const [{ data: diseno }, { data: cfg }, { data: horarios }, { data: archivos }] = await Promise.all([
    idCargar ? supabase.from("disenos").select("*").eq("id", idCargar).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("config_negocio").select("nombre, telefono, whatsapp, direccion").eq("id", 1).single(),
    supabase.from("horarios").select("dia_semana, apertura, cierre").order("dia_semana").order("apertura"),
    supabase.storage.from("contenidos").list("fotos", { limit: 200, sortBy: { column: "created_at", order: "desc" } }),
  ]);
  if (idCargar && !diseno) notFound();

  const telefonos = Array.from(
    new Set([cfg?.whatsapp, ...(cfg?.telefono ?? "").split(/[\/,;]/)].map((t) => (t ?? "").trim()).filter(Boolean)),
  );
  const porDia = [1, 2, 3, 4, 5, 6, 0]
    .map((d) => ({ dia: DIAS[d], franjas: (horarios ?? []).filter((h) => h.dia_semana === d).map((h) => `${h.apertura.slice(0, 5)} a ${h.cierre.slice(0, 5)}`).join(" y ") }))
    .filter((d) => d.franjas);
  const fotosSubidas = (archivos ?? [])
    .filter((a) => a.name && !a.name.startsWith("."))
    .map((a) => supabase.storage.from("contenidos").getPublicUrl(`fotos/${a.name}`).data.publicUrl);

  const inicial = diseno
    ? copia
      ? { ...diseno, id: null, titulo: `${diseno.titulo} (copia)`, estado: "borrador", fecha_publicacion: null }
      : diseno
    : null;

  return (
    <EditorCarga
      diseno={inicial}
      negocio={{
        nombre: cfg?.nombre ?? "Gomería & Alineaciones C&P",
        telefonos,
        direccion: cfg?.direccion ?? null,
        horarios: porDia,
        fotos: FOTOS_LOCAL.slice(0, 5),
      }}
      fotosLocal={FOTOS_LOCAL}
      fotosSubidas={fotosSubidas}
    />
  );
}
