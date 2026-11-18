import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerPerfil } from "@/lib/auth";
import { EstadoBadge, Encabezado, Volver } from "@/components/ui";
import { fechaLarga, fechaLocal, hora, pesos } from "@/lib/fechas";
import { ESTADOS, ORIGENES, linkWhatsApp, type Estado } from "@/lib/turnos";
import FormTurno from "../FormTurno";
import { cambiarEstado, eliminarTurno } from "../actions";
import { crearOrden } from "../../ordenes/actions";

const ACCIONES: Partial<Record<Estado, Estado[]>> = {
  pendiente_pago: ["confirmado", "cancelado"],
  confirmado: ["en_curso", "completado", "no_asistio", "cancelado"],
  en_curso: ["completado", "cancelado"],
  completado: ["en_curso"],
  cancelado: ["confirmado"],
  no_asistio: ["confirmado"],
};

export default async function TurnoDetalle({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const perfil = await obtenerPerfil();

  const { data: t } = await supabase
    .from("turnos")
    .select("*, clientes(id, nombre, telefono), vehiculos(patente, marca, modelo), servicios(nombre), recursos(nombre)")
    .eq("id", id)
    .maybeSingle();
  if (!t) notFound();

  const [{ data: servicios }, { data: recursos }, { data: vehiculos }, { data: config }, { data: orden }] = await Promise.all([
    supabase.from("servicios").select("id, nombre, duracion_min, precio, tipo_recurso, activo").order("orden"),
    supabase.from("recursos").select("id, nombre, tipo").eq("activo", true).order("nombre"),
    supabase.from("vehiculos").select("id, patente, marca, modelo").eq("cliente_id", t.cliente_id),
    supabase.from("config_negocio").select("nombre, direccion").eq("id", 1).single(),
    supabase.from("ordenes").select("id, numero, estado").eq("turno_id", t.id).maybeSingle(),
  ]);

  const nombre = t.clientes?.nombre.split(" ")[0] ?? "";
  const recordatorio = linkWhatsApp(
    t.clientes?.telefono,
    `Hola ${nombre}! Te recordamos tu turno en ${config?.nombre ?? "la gomería"} para ${t.servicios?.nombre} el ${fechaLarga(t.inicio)} a las ${hora(t.inicio)} hs.` +
      (config?.direccion ? ` Te esperamos en ${config.direccion}.` : "") +
      " Si no podés venir, avisanos por acá. Gracias!",
  );
  const duracion = Math.round((new Date(t.fin).getTime() - new Date(t.inicio).getTime()) / 60000);

  return (
    <div className="max-w-4xl">
      <Volver href={`/panel/agenda?fecha=${fechaLocal(t.inicio)}`}>Agenda</Volver>
      <Encabezado titulo={t.servicios?.nombre ?? "Turno"} subtitulo={`${fechaLarga(t.inicio)} · ${hora(t.inicio)} a ${hora(t.fin)} hs`}>
        {orden ? (
          <Link href={`/panel/ordenes/${orden.id}`} className="btn btn-primario">Ver orden #{orden.numero}</Link>
        ) : (
          t.estado !== "cancelado" && (
            <form action={crearOrden}>
              <input type="hidden" name="turno_id" value={t.id} />
              <button className="btn btn-primario">Abrir orden de trabajo</button>
            </form>
          )
        )}
        {recordatorio && (
          <a href={recordatorio} target="_blank" rel="noopener noreferrer" className="btn btn-secundario">Recordatorio por WhatsApp</a>
        )}
      </Encabezado>

      {error && <p className="tarjeta border-rose-300 bg-rose-50 px-4 py-3 mb-6 text-sm" role="alert">{error}</p>}

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="tarjeta p-4">
          <div className="text-sm text-suave mb-1">Cliente</div>
          <Link href={`/panel/clientes/${t.cliente_id}`} className="font-semibold hover:underline">{t.clientes?.nombre}</Link>
          <div className="text-sm text-suave">{t.clientes?.telefono}</div>
        </div>
        <div className="tarjeta p-4">
          <div className="text-sm text-suave mb-1">Vehículo / recurso</div>
          <div className="font-semibold">{t.vehiculos ? [t.vehiculos.patente, t.vehiculos.marca, t.vehiculos.modelo].filter(Boolean).join(" ") : "Sin especificar"}</div>
          <div className="text-sm text-suave">{t.recursos?.nombre}</div>
        </div>
        <div className="tarjeta p-4">
          <div className="text-sm text-suave mb-1">Estado</div>
          <EstadoBadge estado={t.estado} />
          <div className="text-sm text-suave mt-1">{pesos(t.precio)} · {ORIGENES[t.origen] ?? t.origen}</div>
        </div>
      </div>

      <section className="tarjeta p-5 mb-6">
        <h2 className="titulo text-lg mb-3">Cambiar estado</h2>
        <div className="flex flex-wrap gap-2">
          {(ACCIONES[t.estado as Estado] ?? []).map((e) => (
            <form key={e} action={cambiarEstado}>
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="estado" value={e} />
              <button className={`btn btn-chico ${e === "cancelado" || e === "no_asistio" ? "btn-peligro" : e === "completado" ? "btn-primario" : "btn-secundario"}`}>
                {ESTADOS[e].label}
              </button>
            </form>
          ))}
        </div>
      </section>

      <section className="tarjeta p-5">
        <h2 className="titulo text-lg mb-4">Editar turno</h2>
        <FormTurno
          clienteId={t.cliente_id}
          servicios={servicios ?? []}
          recursos={recursos ?? []}
          vehiculos={vehiculos ?? []}
          valores={{
            id: t.id,
            servicio_id: t.servicio_id,
            vehiculo_id: t.vehiculo_id,
            recurso_id: t.recurso_id,
            fecha: fechaLocal(t.inicio),
            hora: hora(t.inicio),
            duracion,
            precio: t.precio,
            notas: t.notas,
          }}
        />
        {perfil?.rol === "admin" && (
          <form action={eliminarTurno} className="mt-6 pt-4 border-t border-borde">
            <input type="hidden" name="id" value={t.id} />
            <button className="btn btn-chico btn-peligro">Eliminar turno definitivamente</button>
          </form>
        )}
      </section>
    </div>
  );
}
