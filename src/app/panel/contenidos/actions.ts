"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requerirStaff } from "@/lib/auth";

export async function cambiarEstadoDiseno(f: FormData) {
  await requerirStaff();
  const estado = String(f.get("estado"));
  if (!["borrador", "listo", "programado", "publicado"].includes(estado)) return;
  const supabase = await createClient();
  await supabase.from("disenos").update({ estado }).eq("id", String(f.get("id")));
  revalidatePath("/panel/contenidos");
}

export async function eliminarDiseno(f: FormData) {
  await requerirStaff();
  const id = String(f.get("id"));
  const supabase = await createClient();
  const { data } = await supabase.from("disenos").select("preview_path").eq("id", id).single();
  await supabase.from("disenos").delete().eq("id", id);
  if (data?.preview_path) await supabase.storage.from("contenidos").remove([data.preview_path]);
  revalidatePath("/panel/contenidos");
}
