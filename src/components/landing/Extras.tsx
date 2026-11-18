"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { TZ } from "@/lib/fechas";

type Horario = { dia_semana: number; apertura: string; cierre: string };

function estadoAhora(horarios: Horario[]): { abierto: boolean; texto: string } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
  const ahora = `${String(+p.hour % 24).padStart(2, "0")}:${p.minute}`;
  const hoy = horarios.filter((h) => h.dia_semana === dow).sort((a, b) => a.apertura.localeCompare(b.apertura));
  const actual = hoy.find((h) => h.apertura.slice(0, 5) <= ahora && ahora < h.cierre.slice(0, 5));
  if (actual) return { abierto: true, texto: `Abierto ahora · cierra ${actual.cierre.slice(0, 5)}` };
  const prox = hoy.find((h) => h.apertura.slice(0, 5) > ahora);
  return { abierto: false, texto: prox ? `Cerrado · abre hoy ${prox.apertura.slice(0, 5)}` : "Cerrado ahora" };
}

/** Indicador en vivo de abierto/cerrado (se calcula en el navegador). */
export function AbiertoAhora({ horarios }: { horarios: Horario[] }) {
  const [estado, setEstado] = useState<{ abierto: boolean; texto: string } | null>(null);
  useEffect(() => {
    const tick = () => setEstado(estadoAhora(horarios));
    const t0 = setTimeout(tick, 0);
    const t = setInterval(tick, 60000);
    return () => { clearTimeout(t0); clearInterval(t); };
  }, [horarios]);
  if (!estado) return null;
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${estado.abierto ? "bg-emerald-100 text-emerald-900" : "bg-zinc-200 text-zinc-700"}`}
    >
      <span className={`relative inline-block w-2.5 h-2.5 rounded-full ${estado.abierto ? "bg-emerald-500 text-emerald-500 pulso" : "bg-zinc-500"}`} />
      {estado.texto}
    </motion.span>
  );
}

/** Boton flotante de WhatsApp que aparece al bajar. */
export function BotonWhatsApp({ href }: { href: string }) {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setVisible(y > 500));
  return (
    <AnimatePresence>
      {visible && (
        <motion.a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Escribinos por WhatsApp"
          className="fixed bottom-5 right-5 z-40 text-[#25d366]"
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 90 }}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        >
          <span className="pulso relative grid place-items-center w-14 h-14 rounded-full bg-[#25d366] text-white shadow-xl isolate">
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current" aria-hidden="true">
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3Z" />
            </svg>
          </span>
        </motion.a>
      )}
    </AnimatePresence>
  );
}

/** Tarjeta que se inclina siguiendo el mouse. */
export function TarjetaInclinable({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [rot, setRot] = useState({ x: 0, y: 0 });
  return (
    <motion.div
      className={className}
      style={{ transformPerspective: 900 }}
      animate={{ rotateX: rot.x, rotateY: rot.y }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
      whileHover={{ y: -8 }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setRot({ x: ((e.clientY - r.top) / r.height - 0.5) * -10, y: ((e.clientX - r.left) / r.width - 0.5) * 12 });
      }}
      onMouseLeave={() => setRot({ x: 0, y: 0 })}
    >
      {children}
    </motion.div>
  );
}
