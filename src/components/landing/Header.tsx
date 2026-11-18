"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";

const LINKS = [
  { href: "#servicios", label: "Servicios" },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#galeria", label: "Galería" },
  { href: "#contacto", label: "Contacto" },
];

export default function Header() {
  const { scrollY, scrollYProgress } = useScroll();
  const progreso = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const [solido, setSolido] = useState(false);
  const [abierto, setAbierto] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setSolido(y > 40));

  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${solido || abierto ? "bg-asfalto/95 backdrop-blur shadow-lg" : "bg-transparent"}`}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4 text-white">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/fotos/logo.webp" alt="Logo Gomería CYP" width={60} height={40} className="rounded-md h-10 w-auto" priority />
          <span className="titulo text-xl sm:text-2xl leading-none">Gomería <span className="text-senal">C&amp;P</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="relative text-zinc-200 hover:text-white group">
              {l.label}
              <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-senal origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <motion.a href="#reservar" className="btn btn-primario btn-chico" whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}>
            Reservar turno
          </motion.a>
          <button
            className="md:hidden btn btn-chico border-white/30 text-white"
            onClick={() => setAbierto(!abierto)}
            aria-expanded={abierto}
            aria-label="Abrir menú"
          >
            {abierto ? "Cerrar" : "Menú"}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {abierto && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden bg-asfalto"
          >
            {LINKS.map((l, i) => (
              <motion.a
                key={l.href}
                href={l.href}
                onClick={() => setAbierto(false)}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.05 * i }}
                className="block px-6 py-3 text-white titulo text-xl border-t border-white/10"
              >
                {l.label}
              </motion.a>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
      <motion.div className="h-1 bg-senal origin-left" style={{ scaleX: progreso }} />
    </header>
  );
}
