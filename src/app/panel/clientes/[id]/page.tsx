import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/auth";
import { EstadoBadge, Encabezado, Vacio, Volver } from "@/components/ui";
import { fechaCorta, hora, pesos } from "@/lib/fechas";
import { linkWhatsApp } from "@/lib/turnos";
import { estadoOrden } from "@/lib/negocio";
import { FormEditarCliente, FormVehiculo } from "../Formularios";
import { eliminarCliente, eliminarVehiculo } from "../actions";

const AVISOS: Record<string, string> = {
  patente: "El cliente se creó, pero la patente ya estaba cargada en otro cliente.",
  no_borrable: "No se puede borrar un cliente que tiene turnos. Cancelá o borrá sus turnos primero.",
};

export default async function ClienteDetalle({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { id } = await params;
  const { aviso } = await searchParams;
  const supabase = await createClient();
  const perfil = await obtenerPerfil();

  const [{ data: cliente }, { data: vehiculos }, { data: turnos }, { data: ordenes }] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", id).maybeSingle(),
    supabase.from("vehiculos").select("*").eq("cliente_id", id).order("created_at"),
    supabase
      .from("turnos")
      .select("id, inicio, fin, estado, precio, servicios(nombre), vehiculos(patente)")
      .eq("cliente_id", id)
      .order("inicio", { ascending: false })
      .limit(50),
    supabase
      .from("ordenes")
      .select("id, numero, estado, total, created_at, vehiculos(patente)")
      .eq("cliente_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (!cliente) notFound();
  const gastado = (ordenes ?? []).filter((o) => o.estado === "cobrada").reduce((a, o) => a + o.total, 0);

  const wa = linkWhatsApp(cliente.telefono, `Hola ${cliente.nombre.split(" ")[0]}, te escribimos de Gomería C&P.`);

  return (
    <div className="max-w-5xl">
      <Volver href="/panel/clientes">Clientes</Volver>
      <Encabezado titulo={cliente.nombre} subtitulo={cliente.telefono ?? undefined}>
        <Link href={`/panel/turnos/nuevo?cliente=${cliente.id}`} className="btn btn-primario">+ Nuevo turno</Link>
        <Link href={`/panel/ordenes/nueva?cliente=${cliente.id}`} className="btn btn-secundario">+ Orden de trabajo</Link>
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-secundario">WhatsApp</a>}
      </Encabezado>

      {aviso && AVISOS[aviso] && <p className="tarjeta border-amber-300 bg-amber-50 px-4 py-3 mb-6 text-sm">{AVISOS[aviso]}</p>}

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="tarjeta p-5">
          <h2 className="titulo text-lg mb-4">Datos</h2>
          <FormEditarCliente cliente={cliente} />
          {perfil?.rol === "admin" && (
            <form action={eliminarCliente} className="mt-6 pt-4 border-t border-borde">
              <input type="hidden" name="id" value={cliente.id} />
              <button className="btn btn-chico btn-peligro">Eliminar cliente</button>
            </form>
          )}
        </section>

        <section className="tarjeta p-5">
          <h2 className="titulo text-lg mb-4">Vehículos</h2>
          {vehiculos && vehiculos.length > 0 ? (
            <ul className="divide-y divide-borde mb-5 border border-borde rounded-lg">
              {vehiculos.map((v) => (
                <li key={v.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                  <div>
                    <div className="font-semibold">{v.patente ?? "Sin patente"} <span className="font-normal text-suave">{[v.marca, v.modelo, v.anio].filter(Boolean).join(" ")}</span></div>
                    {(v.medida_cubierta || v.notas) && <div className="text-xs text-suave">{[v.medida_cubierta, v.notas].filter(Boolean).join(" · ")}</div>}
                  </div>
                  <form action={eliminarVehiculo}>
                    <input type="hidden" name="id" value={v.id} />
                    <input type="hidden" name="cliente_id" value={cliente.id} />
                    <button className="text-xs text-peligro hover:underline" aria-label={`Quitar vehículo ${v.patente ?? ""}`}>Quitar</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-suave mb-5">Sin vehículos cargados.</p>
          )}
          <FormVehiculo clienteId={cliente.id} />
        </section>
      </div>

      <section className="mt-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="titulo text-xl">Órdenes de trabajo</h2>
          {gastado > 0 && <span className="text-sm text-suave">Total cobrado: <strong className="text-texto">{pesos(gastado)}</strong></span>}
        </div>
        {ordenes && ordenes.length > 0 ? (
          <ul className="tarjeta divide-y divide-borde">
            {ordenes.map((o) => {
              const e = estadoOrden(o.estado);
              return (
                <li key={o.id}>
                  <Link href={`/panel/ordenes/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-fondo">
                    <span className="titulo text-lg w-14">#{o.numero}</span>
                    <span className="w-40 tabular-nums">{fechaCorta(o.created_at)}</span>
                    <span className="flex-1 text-sm text-suave">{o.vehiculos?.patente}</span>
                    <span className="font-bold tabular-nums">{pesos(o.total)}</span>
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${e.clase}`}>{e.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <Vacio>Sin órdenes de trabajo.</Vacio>
        )}
      </section>

      <section className="mt-8">
        <h2 className="titulo text-xl mb-3">Historial de turnos</h2>
        {turnos && turnos.length > 0 ? (
          <ul className="tarjeta divide-y divide-borde">
            {turnos.map((t) => (
              <li key={t.id}>
                <Link href={`/panel/turnos/${t.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-fondo">
                  <span className="w-40 tabular-nums">{fechaCorta(t.inicio)} {hora(t.inicio)}</span>
                  <span className="flex-1 font-semibold">{t.servicios?.nombre}</span>
                  <span className="text-sm text-suave">{t.vehiculos?.patente}</span>
                  <EstadoBadge estado={t.estado} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Vacio>Este cliente todavía no tiene turnos.</Vacio>
        )}
      </section>
    </div>
  );
}
