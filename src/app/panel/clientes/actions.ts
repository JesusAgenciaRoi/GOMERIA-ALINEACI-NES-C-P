"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requerirAdmin, requerirStaff } from "@/lib/auth";

export type Resultado = { error?: string; ok?: string } | undefined;

const txt = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const telefono = (v: string | null) => (v ? v.replace(/[^0-9+]/g, "") || null : null);
const patente = (v: string | null) => (v ? v.toUpperCase().replace(/[^A-Z0-9]/g, "") || null : null);

function errorDb(msg: string): string {
  if (msg.includes("clientes_telefono_key")) return "Ya existe un cliente con ese teléfono.";
  if (msg.includes("vehiculos_patente_key")) return "Esa patente ya está cargada en otro cliente.";
  return msg;
}

export async function crearCliente(_p: Resultado, f: FormData): Promise<Resultado> {
  await requerirStaff();
  const nombre = txt(f, "nombre");
  if (!nombre || nombre.length < 2) return { error: "Ingresá el nombre." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .insert({ nombre, telefono: telefono(txt(f, "telefono")), email: txt(f, "email"), notas: txt(f, "notas"), origen: txt(f, "origen") ?? "local" })
    .select("id")
    .single();
  if (error) return { error: errorDb(error.message) };

  const pat = patente(txt(f, "patente"));
  if (pat) {
    const { error: eVeh } = await supabase
      .from("vehiculos")
      .insert({ cliente_id: data.id, patente: pat, marca: txt(f, "marca"), modelo: txt(f, "modelo") });
    if (eVeh) {
      revalidatePath("/panel/clientes");
      redirect(`/panel/clientes/${data.id}?aviso=patente`);
    }
  }
  revalidatePath("/panel/clientes");
  redirect(`/panel/clientes/${data.id}`);
}

export async function actualizarCliente(_p: Resultado, f: FormData): Promise<Resultado> {
  await requerirStaff();
  const id = String(f.get("id"));
  const nombre = txt(f, "nombre");
  if (!nombre || nombre.length < 2) return { error: "Ingresá el nombre." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("clientes")
    .update({
      nombre,
      telefono: telefono(txt(f, "telefono")),
      email: txt(f, "email"),
      notas: txt(f, "notas"),
      origen: txt(f, "origen") ?? "local",
      acepta_promos: f.get("acepta_promos") === "on",
    })
    .eq("id", id);
  if (error) return { error: errorDb(error.message) };
  revalidatePath(`/panel/clientes/${id}`);
  return { ok: "Guardado." };
}

export async function eliminarCliente(f: FormData) {
  await requerirAdmin();
  const id = String(f.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) redirect(`/panel/clientes/${id}?aviso=no_borrable`);
  revalidatePath("/panel/clientes");
  redirect("/panel/clientes");
}

export async function agregarVehiculo(_p: Resultado, f: FormData): Promise<Resultado> {
  await requerirStaff();
  const clienteId = String(f.get("cliente_id"));
  const anio = txt(f, "anio");
  const supabase = await createClient();
  const { error } = await supabase.from("vehiculos").insert({
    cliente_id: clienteId,
    patente: patente(txt(f, "patente")),
    marca: txt(f, "marca"),
    modelo: txt(f, "modelo"),
    anio: anio ? Number(anio) : null,
    medida_cubierta: txt(f, "medida_cubierta"),
    notas: txt(f, "notas"),
  });
  if (error) return { error: errorDb(error.message) };
  revalidatePath(`/panel/clientes/${clienteId}`);
  return { ok: "Vehículo agregado." };
}

export async function eliminarVehiculo(f: FormData) {
  await requerirStaff();
  const id = String(f.get("id"));
  const clienteId = String(f.get("cliente_id"));
  const supabase = await createClient();
  await supabase.from("vehiculos").delete().eq("id", id);
  revalidatePath(`/panel/clientes/${clienteId}`);
}
