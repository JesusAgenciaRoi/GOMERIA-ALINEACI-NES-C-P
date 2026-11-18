// Contenido editable del landing. Fotos propias del local en /public/fotos.
export type Slide = { src: string; alt: string; etiqueta: string; titulo: string; texto: string };

export const SLIDES: Slide[] = [
  {
    src: "/fotos/frente-cartel.webp",
    alt: "Frente de Gomería & Alineaciones C&P con su cartel",
    etiqueta: "Gomería & Alineaciones C&P",
    titulo: "Tu vehículo en buenas manos",
    texto: "Alineación 3D, balanceo, cubiertas nuevas y de ocasión, y mecánica ligera.",
  },
  {
    src: "/fotos/interior-elevador.webp",
    alt: "Interior del taller con elevador y cubiertas",
    etiqueta: "Nuevo servicio",
    titulo: "Alineación 3D",
    texto: "Alineación computarizada 3D para autos y camionetas. Tu vehículo derecho y seguro.",
  },
  {
    src: "/fotos/interior-cubiertas.webp",
    alt: "Estanterías con cubiertas nuevas en el local",
    etiqueta: "Cubiertas",
    titulo: "Nuevas y de ocasión",
    texto: "Servicio para todas las medidas de cubiertas. Te asesoramos para elegir la justa.",
  },
  {
    src: "/fotos/frente-ancho.webp",
    alt: "Vista del local desde la calle",
    etiqueta: "Turnos online",
    titulo: "Reservá y no esperes",
    texto: "Elegí el día y el horario desde el celular. También contamos con facturación.",
  },
];

export const GALERIA = [
  { src: "/fotos/interior-elevador.webp", alt: "Elevador y zona de trabajo" },
  { src: "/fotos/interior-cubiertas.webp", alt: "Cubiertas nuevas de varias marcas" },
  { src: "/fotos/interior-goodyear.webp", alt: "Exhibidor de cubiertas" },
  { src: "/fotos/frente-cartel.webp", alt: "Nuestro local" },
  { src: "/fotos/frente-ancho.webp", alt: "Entrada al taller" },
];

export const FOLLETOS = [
  { src: "/fotos/folleto-alineacion-3d.webp", alt: "Nuevo servicio de Alineación 3D: alineación 3D, balanceos, chequeos generales y servicio para todas las medidas de cubiertas" },
  { src: "/fotos/folleto-servicios.webp", alt: "Nuestros servicios: alineaciones, cubiertas nuevas, cubiertas de ocasión y mecánica ligera. También contamos con facturación" },
];

export const LOGO = "/fotos/logo.webp";
export const PARALLAX = "/fotos/interior-elevador.webp";

export const BENEFICIOS = [
  { titulo: "Alineación 3D", texto: "Equipo computarizado 3D para una alineación precisa." },
  { titulo: "Todas las medidas", texto: "Cubiertas nuevas y de ocasión para autos y camionetas." },
  { titulo: "Mecánica ligera", texto: "Chequeos generales y reparaciones menores en el mismo lugar." },
  { titulo: "Facturación", texto: "Emitimos factura para empresas y particulares." },
];

export const PASOS = [
  { titulo: "Reservá", texto: "Elegí servicio, día y horario desde la web." },
  { titulo: "Confirmamos", texto: "Te escribimos por WhatsApp con el turno." },
  { titulo: "Traé el vehículo", texto: "Te atendemos a la hora, sin esperas largas." },
  { titulo: "Listo", texto: "Te vas con el vehículo derecho y las cubiertas en orden." },
];
