"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requerirStaff } from "@/lib/auth";
import { TIPOS_CAMPANA } from "@/lib/campanas";

export type Resultado = { error?: string; ok?: string } | undefined;

export async function guardarCampana(_p: Resultado, f: FormData): Promise<Resultado> {
  await requerirStaff();
  const id = String(f.get("id") ?? "") || null;
  const nombre = String(f.get("nombre") ?? "").trim();
  const tipo = String(f.get("tipo") ?? "");
  const mensaje = String(f.get("mensaje") ?? "").trim();
  const meses = Number(f.get("meses") ?? 6);
  const servicio_ids = tipo === "recordatorio" ? f.getAll("servicio_ids").map(String).filter(Boolean) : [];

  if (nombre.length < 2) return { error: "Poné un nombre a la campaña." };
  if (!(tipo in TIPOS_CAMPANA)) return { error: "Elegí el tipo de campaña." };
  if (mensaje.length < 5) return { error: "Escribí el mensaje." };
  if (tipo !== "libre" && (!Number.isInteger(meses) || meses < 0 || meses > 60)) return { error: "Los meses tienen que estar entre 0 y 60." };

  const datos = { nombre, tipo, mensaje, meses: tipo === "libre" ? 0 : meses, servicio_ids };
  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("campanas").update(datos).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath(`/panel/campanas/${id}`);
    revalidatePath("/panel/campanas");
    return { ok: "Guardado." };
  }
  const { data, error } = await supabase.from("campanas").insert(datos).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/panel/campanas");
  redirect(`/panel/campanas/${data.id}`);
}

export async function alternarCampana(f: FormData) {
  await requerirStaff();
  const id = String(f.get("id"));
  const supabase = await createClient();
  await supabase.from("campanas").update({ activa: f.get("activa") === "true" }).eq("id", id);
  revalidatePath("/panel/campanas");
  revalidatePath(`/panel/campanas/${id}`);
}

export async function eliminarCampana(f: FormData) {
  await requerirStaff();
  const supabase = await createClient();
  await supabase.from("campanas").delete().eq("id", String(f.get("id")));
  revalidatePath("/panel/campanas");
  redirect("/panel/campanas");
}

/** Se llama al tocar "Enviar por WhatsApp": deja registro para no repetir el mensaje. */
export async function registrarEnvio(campanaId: string, clienteId: string): Promise<{ error?: string }> {
  await requerirStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("campana_envios").insert({ campana_id: campanaId, cliente_id: clienteId });
  if (error) return { error: error.message };
  revalidatePath(`/panel/campanas/${campanaId}`);
  revalidatePath("/panel/campanas");
  return {};
}

export async function deshacerEnvio(campanaId: string, clienteId: string): Promise<{ error?: string }> {
  await requerirStaff();
  const supabase = await createClient();
  const { data } = await supabase
    .from("campana_envios")
    .select("id")
    .eq("campana_id", campanaId)
    .eq("cliente_id", clienteId)
    .order("enviado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data) await supabase.from("campana_envios").delete().eq("id", data.id);
  revalidatePath(`/panel/campanas/${campanaId}`);
  revalidatePath("/panel/campanas");
  return {};
}
