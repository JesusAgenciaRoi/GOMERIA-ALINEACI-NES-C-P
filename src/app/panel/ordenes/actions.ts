"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requerirStaff } from "@/lib/auth";
import { errorNegocio, MEDIOS_PAGO } from "@/lib/negocio";

export type Resultado = { error?: string; ok?: string } | undefined;

const txt = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const nro = (f: FormData, k: string) => {
  const v = txt(f, k);
  if (v == null) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

function refrescar(id: string) {
  revalidatePath(`/panel/ordenes/${id}`);
  revalidatePath("/panel/ordenes");
}

export async function crearOrden(f: FormData) {
  const perfil = await requerirStaff();
  const supabase = await createClient();
  const turnoId = txt(f, "turno_id");
  let clienteId = txt(f, "cliente_id");
  let vehiculoId = txt(f, "vehiculo_id");
  let itemTurno: { servicio_id: string; descripcion: string; precio_unitario: number } | null = null;

  if (turnoId) {
    const { data: existente } = await supabase.from("ordenes").select("id").eq("turno_id", turnoId).maybeSingle();
    if (existente) redirect(`/panel/ordenes/${existente.id}`);
    const { data: t } = await supabase.from("turnos").select("cliente_id, vehiculo_id, servicio_id, precio, servicios(nombre, precio)").eq("id", turnoId).single();
    if (!t) redirect("/panel/ordenes");
    clienteId = t.cliente_id;
    vehiculoId = t.vehiculo_id;
    itemTurno = { servicio_id: t.servicio_id, descripcion: t.servicios?.nombre ?? "Servicio", precio_unitario: t.precio ?? t.servicios?.precio ?? 0 };
  }
  if (!clienteId) redirect("/panel/ordenes/nueva");

  const { data: orden, error } = await supabase
    .from("ordenes")
    .insert({ cliente_id: clienteId, vehiculo_id: vehiculoId, turno_id: turnoId, creado_por: perfil.id })
    .select("id")
    .single();
  if (error) redirect(`/panel/ordenes?error=${encodeURIComponent(errorNegocio(error.message))}`);

  if (itemTurno) await supabase.from("orden_items").insert({ orden_id: orden.id, tipo: "servicio", cantidad: 1, ...itemTurno });
  revalidatePath("/panel/ordenes");
  redirect(`/panel/ordenes/${orden.id}`);
}

export async function agregarItem(_p: Resultado, f: FormData): Promise<Resultado> {
  await requerirStaff();
  const ordenId = String(f.get("orden_id"));
  const tipo = txt(f, "tipo") ?? "otro";
  const descripcion = txt(f, "descripcion");
  const cantidad = nro(f, "cantidad") ?? 1;
  const precio = tipo === "insumo" ? 0 : nro(f, "precio_unitario") ?? 0;
  if (!descripcion) return { error: "Elegí o escribí qué se agrega." };
  if (cantidad <= 0) return { error: "La cantidad tiene que ser mayor a 0." };
  if (precio < 0) return { error: "El precio no puede ser negativo." };

  const supabase = await createClient();
  const { error } = await supabase.from("orden_items").insert({
    orden_id: ordenId,
    tipo,
    servicio_id: tipo === "servicio" ? txt(f, "servicio_id") : null,
    producto_id: tipo === "producto" || tipo === "insumo" ? txt(f, "producto_id") : null,
    descripcion,
    cantidad,
    precio_unitario: precio,
  });
  if (error) return { error: errorNegocio(error.message) };
  refrescar(ordenId);
  return { ok: "Agregado." };
}

export async function quitarItem(f: FormData) {
  await requerirStaff();
  const ordenId = String(f.get("orden_id"));
  const supabase = await createClient();
  const { error } = await supabase.from("orden_items").delete().eq("id", String(f.get("id")));
  if (error) redirect(`/panel/ordenes/${ordenId}?error=${encodeURIComponent(errorNegocio(error.message))}`);
  refrescar(ordenId);
}

export async function actualizarOrden(_p: Resultado, f: FormData): Promise<Resultado> {
  await requerirStaff();
  const id = String(f.get("id"));
  const supabase = await createClient();
  const km = nro(f, "km");
  const { error } = await supabase
    .from("ordenes")
    .update({
      km: km != null ? Math.round(km) : null,
      notas: txt(f, "notas"),
      factura: txt(f, "factura"),
      vehiculo_id: txt(f, "vehiculo_id"),
      descuento: nro(f, "descuento") ?? 0,
    })
    .eq("id", id);
  if (error) return { error: errorNegocio(error.message) };
  refrescar(id);
  return { ok: "Guardado." };
}

export async function cambiarEstadoOrden(f: FormData) {
  await requerirStaff();
  const id = String(f.get("id"));
  const estado = String(f.get("estado"));
  if (!["abierta", "en_proceso", "terminada"].includes(estado)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("ordenes").update({ estado }).eq("id", id);
  if (error) redirect(`/panel/ordenes/${id}?error=${encodeURIComponent(errorNegocio(error.message))}`);
  refrescar(id);
}

export async function cobrar(_p: Resultado, f: FormData): Promise<Resultado> {
  await requerirStaff();
  const id = String(f.get("id"));
  const medios = f.getAll("medio").map(String);
  const montos = f.getAll("monto").map((m) => Number(String(m).replace(",", ".")));
  const pagos = medios
    .map((medio, i) => ({ medio, monto: Math.round((montos[i] || 0) * 100) / 100 }))
    .filter((p) => p.monto > 0 && p.medio in MEDIOS_PAGO);

  const supabase = await createClient();
  const { error } = await supabase.rpc("cobrar_orden", { p_orden: id, p_pagos: pagos, p_factura: txt(f, "factura") ?? undefined });
  if (error) return { error: errorNegocio(error.message) };
  refrescar(id);
  revalidatePath("/panel/caja");
  revalidatePath("/panel/inventario");
  revalidatePath("/panel");
  return { ok: "Orden cobrada." };
}

export async function anular(f: FormData) {
  await requerirStaff();
  const id = String(f.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("anular_orden", { p_orden: id, p_motivo: txt(f, "motivo") ?? undefined });
  if (error) redirect(`/panel/ordenes/${id}?error=${encodeURIComponent(errorNegocio(error.message))}`);
  refrescar(id);
  revalidatePath("/panel/caja");
  revalidatePath("/panel/inventario");
}
