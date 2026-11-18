"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import type { Slide } from "@/lib/landing";
import Rueda from "./Rueda";

const DURACION = 6500;

export default function HeroCarrusel({ slides, whatsapp }: { slides: Slide[]; whatsapp: string | null }) {
  const [i, setI] = useState(0);
  const [pausa, setPausa] = useState(false);
  const total = slides.length;
  const ir = useCallback((n: number) => setI(((n % total) + total) % total), [total]);

  useEffect(() => {
    if (pausa) return;
    const t = setTimeout(() => ir(i + 1), DURACION);
    return () => clearTimeout(t);
  }, [i, pausa, ir]);

  const { scrollY } = useScroll();
  const giro = useTransform(scrollY, [0, 1500], [0, 540]);
  const bajarTexto = useTransform(scrollY, [0, 600], [0, 120]);
  const desvanecer = useTransform(scrollY, [0, 500], [1, 0]);
  const s = slides[i];

  return (
    <section
      className="relative h-[100svh] min-h-[560px] overflow-hidden bg-asfalto text-white"
      aria-roledescription="carrusel"
      aria-label="Servicios destacados"
      onMouseEnter={() => setPausa(true)}
      onMouseLeave={() => setPausa(false)}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={i}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.18 }}
          animate={{ opacity: 1, scale: 1.02, transition: { opacity: { duration: 1.1 }, scale: { duration: DURACION / 1000 + 1.5, ease: "linear" } } }}
          exit={{ opacity: 0, transition: { duration: 1.1 } }}
        >
          <Image src={s.src} alt={s.alt} fill priority={i === 0} sizes="100vw" className="object-cover" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 bg-gradient-to-r from-asfalto via-asfalto/75 to-asfalto/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-asfalto via-transparent to-asfalto/50" />

      <motion.div style={{ rotate: giro }} className="absolute -right-28 -bottom-28 w-64 h-64 sm:w-96 sm:h-96 opacity-15 pointer-events-none">
        <Rueda className="w-full h-full" />
      </motion.div>

      <motion.div
        className="relative h-full max-w-6xl mx-auto px-4 flex flex-col justify-center pt-16"
        style={{ y: bajarTexto, opacity: desvanecer }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={(_, info) => {
          if (info.offset.x < -70) ir(i + 1);
          else if (info.offset.x > 70) ir(i - 1);
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div key={i} initial="oculto" animate="visible" exit="salida" className="max-w-3xl select-none">
            <motion.p
              variants={{ oculto: { opacity: 0, x: -30 }, visible: { opacity: 1, x: 0, transition: { duration: 0.5 } }, salida: { opacity: 0, x: 30, transition: { duration: 0.3 } } }}
              className="inline-flex items-center gap-2 text-senal font-semibold tracking-[0.2em] uppercase text-sm mb-4"
            >
              <span className="w-8 h-0.5 bg-senal" />
              {s.etiqueta}
            </motion.p>
            <h1 className="titulo text-5xl sm:text-7xl lg:text-8xl leading-[0.92]" aria-live="polite">
              {s.titulo.split(" ").map((palabra, k) => (
                <span key={k} className="inline-block overflow-hidden align-bottom mr-[0.22em]">
                  <motion.span
                    className="inline-block"
                    variants={{
                      oculto: { y: "110%" },
                      visible: { y: "0%", transition: { duration: 0.7, delay: 0.1 + k * 0.08, ease: [0.22, 1, 0.36, 1] } },
                      salida: { y: "-110%", transition: { duration: 0.35, delay: k * 0.03 } },
                    }}
                  >
                    {palabra}
                  </motion.span>
                </span>
              ))}
            </h1>
            <motion.p
              variants={{ oculto: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { delay: 0.5, duration: 0.6 } }, salida: { opacity: 0, transition: { duration: 0.2 } } }}
              className="text-zinc-200 text-lg sm:text-xl mt-6 max-w-xl"
            >
              {s.texto}
            </motion.p>
          </motion.div>
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="flex flex-wrap gap-3 mt-9"
        >
          <motion.a href="#reservar" className="btn btn-primario text-lg px-7 py-3.5" whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }}>
            Reservar turno
          </motion.a>
          {whatsapp && (
            <motion.a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="btn text-lg px-7 py-3.5 border-white/40 text-white hover:bg-white/10"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.96 }}
            >
              Consultar por WhatsApp
            </motion.a>
          )}
        </motion.div>
      </motion.div>

      <div className="absolute bottom-8 inset-x-0">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-4">
          <button onClick={() => ir(i - 1)} className="grid place-items-center w-11 h-11 rounded-full border border-white/30 hover:bg-white hover:text-asfalto transition-colors" aria-label="Anterior">
            &larr;
          </button>
          <div className="flex gap-2 flex-1 max-w-sm">
            {slides.map((sl, k) => (
              <button key={k} onClick={() => ir(k)} className="relative h-1.5 flex-1 rounded-full bg-white/25 overflow-hidden" aria-label={`Ir a: ${sl.titulo}`} aria-current={k === i}>
                {k < i && <span className="absolute inset-0 bg-white/70" />}
                {k === i && (
                  <motion.span
                    key={`${i}-${pausa}`}
                    className="absolute inset-y-0 left-0 bg-senal"
                    initial={{ width: pausa ? "100%" : "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: pausa ? 0 : DURACION / 1000, ease: "linear" }}
                  />
                )}
              </button>
            ))}
          </div>
          <button onClick={() => ir(i + 1)} className="grid place-items-center w-11 h-11 rounded-full border border-white/30 hover:bg-white hover:text-asfalto transition-colors" aria-label="Siguiente">
            &rarr;
          </button>
          <span className="hidden sm:block titulo text-lg tabular-nums text-zinc-300">
            {String(i + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>
      </div>

      <motion.a
        href="#servicios"
        className="hidden md:flex absolute bottom-8 right-8 flex-col items-center gap-2 text-xs tracking-widest uppercase text-zinc-300"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 1.8 }}
      >
        Scroll
        <span className="w-px h-10 bg-gradient-to-b from-senal to-transparent" />
      </motion.a>
    </section>
  );
}
