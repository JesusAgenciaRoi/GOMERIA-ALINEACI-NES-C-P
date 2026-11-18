"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ActiveSelection, Canvas, FabricImage, FabricObject, Group, Textbox } from "fabric";
import { createClient } from "@/lib/supabase/client";
import { AMARILLO, ESTILOS_TEXTO, FORMATOS, FUENTES, ICONOS, ROJO, URL_FUENTES, cargarFuentes, rellenoTexto, sombra, type EstiloTexto, type Formato } from "./recursos";
import { PLANTILLAS, cinta, circulo, icono, imagen, imagenAncho, recolorear, rect, sombreado, texto, type DatosNegocio } from "./plantillas";

export type DisenoInicial = {
  id: string | null;
  titulo: string;
  formato: string;
  datos: unknown;
  estado: string;
  fecha_publicacion: string | null;
  redes: string[];
  texto_publicacion: string | null;
} | null;

const REDES = ["Instagram", "Facebook", "Estado de WhatsApp", "TikTok"];
const ESTADOS: Record<string, string> = { borrador: "Borrador", listo: "Listo para publicar", programado: "Programado", publicado: "Publicado" };
type Pestana = "plantillas" | "fotos" | "texto" | "elementos" | "iconos";

const PRESETS_TEXTO = [
  { label: "Título metálico", o: { size: 130, familia: "Montserrat", peso: 900, estilo: "plata" as EstiloTexto, conSombra: true }, t: "TÍTULO" },
  { label: "Título impacto", o: { size: 120, familia: "Anton", peso: 400, conSombra: true }, t: "GRAN TÍTULO" },
  { label: "Manuscrita", o: { size: 110, familia: "Great Vibes", peso: 400, conSombra: true }, t: "Nuevo servicio" },
  { label: "Pincel rojo", o: { size: 100, familia: "Kaushan Script", peso: 400, color: ROJO, conSombra: true }, t: "Servicios" },
  { label: "Subtítulo espaciado", o: { size: 42, familia: "Montserrat", peso: 400, espaciado: 500 }, t: "CONTAMOS CON" },
  { label: "Texto común", o: { size: 44, familia: "Roboto", peso: 400 }, t: "Escribí acá tu texto" },
  { label: "Precio amarillo", o: { size: 180, familia: "Anton", peso: 400, estilo: "amarillo" as EstiloTexto, conSombra: true }, t: "$ 0.000" },
];

export default function Editor({ diseno, negocio, fotosLocal, fotosSubidas }: { diseno: DisenoInicial; negocio: DatosNegocio; fotosLocal: string[]; fotosSubidas: string[] }) {
  const router = useRouter();
  const elCanvas = useRef<HTMLCanvasElement>(null);
  const contenedor = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<Canvas | null>(null);
  const zoomRef = useRef(1);
  const historial = useRef<string[]>([]);
  const posHistorial = useRef(-1);
  const restaurando = useRef(false);
  const timerHist = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [formato, setFormato] = useState<Formato>((diseno?.formato as Formato) ?? "afiche");
  const [titulo, setTitulo] = useState(diseno?.titulo ?? "Nuevo diseño");
  const [id, setId] = useState<string | null>(diseno?.id ?? null);
  const [estado, setEstado] = useState(diseno?.estado ?? "borrador");
  const [fecha, setFecha] = useState(diseno?.fecha_publicacion ?? "");
  const [redes, setRedes] = useState<string[]>(diseno?.redes ?? []);
  const [caption, setCaption] = useState(diseno?.texto_publicacion ?? "");
  const [pestana, setPestana] = useState<Pestana>(diseno ? "texto" : "plantillas");
  const [sel, setSel] = useState<FabricObject | null>(null);
  const [, setTick] = useState(0);
  const [listo, setListo] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [fotos, setFotos] = useState<string[]>(fotosSubidas);
  const [puedeDeshacer, setPuedeDeshacer] = useState(false);
  const [puedeRehacer, setPuedeRehacer] = useState(false);

  const { ancho: W, alto: H } = FORMATOS[formato];
  const refrescar = useCallback(() => setTick((t) => t + 1), []);

  const actualizarBotonesHistorial = () => {
    setPuedeDeshacer(posHistorial.current > 0);
    setPuedeRehacer(posHistorial.current < historial.current.length - 1);
  };

  const guardarHistorial = useCallback(() => {
    const c = canvasRef.current;
    if (!c || restaurando.current) return;
    if (timerHist.current) clearTimeout(timerHist.current);
    timerHist.current = setTimeout(() => {
      const json = JSON.stringify(c.toJSON());
      if (historial.current[posHistorial.current] === json) return;
      historial.current = historial.current.slice(0, posHistorial.current + 1);
      historial.current.push(json);
      if (historial.current.length > 60) historial.current.shift();
      posHistorial.current = historial.current.length - 1;
      actualizarBotonesHistorial();
    }, 250);
  }, []);

  const ajustar = useCallback(() => {
    const c = canvasRef.current;
    const box = contenedor.current;
    if (!c || !box) return;
    const { ancho, alto } = FORMATOS[formato];
    const z = Math.min((box.clientWidth - 24) / ancho, (box.clientHeight - 24) / alto, 1);
    zoomRef.current = z;
    c.setDimensions({ width: Math.round(ancho * z), height: Math.round(alto * z) });
    c.setZoom(z);
    c.requestRenderAll();
  }, [formato]);

  // Inicializacion del lienzo
  useEffect(() => {
    if (!elCanvas.current) return;
    const c = new Canvas(elCanvas.current, { backgroundColor: "#111214", preserveObjectStacking: true, selectionColor: "rgba(245,184,0,0.12)", selectionBorderColor: AMARILLO });
    canvasRef.current = c;
    FabricObject.ownDefaults.borderColor = AMARILLO;
    FabricObject.ownDefaults.cornerColor = AMARILLO;
    FabricObject.ownDefaults.cornerStrokeColor = "#111214";
    FabricObject.ownDefaults.transparentCorners = false;
    FabricObject.ownDefaults.cornerSize = 14;

    const alSeleccionar = () => setSel(c.getActiveObject() ?? null);
    c.on("selection:created", alSeleccionar);
    c.on("selection:updated", alSeleccionar);
    c.on("selection:cleared", () => setSel(null));
    c.on("object:modified", () => { guardarHistorial(); refrescar(); });
    c.on("object:added", guardarHistorial);
    c.on("object:removed", guardarHistorial);
    c.on("text:changed", () => { guardarHistorial(); refrescar(); });

    let cancelado = false;
    cargarFuentes().then(async () => {
      if (cancelado) return;
      if (diseno?.datos && typeof diseno.datos === "object" && Array.isArray((diseno.datos as { objects?: unknown[] }).objects)) {
        restaurando.current = true;
        await c.loadFromJSON(diseno.datos as Record<string, unknown>);
        restaurando.current = false;
      }
      ajustar();
      c.requestRenderAll();
      historial.current = [JSON.stringify(c.toJSON())];
      posHistorial.current = 0;
      setListo(true);
    });
    return () => {
      cancelado = true;
      c.dispose();
      canvasRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    ajustar();
    const box = contenedor.current;
    if (!box) return;
    const ro = new ResizeObserver(() => ajustar());
    ro.observe(box);
    return () => ro.disconnect();
  }, [ajustar]);

  // Teclado: borrar, deshacer, duplicar
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const c = canvasRef.current;
      const t = e.target as HTMLElement;
      if (!c || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      const activo = c.getActiveObject();
      if (activo instanceof Textbox && activo.isEditing) return;
      if ((e.key === "Delete" || e.key === "Backspace") && activo) {
        e.preventDefault();
        eliminar();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) rehacer();
        else deshacer();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && activo) {
        e.preventDefault();
        duplicar();
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  const c = () => canvasRef.current!;

  async function restaurar(json: string) {
    restaurando.current = true;
    await c().loadFromJSON(JSON.parse(json));
    restaurando.current = false;
    c().requestRenderAll();
    setSel(null);
    actualizarBotonesHistorial();
  }
  function deshacer() {
    if (posHistorial.current <= 0) return;
    posHistorial.current -= 1;
    restaurar(historial.current[posHistorial.current]);
  }
  function rehacer() {
    if (posHistorial.current >= historial.current.length - 1) return;
    posHistorial.current += 1;
    restaurar(historial.current[posHistorial.current]);
  }

  function agregar(...objs: FabricObject[]) {
    c().add(...objs);
    if (objs.length === 1) c().setActiveObject(objs[0]);
    c().requestRenderAll();
  }

  async function aplicarPlantilla(idPlantilla: string) {
    const p = PLANTILLAS.find((x) => x.id === idPlantilla);
    if (!p) return;
    if (c().getObjects().length > 1 && !window.confirm("Esto reemplaza el diseño actual. ¿Seguimos?")) return;
    setOcupado("Armando plantilla...");
    try {
      const objs = await p.construir(W, H, negocio);
      restaurando.current = true;
      c().clear();
      c().backgroundColor = "#111214";
      c().add(...objs);
      restaurando.current = false;
      c().discardActiveObject();
      c().requestRenderAll();
      guardarHistorial();
      setPestana("texto");
    } catch (e) {
      restaurando.current = false;
      setAviso({ tipo: "error", texto: `No se pudo armar la plantilla: ${(e as Error).message}` });
    } finally {
      setOcupado(null);
    }
  }

  async function usarFoto(url: string, modo: "fondo" | "agregar" | "reemplazar") {
    setOcupado("Cargando foto...");
    try {
      const activo = c().getActiveObject();
      if (modo === "reemplazar" && activo instanceof FabricImage) {
        const w = activo.getScaledWidth();
        const h = activo.getScaledHeight();
        await activo.setSrc(url, { crossOrigin: "anonymous" });
        const esc = Math.max(w / (activo.width || 1), h / (activo.height || 1));
        activo.set({ scaleX: esc, scaleY: esc });
        activo.setCoords();
        c().requestRenderAll();
        guardarHistorial();
      } else if (modo === "fondo") {
        const img = await imagen(url, W / 2, H / 2, W, H, "Foto de fondo");
        c().add(img);
        c().sendObjectToBack(img);
        c().setActiveObject(img);
        c().requestRenderAll();
      } else {
        const img = await imagen(url, W / 2, H / 2, W * 0.6, H * 0.4, "Foto");
        const esc = Math.min((W * 0.6) / (img.width || 1), (H * 0.6) / (img.height || 1));
        img.set({ scaleX: esc, scaleY: esc });
        agregar(img);
      }
    } catch {
      setAviso({ tipo: "error", texto: "No se pudo cargar la foto." });
    } finally {
      setOcupado(null);
    }
  }

  async function subirFoto(archivo: File) {
    if (!archivo.type.startsWith("image/")) return setAviso({ tipo: "error", texto: "El archivo tiene que ser una imagen." });
    if (archivo.size > 15 * 1024 * 1024) return setAviso({ tipo: "error", texto: "La imagen supera los 15 MB." });
    setOcupado("Subiendo foto...");
    const supabase = createClient();
    const ext = (archivo.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const ruta = `fotos/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("contenidos").upload(ruta, archivo, { contentType: archivo.type });
    setOcupado(null);
    if (error) return setAviso({ tipo: "error", texto: `No se pudo subir: ${error.message}` });
    const url = supabase.storage.from("contenidos").getPublicUrl(ruta).data.publicUrl;
    setFotos((f) => [url, ...f]);
    const hayFondo = c().getObjects().some((o) => (o as FabricObject & { nombre?: string }).nombre?.startsWith("Foto"));
    await usarFoto(url, c().getActiveObject() instanceof FabricImage ? "reemplazar" : hayFondo ? "agregar" : "fondo");
  }

  // ===== Acciones sobre la seleccion =====
  function setProp(props: Record<string, unknown>) {
    const o = c().getActiveObject();
    if (!o) return;
    const objetos = o instanceof ActiveSelection ? o.getObjects() : [o];
    objetos.forEach((x) => x.set(props));
    o.setCoords();
    c().requestRenderAll();
    guardarHistorial();
    refrescar();
  }
  function setEstiloTexto(estilo: EstiloTexto, color?: string) {
    const o = c().getActiveObject();
    if (!(o instanceof Textbox)) return;
    const base = color ?? ((o as Textbox & { colorBase?: string }).colorBase || "#ffffff");
    o.set({ fill: rellenoTexto(estilo, base), estiloTexto: estilo, colorBase: base } as Partial<Textbox>);
    c().requestRenderAll();
    guardarHistorial();
    refrescar();
  }
  function eliminar() {
    const o = c().getActiveObject();
    if (!o) return;
    const objetos = o instanceof ActiveSelection ? o.getObjects() : [o];
    c().discardActiveObject();
    objetos.forEach((x) => c().remove(x));
    c().requestRenderAll();
  }
  async function duplicar() {
    const o = c().getActiveObject();
    if (!o || o instanceof ActiveSelection) return;
    const copia = await o.clone();
    copia.set({ left: (o.left ?? 0) + 30, top: (o.top ?? 0) + 30 });
    agregar(copia);
  }
  function capa(accion: "arriba" | "abajo" | "frente" | "fondo") {
    const o = c().getActiveObject();
    if (!o) return;
    if (accion === "arriba") c().bringObjectForward(o);
    if (accion === "abajo") c().sendObjectBackwards(o);
    if (accion === "frente") c().bringObjectToFront(o);
    if (accion === "fondo") c().sendObjectToBack(o);
    c().requestRenderAll();
    guardarHistorial();
  }
  function bloquear() {
    const o = c().getActiveObject();
    if (!o) return;
    o.set({ selectable: false, evented: false });
    c().discardActiveObject();
    c().requestRenderAll();
    guardarHistorial();
    setAviso({ tipo: "ok", texto: "Elemento fijado. Para editarlo de nuevo usá “Desbloquear todo”." });
  }
  function desbloquearTodo() {
    c().getObjects().forEach((o) => o.set({ selectable: true, evented: true }));
    c().requestRenderAll();
    guardarHistorial();
  }
  function centrar(eje: "h" | "v") {
    const o = c().getActiveObject();
    if (!o) return;
    if (eje === "h") o.set({ left: W / 2 });
    else o.set({ top: H / 2 });
    o.setCoords();
    c().requestRenderAll();
    guardarHistorial();
  }

  // ===== Guardar y descargar =====
  function exportar(formatoImg: "png" | "jpeg", anchoFinal: number = W) {
    c().discardActiveObject();
    c().requestRenderAll();
    return c().toDataURL({ format: formatoImg, quality: 0.92, multiplier: anchoFinal / W / zoomRef.current });
  }
  function descargar(formatoImg: "png" | "jpeg") {
    const url = exportar(formatoImg);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${titulo.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "diseno"}.${formatoImg === "png" ? "png" : "jpg"}`;
    a.click();
  }
  async function guardar() {
    setOcupado("Guardando...");
    const supabase = createClient();
    const datos = c().toJSON();
    const fila = {
      titulo: titulo.trim() || "Sin título",
      formato,
      ancho: W,
      alto: H,
      datos,
      estado,
      fecha_publicacion: fecha || null,
      redes,
      texto_publicacion: caption.trim() || null,
    };
    let idActual = id;
    if (idActual) {
      const { error } = await supabase.from("disenos").update(fila).eq("id", idActual);
      if (error) { setOcupado(null); return setAviso({ tipo: "error", texto: error.message }); }
    } else {
      const { data, error } = await supabase.from("disenos").insert(fila).select("id").single();
      if (error) { setOcupado(null); return setAviso({ tipo: "error", texto: error.message }); }
      idActual = data.id;
      setId(data.id);
    }
    const blob = await (await fetch(exportar("jpeg", 600))).blob();
    const ruta = `previews/${idActual}.jpg`;
    const { error: eUp } = await supabase.storage.from("contenidos").upload(ruta, blob, { contentType: "image/jpeg", upsert: true });
    if (!eUp) await supabase.from("disenos").update({ preview_path: ruta }).eq("id", idActual!);
    setOcupado(null);
    setAviso({ tipo: "ok", texto: "Diseño guardado." });
    if (!id) router.replace(`/panel/contenidos/editor?id=${idActual}`);
    router.refresh();
  }

  // ===== Panel de propiedades =====
  const o = sel;
  const esTexto = o instanceof Textbox;
  const esImagen = o instanceof FabricImage;
  const esGrupo = o instanceof Group && !(o instanceof ActiveSelection);
  const esMulti = o instanceof ActiveSelection;
  const tx = o as (Textbox & { estiloTexto?: EstiloTexto; colorBase?: string; nombre?: string }) | null;
  const colorSolido = (v: unknown) => (typeof v === "string" && v.startsWith("#") ? v : "#ffffff");

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] min-h-[640px] -mx-4 -my-6 sm:-mx-6 lg:-mx-8">
      <link rel="stylesheet" href={URL_FUENTES} precedence="default" />

      {/* Barra superior */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-superficie border-b border-borde">
        <a href="/panel/contenidos" className="text-sm text-suave hover:text-texto">&larr; Contenidos</a>
        <input className="input w-56 font-semibold" value={titulo} onChange={(e) => setTitulo(e.target.value)} aria-label="Nombre del diseño" />
        <select className="input w-auto" value={formato} onChange={(e) => setFormato(e.target.value as Formato)} aria-label="Formato">
          {Object.entries(FORMATOS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
        </select>
        <div className="flex gap-1">
          <button className="btn btn-chico btn-secundario" onClick={deshacer} disabled={!puedeDeshacer} title="Deshacer (Ctrl+Z)">Deshacer</button>
          <button className="btn btn-chico btn-secundario" onClick={rehacer} disabled={!puedeRehacer} title="Rehacer (Ctrl+Shift+Z)">Rehacer</button>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button className="btn btn-chico btn-secundario" onClick={() => descargar("png")}>Descargar PNG</button>
          <button className="btn btn-chico btn-secundario" onClick={() => descargar("jpeg")}>Descargar JPG</button>
          <button className="btn btn-chico btn-primario" onClick={guardar} disabled={!!ocupado}>Guardar</button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Panel izquierdo */}
        <aside className="w-72 shrink-0 bg-superficie border-r border-borde flex flex-col min-h-0">
          <div className="grid grid-cols-5 border-b border-borde text-[0.7rem] font-semibold">
            {([["plantillas", "Plantillas"], ["fotos", "Fotos"], ["texto", "Texto"], ["elementos", "Formas"], ["iconos", "Íconos"]] as [Pestana, string][]).map(([k, l]) => (
              <button key={k} onClick={() => setPestana(k)} className={`py-2.5 ${pestana === k ? "bg-asfalto text-white" : "text-suave hover:bg-fondo"}`}>{l}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {pestana === "plantillas" && PLANTILLAS.map((p) => (
              <button key={p.id} onClick={() => aplicarPlantilla(p.id)} disabled={!listo || !!ocupado} className="w-full text-left rounded-lg border border-borde p-3 hover:border-senal hover:bg-senal/5">
                <div className="font-semibold">{p.nombre}</div>
                <div className="text-xs text-suave">{p.descripcion}</div>
              </button>
            ))}

            {pestana === "fotos" && (
              <>
                <label className="btn btn-primario w-full cursor-pointer">
                  Subir foto
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) subirFoto(f); e.target.value = ""; }} />
                </label>
                <p className="text-xs text-suave">Tocá una foto para usarla. Si hay una foto seleccionada en el diseño, la reemplaza.</p>
                <div className="grid grid-cols-2 gap-2">
                  {[...fotos, ...fotosLocal].map((url) => (
                    <div key={url} className="group relative aspect-square rounded-md overflow-hidden border border-borde">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" crossOrigin="anonymous" />
                      <div className="absolute inset-0 flex flex-col justify-end gap-1 p-1 bg-black/55 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        {esImagen && <button className="btn btn-chico btn-primario" onClick={() => usarFoto(url, "reemplazar")}>Reemplazar</button>}
                        <button className="btn btn-chico btn-secundario" onClick={() => usarFoto(url, "fondo")}>De fondo</button>
                        <button className="btn btn-chico btn-secundario" onClick={() => usarFoto(url, "agregar")}>Agregar</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {pestana === "texto" && PRESETS_TEXTO.map((p) => (
              <button
                key={p.label}
                onClick={() => agregar(texto(p.t, { ...p.o, x: W / 2, y: H / 2, ancho: W * 0.85, nombre: p.label }))}
                className="w-full text-left rounded-lg border border-borde p-3 hover:border-senal bg-asfalto text-white"
                style={{ fontFamily: `"${p.o.familia}"`, fontWeight: p.o.peso as number }}
              >
                <span className={p.o.familia === "Great Vibes" || p.o.familia === "Kaushan Script" ? "text-2xl" : "text-lg"} style={{ color: p.o.color ?? (p.o.estilo === "amarillo" ? AMARILLO : undefined) }}>{p.label}</span>
              </button>
            ))}

            {pestana === "elementos" && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Cinta roja", () => cinta(W / 2, H / 2, W * 0.6, 90, ROJO)],
                  ["Cinta amarilla", () => cinta(W / 2, H / 2, W * 0.6, 90, AMARILLO)],
                  ["Rectángulo", () => rect(W / 2, H / 2, W * 0.5, 200, { fill: "#111214", rx: 12 })],
                  ["Caja con borde", () => rect(W / 2, H / 2, W * 0.6, 220, { fill: "rgba(0,0,0,0.6)", stroke: ROJO, strokeWidth: 4, rx: 10 })],
                  ["Círculo", () => circulo(W / 2, H / 2, 80, { fill: "#141416", stroke: ROJO, strokeWidth: 5 })],
                  ["Línea roja", () => rect(W / 2, H / 2, W * 0.3, 5, { fill: ROJO })],
                  ["Línea blanca", () => rect(W / 2, H / 2, W * 0.3, 3, { fill: "#ffffff" })],
                  ["Sombra abajo", () => sombreado(W, H, "abajo")],
                  ["Sombra arriba", () => sombreado(W, H, "arriba")],
                  ["Oscurecer todo", () => rect(W / 2, H / 2, W, H, { fill: "rgba(0,0,0,0.45)", nombre: "Oscurecer" })],
                ].map(([l, f]) => (
                  <button key={l as string} className="rounded-lg border border-borde p-2.5 hover:border-senal" onClick={() => agregar((f as () => FabricObject)())}>{l as string}</button>
                ))}
                <button className="rounded-lg border border-borde p-2.5 hover:border-senal" onClick={async () => agregar(await imagenAncho("/fotos/logo.webp", W / 2, H / 2, W * 0.3))}>Logo CYP</button>
                <button
                  className="rounded-lg border border-borde p-2.5 hover:border-senal"
                  onClick={async () => {
                    const ic = await icono("whatsapp", W * 0.3, H * 0.9, 60, "#25d366");
                    const t = texto(negocio.telefonos[0] ?? "099 000 000", { x: W * 0.55, y: H * 0.9, size: 50, peso: 700, ancho: W * 0.45, nombre: "Teléfono" });
                    agregar(ic, t);
                  }}
                >
                  WhatsApp + tel.
                </button>
                <button className="col-span-2 rounded-lg border border-dashed border-borde p-2.5 text-suave hover:border-senal" onClick={desbloquearTodo}>Desbloquear todo</button>
              </div>
            )}

            {pestana === "iconos" && (
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(ICONOS).map(([k, i]) => (
                  <button key={k} className="rounded-lg bg-asfalto p-2 hover:ring-2 hover:ring-senal text-white text-[0.65rem]" onClick={async () => agregar(await icono(k, W / 2, H / 2, 160))} title={i.label}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`data:image/svg+xml;utf8,${encodeURIComponent(i.svg)}`} alt="" className="w-10 h-10 mx-auto mb-1" />
                    {i.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Lienzo */}
        <div ref={contenedor} className="flex-1 min-w-0 grid place-items-center bg-[#2a2c30] relative overflow-hidden" style={{ backgroundImage: "radial-gradient(#3a3d42 1px, transparent 1px)", backgroundSize: "18px 18px" }}>
          <div className="shadow-2xl"><canvas ref={elCanvas} /></div>
          {(ocupado || !listo) && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-asfalto text-white text-sm px-4 py-1.5 shadow-lg">{ocupado ?? "Cargando tipografías..."}</div>
          )}
          {aviso && (
            <button onClick={() => setAviso(null)} className={`absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg text-sm px-4 py-2 shadow-lg ${aviso.tipo === "ok" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
              {aviso.texto} <span className="opacity-70 ml-2">✕</span>
            </button>
          )}
          <div className="absolute bottom-3 right-3 text-xs text-zinc-400">{W} x {H} px · {Math.round(zoomRef.current * 100)}%</div>
        </div>

        {/* Panel derecho */}
        <aside className="w-72 shrink-0 bg-superficie border-l border-borde overflow-y-auto p-4 space-y-4 text-sm">
          {!o && (
            <>
              <h2 className="titulo text-lg">Publicación</h2>
              <div>
                <label className="etiqueta" htmlFor="estado">Estado</label>
                <select id="estado" className="input" value={estado} onChange={(e) => setEstado(e.target.value)}>
                  {Object.entries(ESTADOS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="etiqueta" htmlFor="fecha">Fecha de publicación</label>
                <input id="fecha" type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
              <fieldset>
                <legend className="etiqueta">Dónde se publica</legend>
                {REDES.map((r) => (
                  <label key={r} className="flex items-center gap-2 py-0.5">
                    <input type="checkbox" checked={redes.includes(r)} onChange={(e) => setRedes(e.target.checked ? [...redes, r] : redes.filter((x) => x !== r))} /> {r}
                  </label>
                ))}
              </fieldset>
              <div>
                <label className="etiqueta" htmlFor="caption">Texto de la publicación</label>
                <textarea id="caption" className="input min-h-28" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Ej: ¡Nuevo servicio de Alineación 3D! Reservá tu turno..." />
                <button className="text-xs underline mt-1" onClick={() => navigator.clipboard.writeText(caption)}>Copiar texto</button>
              </div>
              <p className="text-xs text-suave">Seleccioná un elemento del diseño para editarlo. Doble clic sobre un texto para escribir.</p>
            </>
          )}

          {o && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="titulo text-lg">{esMulti ? "Varios elementos" : tx?.nombre ?? "Elemento"}</h2>
                <button className="text-xs text-suave underline" onClick={() => { c().discardActiveObject(); c().requestRenderAll(); }}>Listo</button>
              </div>

              {esTexto && tx && (
                <>
                  <div>
                    <label className="etiqueta" htmlFor="p-texto">Texto</label>
                    <textarea id="p-texto" className="input min-h-20" value={tx.text} onChange={(e) => setProp({ text: e.target.value })} />
                  </div>
                  <div>
                    <label className="etiqueta" htmlFor="p-fuente">Tipografía</label>
                    <select id="p-fuente" className="input" value={tx.fontFamily} onChange={(e) => setProp({ fontFamily: e.target.value })}>
                      {FUENTES.map((f) => <option key={f.familia} value={f.familia} style={{ fontFamily: `"${f.familia}"` }}>{f.label}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="etiqueta" htmlFor="p-size">Tamaño</label>
                      <input id="p-size" type="number" min={8} max={600} className="input" value={Math.round(tx.fontSize)} onChange={(e) => setProp({ fontSize: Number(e.target.value) || 10 })} />
                    </div>
                    <div>
                      <label className="etiqueta" htmlFor="p-peso">Grosor</label>
                      <select id="p-peso" className="input" value={String(tx.fontWeight)} onChange={(e) => setProp({ fontWeight: Number(e.target.value) })}>
                        {[400, 500, 600, 700, 800, 900].map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="etiqueta" htmlFor="p-estilo">Relleno</label>
                    <select id="p-estilo" className="input" value={tx.estiloTexto ?? "solido"} onChange={(e) => setEstiloTexto(e.target.value as EstiloTexto)}>
                      {Object.entries(ESTILOS_TEXTO).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </div>
                  {(tx.estiloTexto ?? "solido") === "solido" && (
                    <div className="flex items-center gap-2">
                      <label className="etiqueta mb-0" htmlFor="p-color">Color</label>
                      <input id="p-color" type="color" value={colorSolido(tx.fill)} onChange={(e) => setEstiloTexto("solido", e.target.value)} />
                      {["#ffffff", "#111214", ROJO, AMARILLO, "#25d366"].map((col) => (
                        <button key={col} className="w-6 h-6 rounded-full border border-borde" style={{ background: col }} onClick={() => setEstiloTexto("solido", col)} aria-label={`Color ${col}`} />
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1">
                    {(["left", "center", "right"] as const).map((a) => (
                      <button key={a} className={`btn btn-chico flex-1 ${tx.textAlign === a ? "btn-oscuro" : "btn-secundario"}`} onClick={() => setProp({ textAlign: a })}>
                        {a === "left" ? "Izq." : a === "center" ? "Centro" : "Der."}
                      </button>
                    ))}
                    <button className={`btn btn-chico ${tx.fontStyle === "italic" ? "btn-oscuro" : "btn-secundario"}`} onClick={() => setProp({ fontStyle: tx.fontStyle === "italic" ? "normal" : "italic" })}>
                      <em>I</em>
                    </button>
                  </div>
                  <div>
                    <label className="etiqueta" htmlFor="p-esp">Espaciado de letras</label>
                    <input id="p-esp" type="range" min={-100} max={1000} step={10} className="w-full" value={tx.charSpacing} onChange={(e) => setProp({ charSpacing: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="etiqueta" htmlFor="p-int">Interlineado</label>
                    <input id="p-int" type="range" min={0.6} max={2} step={0.05} className="w-full" value={tx.lineHeight} onChange={(e) => setProp({ lineHeight: Number(e.target.value) })} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" checked={!!tx.shadow} onChange={(e) => setProp({ shadow: e.target.checked ? sombra(tx.fontSize > 80 ? 1 : 0.5) : null })} /> Sombra
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" checked={(tx.strokeWidth ?? 0) > 0} onChange={(e) => setProp({ stroke: "#000000", strokeWidth: e.target.checked ? Math.max(2, tx.fontSize / 40) : 0, paintFirst: "stroke" })} /> Borde
                    </label>
                    {(tx.strokeWidth ?? 0) > 0 && <input type="color" value={colorSolido(tx.stroke)} onChange={(e) => setProp({ stroke: e.target.value })} aria-label="Color del borde" />}
                  </div>
                </>
              )}

              {!esTexto && !esImagen && !esGrupo && !esMulti && (
                <div className="space-y-2">
                  {typeof o.fill === "string" && (
                    <div className="flex items-center gap-2">
                      <label className="etiqueta mb-0" htmlFor="p-fill">Relleno</label>
                      <input id="p-fill" type="color" value={colorSolido(o.fill)} onChange={(e) => setProp({ fill: e.target.value })} />
                      {["#111214", "#ffffff", ROJO, AMARILLO].map((col) => (
                        <button key={col} className="w-6 h-6 rounded-full border border-borde" style={{ background: col }} onClick={() => setProp({ fill: col })} aria-label={`Relleno ${col}`} />
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <label className="etiqueta mb-0" htmlFor="p-stroke">Borde</label>
                    <input id="p-stroke" type="color" value={colorSolido(o.stroke)} onChange={(e) => setProp({ stroke: e.target.value, strokeWidth: Math.max(o.strokeWidth || 0, 3) })} />
                    <input type="number" min={0} max={40} className="input w-20" value={o.strokeWidth ?? 0} onChange={(e) => setProp({ strokeWidth: Number(e.target.value) })} aria-label="Grosor del borde" />
                  </div>
                </div>
              )}

              {esGrupo && (
                <div className="flex items-center gap-2">
                  <label className="etiqueta mb-0" htmlFor="p-icono">Color</label>
                  <input id="p-icono" type="color" value={(o as FabricObject & { colorBase?: string }).colorBase ?? "#ffffff"} onChange={(e) => { recolorear(o, e.target.value); c().requestRenderAll(); guardarHistorial(); refrescar(); }} />
                  {["#ffffff", ROJO, AMARILLO, "#25d366"].map((col) => (
                    <button key={col} className="w-6 h-6 rounded-full border border-borde" style={{ background: col }} onClick={() => { recolorear(o, col); c().requestRenderAll(); guardarHistorial(); refrescar(); }} aria-label={`Color ${col}`} />
                  ))}
                </div>
              )}

              {esImagen && (
                <div className="space-y-2">
                  <button className="btn btn-chico btn-secundario w-full" onClick={() => setPestana("fotos")}>Reemplazar por otra foto</button>
                  <button className="btn btn-chico btn-secundario w-full" onClick={() => setProp({ flipX: !o.flipX })}>Espejar</button>
                </div>
              )}

              <div>
                <label className="etiqueta" htmlFor="p-op">Opacidad</label>
                <input id="p-op" type="range" min={0.05} max={1} step={0.05} className="w-full" value={o.opacity ?? 1} onChange={(e) => setProp({ opacity: Number(e.target.value) })} />
              </div>
              <div>
                <label className="etiqueta" htmlFor="p-ang">Rotación</label>
                <input id="p-ang" type="range" min={-180} max={180} step={1} className="w-full" value={Math.round(o.angle ?? 0)} onChange={(e) => setProp({ angle: Number(e.target.value) })} />
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button className="btn btn-chico btn-secundario" onClick={() => capa("frente")}>Al frente</button>
                <button className="btn btn-chico btn-secundario" onClick={() => capa("fondo")}>Al fondo</button>
                <button className="btn btn-chico btn-secundario" onClick={() => capa("arriba")}>Subir</button>
                <button className="btn btn-chico btn-secundario" onClick={() => capa("abajo")}>Bajar</button>
                <button className="btn btn-chico btn-secundario" onClick={() => centrar("h")}>Centrar ↔</button>
                <button className="btn btn-chico btn-secundario" onClick={() => centrar("v")}>Centrar ↕</button>
                <button className="btn btn-chico btn-secundario" onClick={duplicar} disabled={esMulti}>Duplicar</button>
                <button className="btn btn-chico btn-secundario" onClick={bloquear} disabled={esMulti}>Fijar</button>
                <button className="btn btn-chico btn-peligro col-span-2" onClick={eliminar}>Eliminar</button>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
