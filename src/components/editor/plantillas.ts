// Constructores de elementos y plantillas. En Fabric 7 left/top son el CENTRO del objeto.
import { Circle, FabricImage, FabricObject, Gradient, Group, Polygon, Rect, Textbox, loadSVGFromString, util } from "fabric";
import { AMARILLO, ASFALTO, ICONOS, ROJO, rellenoTexto, sombra, type EstiloTexto } from "./recursos";

// Propiedades propias que se guardan con el diseño
FabricObject.customProperties = ["nombre", "estiloTexto", "colorBase"];

export type DatosNegocio = {
  nombre: string;
  telefonos: string[];
  direccion: string | null;
  horarios: { dia: string; franjas: string }[];
  fotos: string[];
};

type OpcTexto = {
  x: number;
  y: number;
  size: number;
  familia?: string;
  peso?: number | string;
  estilo?: EstiloTexto;
  color?: string;
  ancho?: number;
  align?: "left" | "center" | "right";
  espaciado?: number;
  conSombra?: boolean;
  angulo?: number;
  italica?: boolean;
  interlineado?: number;
  nombre?: string;
};

export function texto(t: string, o: OpcTexto) {
  const estilo = o.estilo ?? "solido";
  const color = o.color ?? "#ffffff";
  return new Textbox(t, {
    left: o.x,
    top: o.y,
    width: o.ancho ?? 900,
    fontSize: o.size,
    fontFamily: o.familia ?? "Montserrat",
    fontWeight: o.peso ?? 700,
    fontStyle: o.italica ? "italic" : "normal",
    fill: rellenoTexto(estilo, color),
    textAlign: o.align ?? "center",
    charSpacing: o.espaciado ?? 0,
    lineHeight: o.interlineado ?? 1.05,
    shadow: o.conSombra ? sombra(o.size > 80 ? 1 : 0.5) : null,
    angle: o.angulo ?? 0,
    nombre: o.nombre ?? "Texto",
    estiloTexto: estilo,
    colorBase: color,
  } as Partial<Textbox>);
}

export function rect(x: number, y: number, w: number, h: number, o: { fill?: string; rx?: number; degradado?: [string, string]; vertical?: boolean; nombre?: string; stroke?: string; strokeWidth?: number } = {}) {
  const fill = o.degradado
    ? new Gradient({
        type: "linear",
        gradientUnits: "percentage",
        coords: o.vertical === false ? { x1: 0, y1: 0, x2: 1, y2: 0 } : { x1: 0, y1: 0, x2: 0, y2: 1 },
        colorStops: [
          { offset: 0, color: o.degradado[0] },
          { offset: 1, color: o.degradado[1] },
        ],
      })
    : o.fill ?? "#ffffff";
  return new Rect({
    left: x,
    top: y,
    width: w,
    height: h,
    rx: o.rx ?? 0,
    ry: o.rx ?? 0,
    fill,
    stroke: o.stroke,
    strokeWidth: o.strokeWidth ?? 0,
    nombre: o.nombre ?? "Forma",
  } as Partial<Rect>);
}

/** Cinta inclinada (paralelogramo), centrada en x,y. */
export function cinta(x: number, y: number, w: number, h: number, color = ROJO, inclinacion = 0.25) {
  const d = h * inclinacion * 2;
  const p = new Polygon(
    [
      { x: d, y: 0 },
      { x: w, y: 0 },
      { x: w - d, y: h },
      { x: 0, y: h },
    ],
    { fill: color, nombre: "Cinta" } as Partial<Polygon>,
  );
  p.set({ left: x, top: y });
  return p;
}

export function circulo(x: number, y: number, r: number, o: { fill?: string; stroke?: string; strokeWidth?: number } = {}) {
  return new Circle({ left: x, top: y, radius: r, fill: o.fill ?? "transparent", stroke: o.stroke, strokeWidth: o.strokeWidth ?? 0, nombre: "Círculo" } as Partial<Circle>);
}

export async function icono(clave: string, x: number, y: number, size: number, color = "#ffffff") {
  const def = ICONOS[clave] ?? ICONOS.estrella;
  const { objects, options } = await loadSVGFromString(def.svg);
  const g = util.groupSVGElements(objects.filter((o): o is FabricObject => Boolean(o)), options);
  if (g instanceof Group) recolorear(g, color);
  else recolorear(g, color);
  g.scaleToWidth(size);
  g.set({ left: x, top: y, nombre: `Ícono ${def.label}` } as Partial<FabricObject>);
  return g;
}

export function recolorear(obj: FabricObject, color: string) {
  const aplicar = (o: FabricObject) => {
    if (o.fill && o.fill !== "none" && o.fill !== "transparent") o.set("fill", color);
    if (o.stroke && o.stroke !== "none") o.set("stroke", color);
  };
  if (obj instanceof Group) obj.getObjects().forEach(aplicar);
  else aplicar(obj);
  obj.set({ colorBase: color } as Partial<FabricObject>);
  obj.dirty = true;
}

/** Imagen que cubre un area (como object-fit: cover), centrada en x,y. */
export async function imagen(url: string, x: number, y: number, w: number, h: number, nombre = "Foto") {
  const img = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
  const escala = Math.max(w / (img.width || 1), h / (img.height || 1));
  img.set({ left: x, top: y, scaleX: escala, scaleY: escala, nombre } as Partial<FabricImage>);
  return img;
}

/** Imagen que entra en un ancho (logos). */
export async function imagenAncho(url: string, x: number, y: number, w: number, nombre = "Logo") {
  const img = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
  img.scaleToWidth(w);
  img.set({ left: x, top: y, nombre } as Partial<FabricImage>);
  return img;
}

/** Degradado oscuro a pantalla completa (arriba o abajo). */
export function sombreado(W: number, H: number, lado: "arriba" | "abajo", alto = 0.45, opacidad = 0.92) {
  const h = H * alto;
  const negro = `rgba(10,10,12,${opacidad})`;
  return rect(W / 2, lado === "arriba" ? h / 2 : H - h / 2, W, h, {
    degradado: lado === "arriba" ? [negro, "rgba(10,10,12,0)"] : ["rgba(10,10,12,0)", negro],
    nombre: `Sombra ${lado}`,
  });
}

const linea = (x: number, y: number, w: number, color = ROJO, h = 4) => rect(x, y, w, h, { fill: color, nombre: "Línea" });

// ======================= PLANTILLAS =======================
export type Plantilla = { id: string; nombre: string; descripcion: string; construir: (W: number, H: number, d: DatosNegocio) => Promise<FabricObject[]> };

const tel = (d: DatosNegocio, i = 0) => d.telefonos[i] ?? "099 000 000";
const foto = (d: DatosNegocio, i = 0) => d.fotos[i % Math.max(d.fotos.length, 1)];

async function bloqueMarca(W: number, y: number, s: number, d: DatosNegocio) {
  const corte = d.nombre.search(/\s&\s/);
  const [p1, p2] = corte > 0 ? [d.nombre.slice(0, corte).trim(), d.nombre.slice(corte + 3).trim()] : [d.nombre, ""];
  const objs: FabricObject[] = [
    texto(`${p1.toUpperCase()}${p2 ? " &" : ""}`, { x: W / 2, y, size: s * 0.055, familia: "Cinzel", peso: 700, estilo: "plata", ancho: W * 0.9, nombre: "Marca 1" }),
  ];
  if (p2) {
    const partes = p2.split(" ");
    const sigla = partes.length > 1 ? partes.pop()! : "";
    objs.push(texto(partes.join(" ").toUpperCase(), { x: W / 2, y: y + s * 0.065, size: s * 0.075, familia: "Cinzel", peso: 900, estilo: "plata", ancho: W * 0.95, nombre: "Marca 2" }));
    if (sigla) {
      objs.push(texto(sigla.toUpperCase(), { x: W / 2, y: y + s * 0.13, size: s * 0.05, familia: "Cinzel", peso: 900, estilo: "plata", ancho: W * 0.5, nombre: "Marca 3" }));
      objs.push(linea(W * 0.3, y + s * 0.13, W * 0.18), linea(W * 0.7, y + s * 0.13, W * 0.18));
    }
  }
  return objs;
}

export const PLANTILLAS: Plantilla[] = [
  {
    id: "nuevo-servicio",
    nombre: "Nuevo servicio",
    descripcion: "Foto de fondo, título metálico y 4 íconos (estilo afiche Alineación 3D)",
    async construir(W, H, d) {
      const s = Math.min(W, H / 1.5);
      const objs: FabricObject[] = [
        await imagen(foto(d, 1), W / 2, H / 2, W, H, "Foto de fondo"),
        sombreado(W, H, "arriba", 0.48),
        sombreado(W, H, "abajo", 0.5, 0.97),
        texto("CONTAMOS CON", { x: W / 2, y: H * 0.055, size: s * 0.04, peso: 400, espaciado: 500, ancho: W * 0.6 }),
        linea(W * 0.15, H * 0.055, W * 0.17, "#ffffff", 2),
        linea(W * 0.85, H * 0.055, W * 0.17, "#ffffff", 2),
        texto("Nuevo servicio de", { x: W / 2, y: H * 0.11, size: s * 0.11, familia: "Great Vibes", peso: 400, conSombra: true, nombre: "Manuscrita" }),
        texto("ALINEACIÓN", { x: W / 2, y: H * 0.19, size: s * 0.15, peso: 900, estilo: "plata", conSombra: true, ancho: W * 0.96, nombre: "Título" }),
        texto("3D", { x: W / 2, y: H * 0.265, size: s * 0.11, peso: 900, italica: true, estilo: "plata", conSombra: true, ancho: W * 0.3, nombre: "Subtítulo" }),
        linea(W * 0.3, H * 0.265, W * 0.2),
        linea(W * 0.7, H * 0.265, W * 0.2),
      ];
      const items: [string, string][] = [
        ["alineacion", "ALINEACIÓN\n3D"],
        ["cubierta", "BALANCEOS"],
        ["chequeo", "CHEQUEOS\nGENERALES"],
        ["cubierta", "TODAS LAS MEDIDAS\nDE CUBIERTAS"],
      ];
      const yI = H * 0.7;
      for (let i = 0; i < items.length; i++) {
        const cx = W * (0.125 + i * 0.25);
        objs.push(circulo(cx, yI, s * 0.055, { stroke: "#ffffff", strokeWidth: 2.5, fill: "rgba(0,0,0,0.25)" }));
        objs.push(await icono(items[i][0], cx, yI, s * 0.06));
        objs.push(texto(items[i][1], { x: cx, y: yI + s * 0.1, size: s * 0.024, peso: 600, ancho: W * 0.23, espaciado: 60, interlineado: 1.2 }));
        objs.push(linea(cx, yI + s * 0.15, W * 0.06, ROJO, 3));
        if (i > 0) objs.push(rect(W * i * 0.25, yI + s * 0.03, 2, s * 0.15, { fill: ROJO, nombre: "Separador" }));
      }
      objs.push(...(await bloqueMarca(W, H * 0.845, s, d)));
      objs.push(await icono("whatsapp", W * 0.32, H * 0.965, s * 0.045));
      objs.push(texto(tel(d), { x: W * 0.53, y: H * 0.965, size: s * 0.045, peso: 700, espaciado: 150, ancho: W * 0.4, nombre: "Teléfono" }));
      return objs;
    },
  },
  {
    id: "nuestros-servicios",
    nombre: "Nuestros servicios",
    descripcion: "Fondo oscuro con cintas rojas y lista de servicios (estilo afiche Servicios)",
    async construir(W, H, d) {
      const s = Math.min(W, H / 1.5);
      const objs: FabricObject[] = [
        rect(W / 2, H / 2, W, H, { fill: "#0b0b0c", nombre: "Fondo" }),
        await imagen(foto(d, 2), W * 0.75, H * 0.62, W * 0.7, H * 0.6, "Foto lateral"),
        rect(W * 0.75, H * 0.62, W * 0.7, H * 0.6, { fill: "rgba(0,0,0,0.45)", nombre: "Oscurecer foto" }),
        rect(W * 0.55, H * 0.62, W * 0.4, H * 0.6, { degradado: ["#0b0b0c", "rgba(11,11,12,0)"], vertical: false, nombre: "Fundido" }),
        rect(W / 2, H * 0.13, W * 0.96, H * 0.24, { fill: "rgba(0,0,0,0.85)", stroke: ROJO, strokeWidth: 3, rx: 8, nombre: "Encabezado" }),
        texto("GOMERÍA &", { x: W * 0.6, y: H * 0.05, size: s * 0.075, familia: "Cinzel", peso: 900, estilo: "plata", ancho: W * 0.7 }),
        texto("ALINEACIONES", { x: W * 0.6, y: H * 0.105, size: s * 0.085, familia: "Cinzel", peso: 900, estilo: "rojo", ancho: W * 0.75, conSombra: true }),
        texto("C&P", { x: W * 0.6, y: H * 0.155, size: s * 0.06, familia: "Cinzel", peso: 900, estilo: "plata", ancho: W * 0.4 }),
        await icono("cubierta", W * 0.15, H * 0.1, s * 0.2, "#d6d9de"),
        await icono("whatsapp", W * 0.08, H * 0.215, s * 0.04, "#ffffff"),
        texto(tel(d, 0), { x: W * 0.27, y: H * 0.215, size: s * 0.042, peso: 700, espaciado: 100, ancho: W * 0.33, nombre: "Teléfono 1" }),
      ];
      if (d.telefonos[1]) {
        objs.push(rect(W / 2, H * 0.215, 2, s * 0.05, { fill: ROJO, nombre: "Separador" }));
        objs.push(await icono("whatsapp", W * 0.56, H * 0.215, s * 0.04));
        objs.push(texto(tel(d, 1), { x: W * 0.75, y: H * 0.215, size: s * 0.042, peso: 700, espaciado: 100, ancho: W * 0.33, nombre: "Teléfono 2" }));
      }
      objs.push(texto("Nuestros", { x: W * 0.3, y: H * 0.3, size: s * 0.1, familia: "Kaushan Script", peso: 400, angulo: -6, ancho: W * 0.55, conSombra: true }));
      objs.push(texto("SERVICIOS", { x: W * 0.34, y: H * 0.37, size: s * 0.11, familia: "Kaushan Script", peso: 400, color: ROJO, angulo: -6, ancho: W * 0.65, conSombra: true }));
      const servicios: [string, string][] = [
        ["alineacion", "ALINEACIONES"],
        ["pila", "CUBIERTAS NUEVAS"],
        ["pila", "CUBIERTAS DE OCASIÓN"],
        ["llave", "MECÁNICA LIGERA"],
      ];
      for (let i = 0; i < servicios.length; i++) {
        const y = H * (0.48 + i * 0.085);
        objs.push(cinta(W * 0.37, y, W * 0.56, s * 0.075, ROJO, 0.3));
        objs.push(circulo(W * 0.1, y, s * 0.05, { fill: "#141416", stroke: ROJO, strokeWidth: 4 }));
        objs.push(await icono(servicios[i][0], W * 0.1, y, s * 0.055));
        const t = texto(servicios[i][1], { x: 0, y, size: s * 0.034, peso: 800, ancho: W * 0.47, align: "left", conSombra: true, nombre: `Servicio ${i + 1}` });
        t.set({ left: W * 0.17 + W * 0.235 });
        objs.push(t);
      }
      objs.push(texto("Tu vehículo\nen buenas\nmanos", { x: W * 0.8, y: H * 0.78, size: s * 0.055, familia: "Kaushan Script", peso: 400, color: ROJO, angulo: -10, ancho: W * 0.4, conSombra: true, interlineado: 0.95 }));
      objs.push(cinta(W * 0.72, H * 0.9, W * 0.52, s * 0.12, "rgba(0,0,0,0.85)", 0.1));
      objs.push(await icono("factura", W * 0.53, H * 0.9, s * 0.07));
      objs.push(texto("TAMBIÉN CONTAMOS CON", { x: W * 0.77, y: H * 0.88, size: s * 0.022, peso: 700, ancho: W * 0.4 }));
      objs.push(texto("FACTURACIÓN", { x: W * 0.77, y: H * 0.915, size: s * 0.05, familia: "Kaushan Script", peso: 400, color: ROJO, ancho: W * 0.42 }));
      for (let i = 0; i < 24; i++) {
        objs.push(rect(W * (i + 0.5) / 24, H - s * 0.02, W / 24, s * 0.04, { fill: i % 2 ? "#0b0b0c" : ROJO, nombre: "Cuadros" }));
      }
      return objs;
    },
  },
  {
    id: "promo",
    nombre: "Promoción",
    descripcion: "Foto, cinta PROMO, servicio y precio grande",
    async construir(W, H, d) {
      const s = Math.min(W, H);
      return [
        await imagen(foto(d, 0), W / 2, H / 2, W, H, "Foto de fondo"),
        rect(W / 2, H / 2, W, H, { fill: "rgba(10,10,12,0.45)", nombre: "Oscurecer" }),
        sombreado(W, H, "abajo", 0.55),
        cinta(W * 0.28, H * 0.09, W * 0.5, s * 0.1, ROJO, 0.3),
        texto("PROMO", { x: W * 0.28, y: H * 0.09, size: s * 0.07, familia: "Anton", peso: 400, espaciado: 200, ancho: W * 0.45 }),
        texto("ALINEACIÓN + BALANCEO", { x: W / 2, y: H * 0.58, size: s * 0.085, familia: "Anton", peso: 400, conSombra: true, ancho: W * 0.92, nombre: "Servicio" }),
        texto("$ 0.000", { x: W / 2, y: H * 0.71, size: s * 0.2, familia: "Anton", peso: 400, estilo: "amarillo", conSombra: true, ancho: W * 0.9, nombre: "Precio" }),
        texto("Reservá tu turno online o por WhatsApp", { x: W / 2, y: H * 0.81, size: s * 0.035, peso: 600, ancho: W * 0.85 }),
        rect(W / 2, H - s * 0.065, W, s * 0.13, { fill: "#0b0b0c", nombre: "Franja inferior" }),
        rect(W / 2, H - s * 0.13, W, 6, { fill: AMARILLO, nombre: "Línea" }),
        await imagenAncho("/fotos/logo.webp", W * 0.11, H - s * 0.065, s * 0.14),
        await icono("whatsapp", W * 0.55, H - s * 0.065, s * 0.05, "#25d366"),
        texto(tel(d), { x: W * 0.76, y: H - s * 0.065, size: s * 0.045, peso: 700, ancho: W * 0.38, nombre: "Teléfono" }),
      ];
    },
  },
  {
    id: "foto-titulo",
    nombre: "Foto + título",
    descripcion: "Foto protagonista con título grande abajo",
    async construir(W, H, d) {
      const s = Math.min(W, H);
      return [
        await imagen(foto(d, 3), W / 2, H / 2, W, H, "Foto de fondo"),
        sombreado(W, H, "abajo", 0.55, 0.95),
        rect(W * 0.1, H * 0.72, W * 0.12, 10, { fill: AMARILLO, nombre: "Línea" }),
        texto("TU VEHÍCULO EN BUENAS MANOS", { x: W / 2, y: H * 0.8, size: s * 0.1, familia: "Anton", peso: 400, align: "left", ancho: W * 0.84, conSombra: true, nombre: "Título" }),
        texto("Gomería · Alineación 3D · Balanceo · Mecánica ligera", { x: W / 2, y: H * 0.9, size: s * 0.033, peso: 500, align: "left", ancho: W * 0.84, nombre: "Bajada" }),
        await imagenAncho("/fotos/logo.webp", W * 0.86, H * 0.08, s * 0.16),
      ];
    },
  },
  {
    id: "horarios",
    nombre: "Horarios",
    descripcion: "Días y horarios de atención (ideal historia)",
    async construir(W, H, d) {
      const s = Math.min(W, H / 1.6);
      const objs: FabricObject[] = [
        rect(W / 2, H / 2, W, H, { fill: ASFALTO, nombre: "Fondo" }),
        await imagen(foto(d, 0), W / 2, H * 0.2, W, H * 0.4, "Foto superior"),
        rect(W / 2, H * 0.3, W, H * 0.2, { degradado: ["rgba(17,18,20,0)", ASFALTO], nombre: "Fundido" }),
        await icono("reloj", W / 2, H * 0.33, s * 0.12, AMARILLO),
        texto("HORARIOS", { x: W / 2, y: H * 0.42, size: s * 0.15, familia: "Bebas Neue", peso: 400, estilo: "plata", espaciado: 150, conSombra: true, nombre: "Título" }),
      ];
      const lista = d.horarios.length ? d.horarios : [{ dia: "Lunes a viernes", franjas: "08:30 a 12:30 y 14:30 a 19:00" }];
      lista.forEach((h, i) => {
        const y = H * (0.51 + i * 0.055);
        objs.push(texto(h.dia.toUpperCase(), { x: W * 0.3, y, size: s * 0.04, peso: 800, ancho: W * 0.4, align: "left", color: AMARILLO, nombre: `Día ${i + 1}` }));
        objs.push(texto(h.franjas, { x: W * 0.66, y, size: s * 0.036, peso: 500, ancho: W * 0.56, align: "right", nombre: `Horario ${i + 1}` }));
      });
      objs.push(...(await bloqueMarca(W, H * 0.82, s, d)));
      if (d.direccion) objs.push(texto(d.direccion, { x: W / 2, y: H * 0.96, size: s * 0.032, peso: 500, ancho: W * 0.9, nombre: "Dirección" }));
      return objs;
    },
  },
  {
    id: "aviso",
    nombre: "Aviso",
    descripcion: "Texto grande para avisos (feriados, novedades)",
    async construir(W, H, d) {
      const s = Math.min(W, H);
      return [
        rect(W / 2, H / 2, W, H, { degradado: ["#1b1c1f", "#0b0b0c"], nombre: "Fondo" }),
        cinta(W / 2, H * 0.18, W * 1.2, s * 0.06, ROJO, 0.5),
        cinta(W / 2, H * 0.82, W * 1.2, s * 0.06, ROJO, 0.5),
        texto("AVISO", { x: W / 2, y: H * 0.3, size: s * 0.07, familia: "Montserrat", peso: 900, espaciado: 600, color: AMARILLO }),
        texto("CERRADO POR FERIADO", { x: W / 2, y: H * 0.48, size: s * 0.13, familia: "Anton", peso: 400, ancho: W * 0.9, estilo: "plata", conSombra: true, nombre: "Título" }),
        texto("Lunes 1 de enero", { x: W / 2, y: H * 0.63, size: s * 0.05, peso: 600, ancho: W * 0.85, nombre: "Detalle" }),
        texto(d.nombre, { x: W / 2, y: H * 0.92, size: s * 0.035, familia: "Cinzel", peso: 700, ancho: W * 0.9, estilo: "plata" }),
      ];
    },
  },
  {
    id: "blanco",
    nombre: "En blanco",
    descripcion: "Empezar desde cero",
    async construir(W, H) {
      return [rect(W / 2, H / 2, W, H, { fill: ASFALTO, nombre: "Fondo" })];
    },
  },
];
