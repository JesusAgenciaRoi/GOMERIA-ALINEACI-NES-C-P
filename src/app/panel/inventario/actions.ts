"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requerirAdmin, requerirStaff } from "@/lib/auth";
import { errorNegocio } from "@/lib/negocio";

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

function datosProducto(f: FormData) {
  return {
    codigo: txt(f, "codigo"),
    nombre: txt(f, "nombre") ?? "",
    categoria: txt(f, "categoria") ?? "repuesto",
    marca: txt(f, "marca"),
    medida: txt(f, "medida")?.toUpperCase() ?? null,
    condicion: txt(f, "condicion") ?? "nueva",
    precio_costo: nro(f, "precio_costo"),
    precio_venta: nro(f, "precio_venta"),
    stock_minimo: nro(f, "stock_minimo") ?? 0,
    proveedor_id: txt(f, "proveedor_id"),
    notas: txt(f, "notas"),
    activo: f.get("activo") !== null ? f.get("activo") === "on" : true,
  };
}

export async function crearProducto(_p: Resultado, f: FormData): Promise<Resultado> {
  await requerirAdmin();
  const datos = datosProducto(f);
  if (datos.nombre.length < 2) return { error: "Ingresá el nombre del producto." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("productos").insert(datos).select("id").single();
  if (error) return { error: errorNegocio(error.message) };

  const stockInicial = nro(f, "stock_inicial");
  if (stockInicial && stockInicial > 0) {
    await supabase.from("movimientos_stock").insert({
      producto_id: data.id,
      tipo: "ingreso",
      cantidad: stockInicial,
      costo_unitario: datos.precio_costo,
      proveedor_id: datos.proveedor_id,
      motivo: "Stock inicial",
    });
  }
  revalidatePath("/panel/inventario");
  redirect(`/panel/inventario/${data.id}`);
}

export async function actualizarProducto(_p: Resultado, f: FormData): Promise<Resultado> {
  await requerirAdmin();
  const id = String(f.get("id"));
  const datos = { ...datosProducto(f), activo: f.get("activo") === "on" };
  if (datos.nombre.length < 2) return { error: "Ingresá el nombre del producto." };
  const supabase = await createClient();
  const { error } = await supabase.from("productos").update(datos).eq("id", id);
  if (error) return { error: errorNegocio(error.message) };
  revalidatePath(`/panel/inventario/${id}`);
  revalidatePath("/panel/inventario");
  return { ok: "Guardado." };
}

export async function moverStock(_p: Resultado, f: FormData): Promise<Resultado> {
  const perfil = await requerirStaff();
  const productoId = String(f.get("producto_id"));
  const tipo = String(f.get("tipo") ?? "ingreso");
  let cantidad = nro(f, "cantidad");
  if (!cantidad || cantidad === 0) return { error: "Ingresá una cantidad." };
  if (tipo === "ajuste" && perfil.rol !== "admin") return { error: "Solo el administrador puede hacer ajustes." };
  if (tipo === "ingreso") cantidad = Math.abs(cantidad);

  const supabase = await createClient();
  const { error } = await supabase.from("movimientos_stock").insert({
    producto_id: productoId,
    tipo: tipo === "ajuste" ? "ajuste" : "ingreso",
    cantidad,
    costo_unitario: nro(f, "costo_unitario"),
    proveedor_id: txt(f, "proveedor_id"),
    motivo: txt(f, "motivo"),
  });
  if (error) return { error: errorNegocio(error.message) };

  // Actualiza el costo del producto si se informo uno nuevo en el ingreso
  const costo = nro(f, "costo_unitario");
  if (tipo === "ingreso" && costo != null && perfil.rol === "admin") {
    await supabase.from("productos").update({ precio_costo: costo }).eq("id", productoId);
  }
  revalidatePath(`/panel/inventario/${productoId}`);
  revalidatePath("/panel/inventario");
  return { ok: tipo === "ajuste" ? "Ajuste registrado." : "Ingreso registrado." };
}

export async function eliminarProducto(f: FormData) {
  await requerirAdmin();
  const id = String(f.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("productos").delete().eq("id", id);
  if (error) redirect(`/panel/inventario/${id}?error=${encodeURIComponent(errorNegocio(error.message))}`);
  revalidatePath("/panel/inventario");
  redirect("/panel/inventario");
}

export async function guardarProveedor(f: FormData) {
  await requerirAdmin();
  const supabase = await createClient();
  const id = txt(f, "id");
  const datos = { nombre: txt(f, "nombre") ?? "", telefono: txt(f, "telefono"), email: txt(f, "email"), notas: txt(f, "notas") };
  const { error } = id ? await supabase.from("proveedores").update(datos).eq("id", id) : await supabase.from("proveedores").insert(datos);
  revalidatePath("/panel/inventario/proveedores");
  redirect(`/panel/inventario/proveedores${error ? `?error=${encodeURIComponent(error.message)}` : "?ok=1"}`);
}

export async function eliminarProveedor(f: FormData) {
  await requerirAdmin();
  const supabase = await createClient();
  await supabase.from("proveedores").delete().eq("id", String(f.get("id")));
  revalidatePath("/panel/inventario/proveedores");
  redirect("/panel/inventario/proveedores");
}
