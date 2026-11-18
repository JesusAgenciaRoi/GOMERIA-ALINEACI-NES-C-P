// Todas las fechas se muestran en la hora local del negocio.
export const TZ = "America/Montevideo";

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-UY", { timeZone: TZ, ...opts });

const fHora = fmt({ hour: "2-digit", minute: "2-digit", hour12: false });
const fFechaCorta = fmt({ weekday: "short", day: "numeric", month: "short" });
const fFechaLarga = fmt({ weekday: "long", day: "numeric", month: "long" });
const fISO = fmt({ year: "numeric", month: "2-digit", day: "2-digit" });

export const hora = (d: string | Date) => fHora.format(new Date(d));
export const fechaCorta = (d: string | Date) => fFechaCorta.format(new Date(d));
export const fechaLarga = (d: string | Date) => fFechaLarga.format(new Date(d));

/** Fecha local YYYY-MM-DD de un instante. */
export function fechaLocal(d: string | Date = new Date()): string {
  const p = Object.fromEntries(fISO.formatToParts(new Date(d)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

/** Suma dias a una fecha YYYY-MM-DD. */
export function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + dias));
  return dt.toISOString().slice(0, 10);
}

/** Dia de semana (0=domingo) de una fecha YYYY-MM-DD. */
export function diaSemana(fecha: string): number {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Lunes de la semana de una fecha. */
export function inicioSemana(fecha: string): string {
  const dow = diaSemana(fecha);
  return sumarDias(fecha, dow === 0 ? -6 : 1 - dow);
}

/** Desfase de la zona del negocio en un instante, en minutos (ej: -180). */
function offsetMin(instante: Date): number {
  const p = Object.fromEntries(
    fmt({ year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(instante)
      .map((x) => [x.type, x.value]),
  );
  const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
  return Math.round((local - instante.getTime()) / 60000);
}

/** Convierte fecha + hora local del negocio (YYYY-MM-DD, HH:MM) a ISO UTC. */
export function localAISO(fecha: string, horaLocal: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const [hh, mm] = horaLocal.split(":").map(Number);
  const supuesto = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const off = offsetMin(supuesto);
  return new Date(supuesto.getTime() - off * 60000).toISOString();
}

/** Inicio y fin (ISO) de un dia local. */
export function rangoDia(fecha: string): [string, string] {
  return [localAISO(fecha, "00:00"), localAISO(sumarDias(fecha, 1), "00:00")];
}

export const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export const pesos = (n: number | null | undefined) =>
  n == null ? "Consultar" : new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(n);
