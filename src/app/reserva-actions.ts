"use server";

import { createClient } from "@/lib/supabase/server";
import { mensajeError } from "@/lib/turnos";

/** Horarios libres (ISO) para un servicio en una fecha local YYYY-MM-DD. */
export async function obtenerHorarios(servicioId: string, fecha: string): Promise<string[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^[0-9a-f-]{36}$/i.test(servicioId)) return [];
  const supabase = await createClient();
  const { data } = await supabase.rpc("disponibilidad", { p_servicio_id: servicioId, p_fecha: fecha });
  return (data ?? []).map((d) => d.hora);
}

export type TurnoReservado = { id: string; inicio: string; fin: string; servicio: string; precio: number | null; estado: string };

export type ResultadoReserva = { ok: true; turno: TurnoReservado } | { ok: false; error: string };

export async function reservar(datos: {
  servicioId: string;
  inicio: string;
  nombre: string;
  telefono: string;
  email?: string;
  patente?: string;
  marca?: string;
  modelo?: string;
  notas?: string;
}): Promise<ResultadoReserva> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reservar_turno", {
    p_servicio_id: datos.servicioId,
    p_inicio: datos.inicio,
    p_nombre: datos.nombre,
    p_telefono: datos.telefono,
    p_email: datos.email || undefined,
    p_patente: datos.patente || undefined,
    p_marca: datos.marca || undefined,
    p_modelo: datos.modelo || undefined,
    p_notas: datos.notas || undefined,
    p_origen: "web",
  });
  if (error) return { ok: false, error: mensajeError(error.message) };
  return { ok: true, turno: data as TurnoReservado };
}
