"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type EstadoForm = { error?: string; ok?: string } | undefined;

export async function iniciarSesion(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/panel");
  if (!email || !password) return { error: "Completá email y contraseña." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) return { error: "Tenés que confirmar tu email primero (revisá tu casilla)." };
    return { error: "Email o contraseña incorrectos." };
  }
  redirect(next.startsWith("/panel") ? next : "/panel");
}

export async function registrarse(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (nombre.length < 2) return { error: "Ingresá tu nombre." };
  if (!email) return { error: "Ingresá tu email." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const h = await headers();
  const origen = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nombre }, emailRedirectTo: `${origen}/auth/callback?next=/panel` },
  });
  if (error) return { error: error.message };
  if (data.session) redirect("/panel");
  return { ok: "Cuenta creada. Te enviamos un email para confirmarla." };
}

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
