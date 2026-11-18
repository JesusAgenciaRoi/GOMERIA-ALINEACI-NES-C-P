"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requerirAdmin } from "@/lib/auth";
import { CATEGORIAS_CAJA, MEDIOS_PAGO } from "@/lib/negocio";

export type Resultado = { error?: string; ok?: string } | undefined;

export async function registrarMovimiento(_p: Resultado, f: FormData): Promise<Resultado> {
  await requerirAdmin();
  const categoria = String(f.get("categoria") ?? "");
  const medio = String(f.get("medio") ?? "efectivo");
  const monto = Number(String(f.get("monto") ?? "").replace(",", "."));
  const concepto = String(f.get("concepto") ?? "").trim() || null;
  const cat = CATEGORIAS_CAJA[categoria];
  if (!cat || categoria === "venta" || categoria === "anulacion") return { error: "Elegí una categoría." };
  if (!(medio in MEDIOS_PAGO)) return { error: "Medio de pago inválido." };
  if (!Number.isFinite(monto) || monto <= 0) return { error: "Ingresá un monto mayor a 0." };

  const supabase = await createClient();
  const { error } = await supabase.from("caja_movimientos").insert({ tipo: cat.tipo, categoria, medio, monto, concepto });
  if (error) return { error: error.message };
  revalidatePath("/panel/caja");
  return { ok: cat.tipo === "ingreso" ? "Ingreso registrado." : "Egreso registrado." };
}

export async function borrarMovimiento(f: FormData) {
  await requerirAdmin();
  const supabase = await createClient();
  await supabase.from("caja_movimientos").delete().eq("id", String(f.get("id"))).is("orden_id", null);
  revalidatePath("/panel/caja");
}
