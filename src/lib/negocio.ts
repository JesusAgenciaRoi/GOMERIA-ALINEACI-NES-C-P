// Etiquetas de inventario, ordenes y caja.
export const CATEGORIAS_PRODUCTO: Record<string, string> = {
  cubierta: "Cubiertas",
  llanta: "Llantas",
  camara: "Cámaras",
  valvula: "Válvulas",
  repuesto: "Repuestos",
  insumo: "Insumos (parches, pesas...)",
  lubricante: "Lubricantes",
  otro: "Otros",
};

export const CONDICION: Record<string, string> = { nueva: "Nueva", ocasion: "De ocasión" };

export const ESTADOS_ORDEN = {
  abierta: { label: "Abierta", clase: "bg-sky-100 text-sky-900 border-sky-300" },
  en_proceso: { label: "En proceso", clase: "bg-violet-100 text-violet-900 border-violet-300" },
  terminada: { label: "Terminada", clase: "bg-amber-100 text-amber-900 border-amber-300" },
  cobrada: { label: "Cobrada", clase: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  anulada: { label: "Anulada", clase: "bg-zinc-100 text-zinc-500 border-zinc-300 line-through" },
} as const;
export type EstadoOrden = keyof typeof ESTADOS_ORDEN;
export const estadoOrden = (e: string) => ESTADOS_ORDEN[e as EstadoOrden] ?? ESTADOS_ORDEN.abierta;

export const MEDIOS_PAGO: Record<string, string> = {
  efectivo: "Efectivo",
  debito: "Débito",
  credito: "Crédito",
  transferencia: "Transferencia",
  mercadopago: "Mercado Pago",
  otro: "Otro",
};

export const CATEGORIAS_CAJA: Record<string, { label: string; tipo: "ingreso" | "egreso" }> = {
  venta: { label: "Venta", tipo: "ingreso" },
  sena: { label: "Seña", tipo: "ingreso" },
  otro_ingreso: { label: "Otro ingreso", tipo: "ingreso" },
  compra: { label: "Compra de mercadería", tipo: "egreso" },
  herramienta: { label: "Herramientas y equipos", tipo: "egreso" },
  gasto: { label: "Gasto", tipo: "egreso" },
  sueldo: { label: "Sueldo / adelanto", tipo: "egreso" },
  retiro: { label: "Retiro del dueño", tipo: "egreso" },
  anulacion: { label: "Anulación", tipo: "egreso" },
  otro_egreso: { label: "Otro egreso", tipo: "egreso" },
};

export const MEDIOS_COMPRA: Record<string, string> = { ...MEDIOS_PAGO, cuenta_corriente: "Cuenta corriente (pago después)" };

export const CATEGORIAS_GASTO_COMPRA: Record<string, string> = {
  herramienta: "Herramienta / equipo",
  gasto: "Gasto (limpieza, librería, etc.)",
  otro_egreso: "Otro",
};

export const TIPOS_MOV_STOCK: Record<string, string> = {
  ingreso: "Ingreso",
  venta: "Venta",
  ajuste: "Ajuste",
  devolucion: "Devolución",
};

const ERRORES: Record<string, string> = {
  orden_cerrada: "La orden ya está cobrada o anulada: no se puede modificar.",
  pagos_no_coinciden: "La suma de los pagos tiene que ser igual al total de la orden.",
  solo_admin: "Solo el administrador puede hacer esta anulación.",
  usar_cobrar_orden: "Para cobrar usá el botón Cobrar.",
  usar_anular_orden: "Una orden cobrada solo se puede anular.",
  sin_permiso: "No tenés permiso para esta acción.",
  productos_codigo_key: "Ya existe un producto con ese código.",
  orden_items_producto_id_fkey: "No se puede borrar un producto que está en órdenes. Desactivalo.",
  ordenes_turno_id_key: "Ese turno ya tiene una orden de trabajo.",
  compra_sin_items: "Agregá al menos una línea a la compra.",
  cantidad_invalida: "Revisá las cantidades: tienen que ser mayores a 0.",
  costo_invalido: "Revisá los costos: no pueden ser negativos.",
  producto_sin_nombre: "Los productos nuevos necesitan un nombre.",
  gasto_sin_descripcion: "Las líneas que no van al inventario necesitan una descripción.",
  producto_inexistente: "Uno de los productos ya no existe. Recargá la página.",
};

export function errorNegocio(msg: string | undefined): string {
  if (!msg) return "Ocurrió un error. Intentá de nuevo.";
  const k = Object.keys(ERRORES).find((x) => msg.includes(x));
  return k ? ERRORES[k] : msg;
}

export const num = (n: number | null | undefined) =>
  n == null ? "-" : new Intl.NumberFormat("es-UY", { maximumFractionDigits: 2 }).format(n);
