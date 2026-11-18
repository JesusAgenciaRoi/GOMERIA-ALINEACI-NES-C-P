// Recursos del editor: formatos, tipografias, iconos y estilos de texto.
import { Gradient, Shadow } from "fabric";

export const FORMATOS = {
  post: { label: "Post cuadrado (1:1)", ancho: 1080, alto: 1080 },
  vertical: { label: "Post vertical (4:5)", ancho: 1080, alto: 1350 },
  historia: { label: "Historia / Reel (9:16)", ancho: 1080, alto: 1920 },
  afiche: { label: "Afiche (2:3)", ancho: 1080, alto: 1620 },
} as const;
export type Formato = keyof typeof FORMATOS;

export const FUENTES = [
  { familia: "Montserrat", label: "Montserrat (moderna)", pesos: [400, 700, 900] },
  { familia: "Anton", label: "Anton (impacto)", pesos: [400] },
  { familia: "Bebas Neue", label: "Bebas Neue (condensada)", pesos: [400] },
  { familia: "Oswald", label: "Oswald", pesos: [500, 700] },
  { familia: "Barlow Condensed", label: "Barlow Condensed", pesos: [600, 800] },
  { familia: "Cinzel", label: "Cinzel (elegante)", pesos: [700, 900] },
  { familia: "Great Vibes", label: "Great Vibes (manuscrita)", pesos: [400] },
  { familia: "Kaushan Script", label: "Kaushan Script (pincel)", pesos: [400] },
  { familia: "Permanent Marker", label: "Permanent Marker (marcador)", pesos: [400] },
  { familia: "Roboto", label: "Roboto (texto)", pesos: [400, 700] },
] as const;

export const URL_FUENTES =
  "https://fonts.googleapis.com/css2?" +
  FUENTES.map((f) => `family=${f.familia.replace(/ /g, "+")}${f.pesos.length > 1 || f.pesos[0] !== 400 ? `:wght@${f.pesos.join(";")}` : ""}`).join("&") +
  "&display=swap";

export async function cargarFuentes() {
  if (typeof document === "undefined") return;
  await Promise.all(
    FUENTES.flatMap((f) => f.pesos.map((p) => document.fonts.load(`${p} 40px "${f.familia}"`).catch(() => undefined))),
  );
}

// Iconos SVG (24x24, trazo blanco) para los servicios
const svg = (cuerpo: string, relleno = false) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${relleno ? 'fill="#ffffff"' : 'fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"'}>${cuerpo}</svg>`;

export const ICONOS: Record<string, { label: string; svg: string }> = {
  alineacion: {
    label: "Alineación",
    svg: svg('<rect x="2" y="6" width="3.5" height="12" rx="1"/><rect x="18.5" y="6" width="3.5" height="12" rx="1"/><path d="M5.5 12h13"/><circle cx="12" cy="12" r="2"/><path d="M12 4v3M12 17v3"/>'),
  },
  cubierta: {
    label: "Cubierta",
    svg: svg('<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/><path d="M12 2.5v5.5M12 16v5.5M2.5 12H8M16 12h5.5M5.3 5.3l3.9 3.9M14.8 14.8l3.9 3.9M18.7 5.3l-3.9 3.9M9.2 14.8l-3.9 3.9"/>'),
  },
  pila: {
    label: "Cubiertas apiladas",
    svg: svg('<ellipse cx="12" cy="5.5" rx="8" ry="2.5"/><path d="M4 5.5v4c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-4"/><path d="M4 9.5v4c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-4"/><path d="M4 13.5v4c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-4"/>'),
  },
  balanceo: {
    label: "Balanceo",
    svg: svg('<circle cx="12" cy="12" r="9.5"/><path d="M12 6v6l4 2"/><path d="M7 3.5 5 2M17 3.5 19 2"/>'),
  },
  chequeo: {
    label: "Chequeo",
    svg: svg('<rect x="5" y="3.5" width="14" height="18" rx="2"/><path d="M9 3.5V2.5h6v1"/><path d="m8.5 9 1.5 1.5L13 7.5M8.5 15l1.5 1.5L13 13.5"/><path d="M15 9.5h1.5M15 15.5h1.5"/>'),
  },
  llave: {
    label: "Mecánica",
    svg: svg('<path d="M14.7 6.3a4 4 0 0 0 5 5L21 12.6 12.6 21 3 11.4 11.4 3l1.3 1.3a4 4 0 0 0 2 2z"/><path d="m8 13 3 3"/>'),
  },
  factura: {
    label: "Factura",
    svg: svg('<path d="M6 2.5h9l4 4v15H6z"/><path d="M15 2.5v4h4"/><path d="M9 11h7M9 14.5h7M9 18h4"/>'),
  },
  reloj: { label: "Horario", svg: svg('<circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2"/>') },
  ubicacion: { label: "Ubicación", svg: svg('<path d="M12 21.5s-7-6.2-7-11.5a7 7 0 0 1 14 0c0 5.3-7 11.5-7 11.5z"/><circle cx="12" cy="10" r="2.5"/>') },
  estrella: { label: "Estrella", svg: svg('<path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/>', true) },
  whatsapp: {
    label: "WhatsApp",
    svg: svg('<path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3Z"/>', true),
  },
};

// Estilos de relleno para textos
export type EstiloTexto = "solido" | "plata" | "oro" | "rojo" | "amarillo";
export const ESTILOS_TEXTO: Record<EstiloTexto, string> = {
  solido: "Color sólido",
  plata: "Metálico plata",
  oro: "Metálico oro",
  rojo: "Rojo brillante",
  amarillo: "Amarillo C&P",
};

const paradas: Record<Exclude<EstiloTexto, "solido">, [number, string][]> = {
  plata: [[0, "#ffffff"], [0.45, "#e9ebee"], [0.5, "#9aa0a8"], [0.62, "#d6d9de"], [1, "#7b8089"]],
  oro: [[0, "#fff6c9"], [0.45, "#f3cf63"], [0.5, "#b8860b"], [0.65, "#f0c75a"], [1, "#8a6410"]],
  rojo: [[0, "#ff6b6b"], [0.5, "#e01e1e"], [1, "#8f0b0b"]],
  amarillo: [[0, "#ffe27a"], [0.5, "#f5b800"], [1, "#c79500"]],
};

export function rellenoTexto(estilo: EstiloTexto, color = "#ffffff") {
  if (estilo === "solido") return color;
  return new Gradient({
    type: "linear",
    gradientUnits: "percentage",
    coords: { x1: 0, y1: 0, x2: 0, y2: 1 },
    colorStops: paradas[estilo].map(([offset, c]) => ({ offset, color: c })),
  });
}

export const sombra = (fuerza = 1) =>
  new Shadow({ color: "rgba(0,0,0,0.65)", blur: 18 * fuerza, offsetX: 0, offsetY: 6 * fuerza });

export const ROJO = "#e01e1e";
export const AMARILLO = "#f5b800";
export const ASFALTO = "#111214";
