"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

type Foto = { src: string; alt: string };

export default function Galeria({ fotos }: { fotos: Foto[] }) {
  const pista = useRef<HTMLDivElement>(null);
  const [abierta, setAbierta] = useState<number | null>(null);

  const mover = (dir: 1 | -1) => {
    const el = pista.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  useEffect(() => {
    if (abierta == null) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierta(null);
      if (e.key === "ArrowRight") setAbierta((a) => (a == null ? a : (a + 1) % fotos.length));
      if (e.key === "ArrowLeft") setAbierta((a) => (a == null ? a : (a - 1 + fotos.length) % fotos.length));
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierta, fotos.length]);

  return (
    <div className="relative">
      <div className="flex justify-end gap-2 mb-4">
        <button onClick={() => mover(-1)} className="grid place-items-center w-11 h-11 rounded-full border border-borde bg-superficie hover:bg-asfalto hover:text-white transition-colors" aria-label="Fotos anteriores">&larr;</button>
        <button onClick={() => mover(1)} className="grid place-items-center w-11 h-11 rounded-full border border-borde bg-superficie hover:bg-asfalto hover:text-white transition-colors" aria-label="Más fotos">&rarr;</button>
      </div>

      <div ref={pista} className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 [scrollbar-width:none]">
        {fotos.map((f, k) => (
          <motion.button
            key={f.src}
            layoutId={`foto-${k}`}
            onClick={() => setAbierta(k)}
            className="relative shrink-0 snap-start w-[78%] sm:w-[45%] lg:w-[31%] aspect-[4/3] rounded-xl overflow-hidden group"
            initial={{ opacity: 0, x: 80, rotate: 3 }}
            whileInView={{ opacity: 1, x: 0, rotate: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: (k % 3) * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            aria-label={`Ampliar: ${f.alt}`}
          >
            <Image src={f.src} alt={f.alt} fill sizes="(min-width:1024px) 31vw, (min-width:640px) 45vw, 78vw" className="object-cover transition-transform duration-700 group-hover:scale-110" />
            <span className="absolute inset-0 bg-gradient-to-t from-asfalto/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="absolute left-4 bottom-3 text-white text-sm font-semibold translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
              {f.alt}
            </span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {abierta != null && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/90 grid place-items-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAbierta(null)}
            role="dialog"
            aria-modal="true"
            aria-label={fotos[abierta].alt}
          >
            <motion.div layoutId={`foto-${abierta}`} className="relative w-full max-w-5xl aspect-[4/3] rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <Image src={fotos[abierta].src} alt={fotos[abierta].alt} fill sizes="100vw" className="object-cover" />
            </motion.div>
            <button className="absolute top-4 right-4 btn btn-secundario" onClick={() => setAbierta(null)}>Cerrar</button>
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 grid place-items-center w-12 h-12 rounded-full bg-white/90 text-asfalto"
              onClick={(e) => { e.stopPropagation(); setAbierta((abierta - 1 + fotos.length) % fotos.length); }}
              aria-label="Foto anterior"
            >&larr;</button>
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 grid place-items-center w-12 h-12 rounded-full bg-white/90 text-asfalto"
              onClick={(e) => { e.stopPropagation(); setAbierta((abierta + 1) % fotos.length); }}
              aria-label="Foto siguiente"
            >&rarr;</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
