"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requerirAdmin } from "@/lib/auth";

const txt = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const num = (f: FormData, k: string) => {
  const v = txt(f, k);
  return v == null ? null : Number(v);
};

function volver(seccion: string, error?: string): never {
  revalidatePath("/panel/configuracion");
  revalidatePath("/");
  redirect(`/panel/configuracion?${error ? `error=${encodeURIComponent(error)}` : `ok=${seccion}`}#${seccion}`);
}

export async function guardarNegocio(f: FormData) {
  await requerirAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("config_negocio")
    .update({
      nombre: txt(f, "nombre") ?? "Gomería & Alineaciones C&P",
      telefono: txt(f, "telefono"),
      whatsapp: txt(f, "whatsapp"),
      email: txt(f, "email"),
      direccion: txt(f, "direccion"),
      instagram: txt(f, "instagram"),
      facebook: txt(f, "facebook"),
      personas: Math.min(20, Math.max(1, num(f, "personas") ?? 1)),
      intervalo_min: num(f, "intervalo_min") ?? 30,
      anticipacion_min_horas: num(f, "anticipacion_min_horas") ?? 2,
      dias_max_reserva: num(f, "dias_max_reserva") ?? 30,
    })
    .eq("id", 1);
  volver("negocio", error?.message);
}

export async function guardarServicio(f: FormData) {
  await requerirAdmin();
  const supabase = await createClient();
  const id = txt(f, "id");
  const datos = {
    nombre: txt(f, "nombre") ?? "",
    descripcion: txt(f, "descripcion"),
    duracion_min: num(f, "duracion_min") ?? 30,
    precio: num(f, "precio"),
    tipo_recurso: txt(f, "tipo_recurso") ?? "elevador",
    reservable_web: f.get("reservable_web") === "on",
    activo: f.get("activo") === "on",
    orden: num(f, "orden") ?? 0,
  };
  if (!datos.nombre) volver("servicios", "El servicio necesita un nombre.");
  const { error } = id
    ? await supabase.from("servicios").update(datos).eq("id", id)
    : await supabase.from("servicios").insert(datos);
  volver("servicios", error?.message);
}

export async function agregarHorario(f: FormData) {
  await requerirAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("horarios").insert({
    dia_semana: num(f, "dia_semana") ?? 1,
    apertura: txt(f, "apertura") ?? "08:00",
    cierre: txt(f, "cierre") ?? "18:00",
  });
  volver("horarios", error ? "Revisá que el cierre sea posterior a la apertura." : undefined);
}

export async function borrarHorario(f: FormData) {
  await requerirAdmin();
  const supabase = await createClient();
  await supabase.from("horarios").delete().eq("id", String(f.get("id")));
  volver("horarios");
}

export async function guardarRecurso(f: FormData) {
  await requerirAdmin();
  const supabase = await createClient();
  const id = txt(f, "id");
  const datos = { nombre: txt(f, "nombre") ?? "", tipo: (txt(f, "tipo") ?? "elevador").toLowerCase(), activo: f.get("activo") === "on" };
  if (!datos.nombre) volver("recursos", "El recurso necesita un nombre.");
  const { error } = id ? await supabase.from("recursos").update(datos).eq("id", id) : await supabase.from("recursos").insert(datos);
  volver("recursos", error?.message);
}

export async function agregarBloqueo(f: FormData) {
  await requerirAdmin();
  const { localAISO } = await import("@/lib/fechas");
  const desde = txt(f, "desde");
  const hasta = txt(f, "hasta");
  if (!desde || !hasta) volver("bloqueos", "Completá las fechas.");
  const supabase = await createClient();
  const { error } = await supabase.from("bloqueos").insert({
    inicio: localAISO(desde!, txt(f, "hora_desde") ?? "00:00"),
    fin: localAISO(hasta!, txt(f, "hora_hasta") ?? "23:59"),
    motivo: txt(f, "motivo"),
    recurso_id: txt(f, "recurso_id"),
  });
  volver("bloqueos", error ? "Revisá que el fin sea posterior al inicio." : undefined);
}

export async function borrarBloqueo(f: FormData) {
  await requerirAdmin();
  const supabase = await createClient();
  await supabase.from("bloqueos").delete().eq("id", String(f.get("id")));
  volver("bloqueos");
}
