export const TIPOS_CAMPANA: Record<string, { label: string; ayuda: string }> = {
  recordatorio: {
    label: "Recordatorio de servicio",
    ayuda: "Clientes cuya última vez con estos servicios fue hace X meses o más. Ej.: alineación cada 6 meses.",
  },
  inactivos: {
    label: "Clientes inactivos",
    ayuda: "Clientes que no vienen hace X meses o más, por cualquier servicio.",
  },
  libre: {
    label: "Mensaje a todos",
    ayuda: "Todos los clientes con teléfono que aceptan promociones. Para avisos, promos o feriados.",
  },
};

export const VARIABLES = [
  { clave: "{nombre}", ayuda: "Primer nombre del cliente" },
  { clave: "{servicio}", ayuda: "Último servicio que se hizo" },
  { clave: "{vehiculo}", ayuda: "Marca y modelo (o \"vehículo\")" },
  { clave: "{meses}", ayuda: "Meses desde la última visita" },
  { clave: "{negocio}", ayuda: "Nombre de la gomería" },
];

export type DatosMensaje = {
  nombre: string;
  servicio?: string | null;
  vehiculo?: string | null;
  meses?: number | null;
  negocio: string;
};

/** Reemplaza las variables de la plantilla con los datos del cliente. */
export function armarMensaje(plantilla: string, d: DatosMensaje): string {
  const primerNombre = d.nombre.trim().split(/\s+/)[0] ?? "";
  return plantilla
    .replaceAll("{nombre}", primerNombre)
    .replaceAll("{servicio}", d.servicio ? d.servicio.charAt(0).toLowerCase() + d.servicio.slice(1) : "el servicio")
    .replaceAll("{vehiculo}", d.vehiculo || "vehículo")
    .replaceAll("{meses}", d.meses != null ? String(d.meses) : "unos")
    .replaceAll("{negocio}", d.negocio);
}

export const EJEMPLO: DatosMensaje = {
  nombre: "Juan Pérez",
  servicio: "Alineación 3D",
  vehiculo: "Ford Fiesta",
  meses: 7,
  negocio: "Gomería & Alineaciones C&P",
};
