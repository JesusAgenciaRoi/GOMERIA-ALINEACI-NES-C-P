import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

export type Perfil = Tables<"profiles">;

export const obtenerPerfil = cache(async (): Promise<Perfil | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) return null;
  const { data: perfil } = await supabase.from("profiles").select("*").eq("id", uid).single();
  return perfil;
});

/** Exige usuario logueado con rol admin o empleado. */
export async function requerirStaff(): Promise<Perfil> {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect("/login");
  if (perfil.rol !== "admin" && perfil.rol !== "empleado") redirect("/pendiente");
  return perfil;
}

export async function requerirAdmin(): Promise<Perfil> {
  const perfil = await requerirStaff();
  if (perfil.rol !== "admin") redirect("/panel");
  return perfil;
}
