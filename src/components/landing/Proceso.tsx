"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import Rueda from "./Rueda";

export default function Proceso({ pasos }: { pasos: { titulo: string; texto: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const avance = useSpring(scrollYProgress, { stiffness: 90, damping: 25 });
  const ruedaX = useTransform(avance, [0, 1], ["0%", "100%"]);
  const ruedaGiro = useTransform(avance, [0, 1], [0, 720]);

  return (
    <div ref={ref} className="relative">
      {/* Linea horizontal (desktop) con rueda que avanza */}
      <div className="hidden md:block absolute left-[12.5%] right-[12.5%] top-8 h-1 bg-white/15 rounded-full">
        <motion.div className="absolute inset-y-0 left-0 right-0 bg-senal rounded-full origin-left" style={{ scaleX: avance }} />
        <motion.div className="absolute -top-5 -ml-5 w-11 h-11" style={{ left: ruedaX, rotate: ruedaGiro }}>
          <Rueda className="w-full h-full drop-shadow-lg" />
        </motion.div>
      </div>
      {/* Linea vertical (celular) */}
      <div className="md:hidden absolute left-8 top-8 bottom-8 w-1 bg-white/15 rounded-full">
        <motion.div className="absolute inset-0 bg-senal rounded-full origin-top" style={{ scaleY: avance }} />
      </div>

      <ol className="relative grid md:grid-cols-4 gap-8 md:gap-6">
        {pasos.map((p, k) => (
          <motion.li
            key={p.titulo}
            className="flex md:flex-col md:items-center md:text-center gap-5"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: k * 0.15, duration: 0.6 }}
          >
            <motion.span
              className="relative z-10 shrink-0 grid place-items-center w-16 h-16 rounded-full bg-asfalto border-4 border-senal titulo text-2xl text-senal"
              whileInView={{ scale: [0.6, 1.15, 1] }}
              viewport={{ once: true }}
              transition={{ delay: k * 0.15 + 0.2, duration: 0.6 }}
            >
              {k + 1}
            </motion.span>
            <div className="pt-2 md:pt-0">
              <h3 className="titulo text-2xl text-white">{p.titulo}</h3>
              <p className="text-zinc-400 mt-1">{p.texto}</p>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
