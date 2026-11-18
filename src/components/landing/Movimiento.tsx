"use client";

import { useEffect, useRef } from "react";
import { animate, motion, MotionConfig, useInView, useScroll, useTransform } from "motion/react";

/** Respeta la preferencia del sistema de reducir movimiento. */
export function ConfigMovimiento({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Aparece al entrar en pantalla. */
export function Revelar({
  children,
  delay = 0,
  desde = "abajo",
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  desde?: "abajo" | "izquierda" | "derecha" | "zoom";
  className?: string;
}) {
  const inicial = {
    abajo: { opacity: 0, y: 50 },
    izquierda: { opacity: 0, x: -60 },
    derecha: { opacity: 0, x: 60 },
    zoom: { opacity: 0, scale: 0.85 },
  }[desde];
  return (
    <motion.div
      className={className}
      initial={inicial}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Numero que cuenta desde 0 al aparecer. */
export function Contador({ hasta, sufijo = "" }: { hasta: number; sufijo?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const visto = useInView(ref, { once: true, amount: 0.6 });
  useEffect(() => {
    if (!visto || !ref.current) return;
    const el = ref.current;
    const ctrl = animate(0, hasta, { duration: 1.6, ease: "easeOut", onUpdate: (v) => (el.textContent = Math.round(v) + sufijo) });
    return () => ctrl.stop();
  }, [visto, hasta, sufijo]);
  return <span ref={ref}>0{sufijo}</span>;
}

/** Banda infinita de texto. */
export function Marquesina({ items, inversa = false, duracion = 30, className = "" }: { items: string[]; inversa?: boolean; duracion?: number; className?: string }) {
  const fila = [...items, ...items];
  return (
    <div className={`overflow-hidden whitespace-nowrap ${className}`} aria-hidden="true">
      <div className={`marquesina inline-flex ${inversa ? "marquesina-inversa" : ""}`} style={{ ["--dur" as string]: `${duracion}s` }}>
        {[0, 1].map((rep) => (
          <div key={rep} className="inline-flex">
            {fila.map((t, k) => (
              <span key={k} className="titulo text-3xl sm:text-5xl px-6 inline-flex items-center gap-6">
                {t}
                <span className="inline-block w-3 h-3 rotate-45 bg-current opacity-60" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Imagen de fondo con efecto parallax. */
export function Parallax({ src, children }: { src: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-18%", "18%"]);
  const escala = useTransform(scrollYProgress, [0, 0.5, 1], [1.15, 1.05, 1.15]);
  return (
    <section ref={ref} className="relative overflow-hidden min-h-[70vh] flex items-center text-white">
      <motion.div className="absolute inset-x-0 -top-[20%] h-[140%]" style={{ y, scale: escala }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
      </motion.div>
      <div className="absolute inset-0 bg-asfalto/70" />
      <div className="relative w-full">{children}</div>
    </section>
  );
}
