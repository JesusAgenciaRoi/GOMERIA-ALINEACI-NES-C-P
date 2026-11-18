import { requerirStaff } from "@/lib/auth";
import { cerrarSesion } from "../login/actions";
import NavPanel from "./NavPanel";

export const metadata = { title: "Panel | Gomería C&P" };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const perfil = await requerirStaff();
  const items = [
    { href: "/panel", label: "Inicio" },
    { href: "/panel/agenda", label: "Agenda" },
    { href: "/panel/ordenes", label: "Órdenes de trabajo" },
    { href: "/panel/clientes", label: "Clientes" },
    { href: "/panel/inventario", label: "Inventario" },
    { href: "/panel/compras", label: "Compras" },
    { href: "/panel/contenidos", label: "Contenidos" },
    { href: "/panel/campanas", label: "Campañas" },
    ...(perfil.rol === "admin"
      ? [
          { href: "/panel/caja", label: "Caja" },
          { href: "/panel/configuracion", label: "Configuración" },
          { href: "/panel/usuarios", label: "Usuarios" },
        ]
      : []),
  ];

  return (
    <div className="flex-1 flex flex-col lg:flex-row">
      <NavPanel items={items} nombre={perfil.nombre} rol={perfil.rol} salir={cerrarSesion} />
      <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
