import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requerirAdmin } from "@/lib/auth";
import { Encabezado } from "@/components/ui";
import { fechaCorta } from "@/lib/fechas";

async function cambiarRol(f: FormData) {
  "use server";
  const yo = await requerirAdmin();
  const id = String(f.get("id"));
  const rol = String(f.get("rol"));
  if (id === yo.id || !["admin", "empleado", "pendiente"].includes(rol)) return;
  const supabase = await createClient();
  await supabase.from("profiles").update({ rol }).eq("id", id);
  revalidatePath("/panel/usuarios");
}

const ROLES: Record<string, string> = { admin: "Administrador", empleado: "Empleado", pendiente: "Pendiente (sin acceso)" };

export default async function UsuariosPage() {
  const yo = await requerirAdmin();
  const supabase = await createClient();
  const { data: perfiles } = await supabase.from("profiles").select("*").order("created_at");

  return (
    <div className="max-w-3xl">
      <Encabezado titulo="Usuarios" subtitulo="Los empleados crean su cuenta en /login y vos les das acceso acá." />
      <ul className="tarjeta divide-y divide-borde">
        {(perfiles ?? []).map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <div className="font-semibold">{p.nombre} {p.id === yo.id && <span className="text-xs text-suave">(vos)</span>}</div>
              <div className="text-sm text-suave">{p.email} · desde {fechaCorta(p.created_at)}</div>
            </div>
            {p.id === yo.id ? (
              <span className="text-sm font-semibold">{ROLES[p.rol]}</span>
            ) : (
              <form action={cambiarRol} className="flex gap-2">
                <input type="hidden" name="id" value={p.id} />
                <select name="rol" defaultValue={p.rol} className="input w-auto" aria-label={`Rol de ${p.nombre}`}>
                  {Object.entries(ROLES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button className="btn btn-chico btn-secundario">Guardar</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
