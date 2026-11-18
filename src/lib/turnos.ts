export const ESTADOS = {
  pendiente_pago: { label: "Pendiente de seña", clase: "bg-amber-100 text-amber-900 border-amber-300" },
  confirmado: { label: "Confirmado", clase: "bg-sky-100 text-sky-900 border-sky-300" },
  en_curso: { label: "En curso", clase: "bg-violet-100 text-violet-900 border-violet-300" },
  completado: { label: "Completado", clase: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  cancelado: { label: "Cancelado", clase: "bg-zinc-100 text-zinc-500 border-zinc-300 line-through" },
  no_asistio: { label: "No asistió", clase: "bg-rose-100 text-rose-900 border-rose-300" },
} as const;

/** Motivo de los bloqueos creados con "Estoy ocupado" (cliente sin turno). */
export const MOTIVO_OCUPADO = "Trabajo sin turno";

export type Estado = keyof typeof ESTADOS;

export const estadoInfo = (e: string) => ESTADOS[e as Estado] ?? ESTADOS.confirmado;

export const ORIGENES: Record<string, string> = {
  local: "En el local",
  telefono: "Teléfono",
  web: "Web",
  whatsapp: "WhatsApp",
  agente: "Agente IA",
  referido: "Referido",
  redes: "Redes",
};

/** Link de WhatsApp con mensaje prearmado. */
export function linkWhatsApp(telefono: string | null | undefined, mensaje: string): string | null {
  if (!telefono) return null;
  let num = telefono.replace(/[^0-9]/g, "");
  if (!num) return null;
  // Uruguay: celulares 09X XXX XXX. Si ya trae codigo de pais (598...) se deja igual.
  if (num.startsWith("0")) num = "598" + num.slice(1);
  else if (num.length === 8) num = "598" + num;
  return `https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`;
}

const ERRORES_RPC: Record<string, string> = {
  persona_ocupada: "Ya hay otro trabajo en ese horario y hay una sola persona trabajando. Elegí otro horario.",
  horario_no_disponible: "Ese horario ya no está disponible. Elegí otro.",
  telefono_invalido: "Revisá el número de teléfono.",
  nombre_invalido: "Ingresá tu nombre.",
  servicio_invalido: "El servicio elegido no está disponible.",
  notas_muy_largas: "El comentario es demasiado largo.",
};

export function mensajeError(msg: string | undefined): string {
  if (!msg) return "Ocurrió un error. Intentá de nuevo.";
  const clave = Object.keys(ERRORES_RPC).find((k) => msg.includes(k));
  if (clave) return ERRORES_RPC[clave];
  if (msg.includes("turnos_sin_superposicion")) return "Ese recurso ya tiene un turno en ese horario.";
  return msg;
}
