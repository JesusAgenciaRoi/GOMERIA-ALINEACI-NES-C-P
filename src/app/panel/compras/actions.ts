"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requerirAdmin, requerirStaff } from "@/lib/auth";
import { errorNegocio } from "@/lib/negocio";
import type { Json } from "@/lib/database.types";

export type Resultado = { error?: string } | undefined;

export async function guardarCompra(_p: Resultado, f: FormData): Promise<Resultado> {
  await requerirStaff();
  let datos: Json;
  try {
    datos = JSON.parse(String(f.get("datos") ?? "{}"));
  } catch {
    return { error: "Datos inválidos." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("registrar_compra", { p_datos: datos });
  if (error) return { error: errorNegocio(error.message) };
  const res = data as { id: string };
  revalidatePath("/panel/compras");
  revalidatePath("/panel/inventario");
  revalidatePath("/panel/caja");
  revalidatePath("/panel");
  redirect(`/panel/compras/${res.id}?ok=1`);
}

export async function anularCompra(f: FormData) {
  await requerirAdmin();
  const id = String(f.get("id"));
  const motivo = String(f.get("motivo") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.rpc("anular_compra", { p_compra: id, p_motivo: motivo || undefined });
  if (error) redirect(`/panel/compras/${id}?error=${encodeURIComponent(errorNegocio(error.message))}`);
  revalidatePath(`/panel/compras/${id}`);
  revalidatePath("/panel/compras");
  revalidatePath("/panel/inventario");
  revalidatePath("/panel/caja");
}
