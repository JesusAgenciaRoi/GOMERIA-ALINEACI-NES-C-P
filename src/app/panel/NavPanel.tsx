"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Item = { href: string; label: string };

export default function NavPanel({ items, nombre, rol, salir }: { items: Item[]; nombre: string; rol: string; salir: () => Promise<void> }) {
  const path = usePathname();
  const [abierto, setAbierto] = useState(false);
  const activo = (href: string) => (href === "/panel" ? path === "/panel" : path.startsWith(href));

  return (
    <>
      <header className="lg:hidden flex items-center justify-between bg-asfalto text-white px-4 h-14 sticky top-0 z-30">
        <Link href="/panel" className="titulo text-xl">Gomería <span className="text-senal">C&amp;P</span></Link>
        <button className="btn btn-chico btn-secundario" onClick={() => setAbierto(!abierto)} aria-expanded={abierto} aria-controls="nav-panel">
          Menú
        </button>
      </header>

      <aside
        id="nav-panel"
        className={`${abierto ? "block" : "hidden"} lg:flex lg:flex-col bg-asfalto text-zinc-300 lg:w-60 lg:min-h-screen lg:sticky lg:top-0 shrink-0`}
      >
        <div className="hidden lg:block px-5 pt-6 pb-4">
          <Link href="/panel" className="titulo text-2xl text-white">Gomería <span className="text-senal">C&amp;P</span></Link>
          <div className="franja h-1.5 mt-3 rounded-full" />
        </div>
        <nav className="flex flex-col px-3 py-2 gap-0.5">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={() => setAbierto(false)}
              className={`rounded-md px-3 py-2 text-[0.95rem] font-medium ${activo(it.href) ? "bg-senal text-asfalto" : "hover:bg-asfalto-2 hover:text-white"}`}
            >
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-5 py-5 border-t border-asfalto-2 text-sm">
          <div className="text-white font-semibold truncate">{nombre}</div>
          <div className="text-zinc-400 capitalize mb-3">{rol}</div>
          <div className="flex gap-2">
            <Link href="/" className="btn btn-chico btn-secundario">Ver web</Link>
            <form action={salir}>
              <button className="btn btn-chico btn-secundario">Salir</button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
