import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/auth";
import { fechaLarga, fechaLocal, hora, inicioSemana, rangoDia, sumarDias, localAISO, pesos } from "@/lib/fechas";
import { EstadoBadge, Encabezado, Vacio } from "@/components/ui";
import { ORIGENES } from "@/lib/turnos";
import Ocupado from "./Ocupado";

export default async function PanelInicio() {
  const perfil = await obtenerPerfil();
  const supabase = await createClient();
  const hoy = fechaLocal();
  const [desde, hasta] = rangoDia(hoy);
  const lunes = inicioSemana(hoy);
  const inicioMes = localAISO(hoy.slice(0, 8) + "01", "00:00");

  const esAdmin = perfil?.rol === "admin";
  const [{ data: turnosHoy }, { count: semana }, { count: clientesMes }, { count: ordenesActivas }, { data: productos }, { data: cajaHoy }] = await Promise.all([
    supabase
      .from("turnos")
      .select("id, inicio, fin, estado, origen, clientes(nombre, telefono), vehiculos(patente, marca, modelo), servicios(nombre), recursos(nombre)")
      .gte("inicio", desde)
      .lt("inicio", hasta)
      .order("inicio"),
    supabase
      .from("turnos")
      .select("id", { count: "exact", head: true })
      .gte("inicio", localAISO(lunes, "00:00"))
      .lt("inicio", localAISO(sumarDias(lunes, 7), "00:00"))
      .not("estado", "in", "(cancelado,no_asistio)"),
    supabase.from("clientes").select("id", { count: "exact", head: true }).gte("created_at", inicioMes),
    supabase.from("ordenes").select("id", { count: "exact", head: true }).in("estado", ["abierta", "en_proceso", "terminada"]),
    supabase.from("productos").select("id, nombre, medida, stock, stock_minimo").eq("activo", true).gt("stock_minimo", 0),
    esAdmin ? supabase.from("caja_movimientos").select("tipo, monto").gte("fecha", desde).lt("fecha", hasta) : Promise.resolve({ data: null }),
  ]);
  const stockBajo = (productos ?? []).filter((p) => p.stock <= p.stock_minimo);
  const cobradoHoy = (cajaHoy ?? []).reduce((a, m) => a + (m.tipo === "ingreso" ? m.monto : -m.monto), 0);

  const activos = (turnosHoy ?? []).filter((t) => t.estado !== "cancelado");
  const stats = [
    { label: "Turnos hoy", valor: activos.length },
    { label: "Turnos esta semana", valor: semana ?? 0 },
    { label: "Órdenes activas", valor: ordenesActivas ?? 0, href: "/panel/ordenes" },
    esAdmin
      ? { label: "Caja de hoy", valor: pesos(cobradoHoy), href: "/panel/caja" }
      : { label: "Clientes nuevos (mes)", valor: clientesMes ?? 0, href: "/panel/clientes" },
  ];

  return (
    <div className="max-w-6xl">
      <Encabezado titulo={`Hola, ${perfil?.nombre.split(" ")[0] ?? ""}`} subtitulo={fechaLarga(new Date())}>
        <Link href="/panel/turnos/nuevo" className="btn btn-primario">+ Nuevo turno</Link>
        <Link href="/panel/ordenes/nueva" className="btn btn-secundario">+ Orden</Link>
        <Link href="/panel/clientes?nuevo=1" className="btn btn-secundario">+ Cliente</Link>
      </Encabezado>

      <Ocupado />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {stats.map((s) => {
          const contenido = (
            <>
              <div className="text-sm text-suave">{s.label}</div>
              <div className="titulo text-4xl mt-1">{s.valor}</div>
            </>
          );
          return "href" in s && s.href ? (
            <Link key={s.label} href={s.href} className="tarjeta p-4 hover:border-zinc-400">{contenido}</Link>
          ) : (
            <div key={s.label} className="tarjeta p-4">{contenido}</div>
          );
        })}
      </div>

      {stockBajo.length > 0 && (
        <Link href="/panel/inventario?bajo=1" className="tarjeta block border-amber-400 bg-amber-50 px-4 py-3 mb-8 text-sm">
          <strong>Stock bajo en {stockBajo.length} producto{stockBajo.length === 1 ? "" : "s"}:</strong>{" "}
          {stockBajo.slice(0, 5).map((p) => [p.nombre, p.medida].filter(Boolean).join(" ") + ` (${p.stock})`).join(", ")}
          {stockBajo.length > 5 ? "..." : ""}
        </Link>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="titulo text-xl">Turnos de hoy</h2>
        <Link href="/panel/agenda" className="text-sm font-semibold underline underline-offset-4">Ver agenda</Link>
      </div>

      {turnosHoy && turnosHoy.length > 0 ? (
        <ul className="tarjeta divide-y divide-borde">
          {turnosHoy.map((t) => (
            <li key={t.id}>
              <Link href={`/panel/turnos/${t.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-fondo">
                <span className="titulo text-lg w-24 tabular-nums">{hora(t.inicio)}-{hora(t.fin)}</span>
                <span className="flex-1 min-w-40">
                  <span className="font-semibold">{t.clientes?.nombre}</span>
                  <span className="text-suave"> · {t.servicios?.nombre}</span>
                  {t.vehiculos?.patente && <span className="text-suave"> · {t.vehiculos.patente}</span>}
                </span>
                <span className="text-sm text-suave">{t.recursos?.nombre} · {ORIGENES[t.origen] ?? t.origen}</span>
                <EstadoBadge estado={t.estado} />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Vacio>No hay turnos para hoy.</Vacio>
      )}
    </div>
  );
}
