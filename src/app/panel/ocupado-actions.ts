"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requerirStaff } from "@/lib/auth";
import { MOTIVO_OCUPADO } from "@/lib/turnos";

/** Bloquea la agenda desde ahora por X minutos (un cliente que llegó sin turno). */
export async function marcarOcupado(f: FormData) {
  await requerirStaff();
  const minutos = Number(f.get("minutos"));
  if (![15, 30, 45, 60, 90, 120].includes(minutos)) return;
  const supabase = await createClient();
  const ahora = new Date();
  // Si ya hay uno activo, se extiende en vez de duplicar
  const { data: activo } = await supabase
    .from("bloqueos")
    .select("id, fin")
    .is("recurso_id", null)
    .eq("motivo", MOTIVO_OCUPADO)
    .lte("inicio", ahora.toISOString())
    .gt("fin", ahora.toISOString())
    .maybeSingle();
  if (activo) {
    const fin = new Date(new Date(activo.fin).getTime() + minutos * 60000);
    await supabase.from("bloqueos").update({ fin: fin.toISOString() }).eq("id", activo.id);
  } else {
    const fin = new Date(ahora.getTime() + minutos * 60000);
    await supabase.from("bloqueos").insert({ inicio: ahora.toISOString(), fin: fin.toISOString(), motivo: MOTIVO_OCUPADO, recurso_id: null });
  }
  revalidatePath("/panel");
}

export async function liberarOcupado(f: FormData) {
  await requerirStaff();
  const supabase = await createClient();
  const id = String(f.get("id"));
  const { data: b } = await supabase.from("bloqueos").select("inicio").eq("id", id).maybeSingle();
  if (!b) return;
  const ahora = new Date();
  // Si se libera enseguida (menos de un minuto) se borra; si no, se corta en este momento
  if (ahora.getTime() - new Date(b.inicio).getTime() < 60000) await supabase.from("bloqueos").delete().eq("id", id);
  else await supabase.from("bloqueos").update({ fin: ahora.toISOString() }).eq("id", id);
  revalidatePath("/panel");
}
