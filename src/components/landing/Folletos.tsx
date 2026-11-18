"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";

type Foto = { src: string; alt: string };

export default function Folletos({ folletos }: { folletos: Foto[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const [abierto, setAbierto] = useState<number | null>(null);

  return (
    <div ref={ref} className="grid grid-cols-2 gap-4 sm:gap-8 w-full max-w-xl mx-auto lg:mx-0">
      {folletos.map((f, k) => (
        <motion.div key={f.src} style={{ y }}>
          <motion.button
            layoutId={`folleto-${k}`}
            onClick={() => setAbierto(k)}
            className="relative block w-full aspect-[2/3] rounded-xl overflow-hidden shadow-2xl ring-1 ring-black/10"
            initial={{ opacity: 0, rotate: k === 0 ? -14 : 14, y: 60 }}
            whileInView={{ opacity: 1, rotate: k === 0 ? -4 : 4, y: 0 }}
            whileHover={{ rotate: 0, scale: 1.05, zIndex: 10 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ type: "spring", stiffness: 120, damping: 16 }}
            aria-label={`Ampliar folleto: ${f.alt}`}
          >
            <Image src={f.src} alt={f.alt} fill sizes="(min-width:1024px) 280px, 45vw" className="object-cover" />
          </motion.button>
        </motion.div>
      ))}

      <AnimatePresence>
        {abierto != null && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/90 grid place-items-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAbierto(null)}
            role="dialog"
            aria-modal="true"
            aria-label={folletos[abierto].alt}
          >
            <motion.div layoutId={`folleto-${abierto}`} className="relative h-[88vh] aspect-[2/3] max-w-full rounded-xl overflow-hidden">
              <Image src={folletos[abierto].src} alt={folletos[abierto].alt} fill sizes="90vw" className="object-contain" />
            </motion.div>
            <button className="absolute top-4 right-4 btn btn-secundario" onClick={() => setAbierto(null)}>Cerrar</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
