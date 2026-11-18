import { redirect } from "next/navigation";
import { obtenerPerfil } from "@/lib/auth";
import { cerrarSesion } from "../login/actions";

export default async function PendientePage() {
  const perfil = await obtenerPerfil();
  if (!perfil) redirect("/login");
  if (perfil.rol !== "pendiente") redirect("/panel");

  return (
    <main className="flex-1 grid place-items-center px-4 py-12">
      <div className="tarjeta p-8 max-w-md text-center space-y-4">
        <h1 className="titulo text-2xl">Cuenta pendiente de aprobación</h1>
        <p className="text-suave">
          Hola {perfil.nombre}. El administrador tiene que habilitar tu cuenta desde el panel (Usuarios) antes de que
          puedas usarlo.
        </p>
        <form action={cerrarSesion}>
          <button className="btn btn-secundario">Cerrar sesión</button>
        </form>
      </div>
    </main>
  );
}
