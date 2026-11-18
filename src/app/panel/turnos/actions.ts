"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requerirAdmin, requerirStaff } from "@/lib/auth";
import { localAISO, fechaLocal } from "@/lib/fechas";
import { ESTADOS, mensajeError } from "@/lib/turnos";

export type Resultado = { error?: string; ok?: string } | undefined;

const txt = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};

type DatosTurno = {
  servicio_id: string;
  vehiculo_id: string | null;
  recurso_id: string;
  inicio: string;
  fin: string;
  precio: number | null;
  notas: string | null;
};

async function armarDatos(f: FormData, excluirTurno?: string): Promise<{ error: string } | { datos: DatosTurno }> {
  const supabase = await createClient();
  const servicioId = txt(f, "servicio_id");
  const fecha = txt(f, "fecha");
  const horaLocal = txt(f, "hora");
  if (!servicioId || !fecha || !horaLocal) return { error: "Completá servicio, fecha y hora." };

  const { data: servicio } = await supabase.from("servicios").select("*").eq("id", servicioId).single();
  if (!servicio) return { error: "Servicio inválido." };

  const duracion = Number(txt(f, "duracion") ?? servicio.duracion_min);
  if (!Number.isFinite(duracion) || duracion < 5 || duracion > 600) return { error: "Duración inválida." };

  const inicio = localAISO(fecha, horaLocal);
  const fin = new Date(new Date(inicio).getTime() + duracion * 60000).toISOString();

  const { data: hayPersona } = await supabase.rpc("capacidad_libre", {
    p_inicio: inicio,
    p_fin: fin,
    ...(excluirTurno ? { p_excluir_turno: excluirTurno } : {}),
  });
  if (hayPersona === false) return { error: "Ya hay otro trabajo agendado en ese horario y hay una sola persona trabajando. Elegí otro horario." };

  let recursoId = txt(f, "recurso_id");
  if (!recursoId) {
    const { data: libre } = await supabase.rpc("recurso_libre", {
      p_tipo: servicio.tipo_recurso,
      p_inicio: inicio,
      p_fin: fin,
      ...(excluirTurno ? { p_excluir_turno: excluirTurno } : {}),
    });
    if (!libre) return { error: `No hay ${servicio.tipo_recurso} libre en ese horario. Elegí otro horario o un recurso a mano.` };
    recursoId = libre;
  }

  const precio = txt(f, "precio");
  return {
    datos: {
      servicio_id: servicioId,
      vehiculo_id: txt(f, "vehiculo_id"),
      recurso_id: recursoId,
      inicio,
      fin,
      precio: precio != null ? Number(precio) : servicio.precio,
      notas: txt(f, "notas"),
    },
  };
}

export async function crearTurno(_p: Resultado, f: FormData): Promise<Resultado> {
  const perfil = await requerirStaff();
  const clienteId = txt(f, "cliente_id");
  if (!clienteId) return { error: "Elegí un cliente." };
  const r = await armarDatos(f);
  if ("error" in r) return { error: r.error };

  const supabase = await createClient();
  const origen = txt(f, "origen") ?? "local";
  const { error } = await supabase
    .from("turnos")
    .insert({ ...r.datos, cliente_id: clienteId, origen, estado: "confirmado", creado_por: perfil.id });
  if (error) return { error: mensajeError(error.message) };

  revalidatePath("/panel/agenda");
  revalidatePath("/panel");
  redirect(`/panel/agenda?fecha=${fechaLocal(r.datos.inicio)}`);
}

export async function actualizarTurno(_p: Resultado, f: FormData): Promise<Resultado> {
  await requerirStaff();
  const id = String(f.get("id"));
  const r = await armarDatos(f, id);
  if ("error" in r) return { error: r.error };
  const supabase = await createClient();
  const { error } = await supabase.from("turnos").update(r.datos).eq("id", id);
  if (error) return { error: mensajeError(error.message) };
  revalidatePath(`/panel/turnos/${id}`);
  revalidatePath("/panel/agenda");
  return { ok: "Turno actualizado." };
}

export async function cambiarEstado(f: FormData) {
  await requerirStaff();
  const id = String(f.get("id"));
  const estado = String(f.get("estado"));
  if (!(estado in ESTADOS)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("turnos").update({ estado }).eq("id", id);
  if (error) redirect(`/panel/turnos/${id}?error=${encodeURIComponent(mensajeError(error.message))}`);
  revalidatePath(`/panel/turnos/${id}`);
  revalidatePath("/panel/agenda");
  revalidatePath("/panel");
}

export async function eliminarTurno(f: FormData) {
  await requerirAdmin();
  const id = String(f.get("id"));
  const supabase = await createClient();
  await supabase.from("turnos").delete().eq("id", id);
  revalidatePath("/panel/agenda");
  redirect("/panel/agenda");
}
