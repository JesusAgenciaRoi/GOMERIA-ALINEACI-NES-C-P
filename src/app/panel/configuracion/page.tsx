import { createClient } from "@/lib/supabase/server";
import { requerirAdmin } from "@/lib/auth";
import { Campo, Encabezado } from "@/components/ui";
import { DIAS, fechaCorta, fechaLocal, hora } from "@/lib/fechas";
import { agregarBloqueo, agregarHorario, borrarBloqueo, borrarHorario, guardarNegocio, guardarRecurso, guardarServicio } from "./actions";

function Seccion({ id, titulo, ayuda, children }: { id: string; titulo: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="tarjeta p-5 mb-6 scroll-mt-6">
      <h2 className="titulo text-xl">{titulo}</h2>
      {ayuda && <p className="text-sm text-suave mb-4">{ayuda}</p>}
      {children}
    </section>
  );
}

export default async function ConfiguracionPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requerirAdmin();
  const { ok, error } = await searchParams;
  const supabase = await createClient();
  const [{ data: cfg }, { data: servicios }, { data: horarios }, { data: recursos }, { data: bloqueos }] = await Promise.all([
    supabase.from("config_negocio").select("*").eq("id", 1).single(),
    supabase.from("servicios").select("*").order("orden"),
    supabase.from("horarios").select("*").order("dia_semana").order("apertura"),
    supabase.from("recursos").select("*").order("tipo").order("nombre"),
    supabase.from("bloqueos").select("*, recursos(nombre)").gte("fin", new Date().toISOString()).order("inicio"),
  ]);
  const tipos = Array.from(new Set((recursos ?? []).map((r) => r.tipo)));

  return (
    <div className="max-w-5xl">
      <Encabezado titulo="Configuración" subtitulo="Datos del negocio, servicios, horarios y elevadores" />
      {ok && <p className="tarjeta border-emerald-300 bg-emerald-50 px-4 py-3 mb-6 text-sm" role="status">Cambios guardados.</p>}
      {error && <p className="tarjeta border-rose-300 bg-rose-50 px-4 py-3 mb-6 text-sm" role="alert">{error}</p>}

      <Seccion id="negocio" titulo="Negocio" ayuda="Se muestra en la web pública y en los mensajes de WhatsApp.">
        <form action={guardarNegocio} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Campo label="Nombre" name="nombre" defaultValue={cfg?.nombre} required />
          <Campo label="Teléfono" name="telefono" defaultValue={cfg?.telefono} />
          <Campo label="WhatsApp (con código de área)" name="whatsapp" defaultValue={cfg?.whatsapp} placeholder="099 123 456" />
          <Campo label="Dirección" name="direccion" defaultValue={cfg?.direccion} className="sm:col-span-2" />
          <Campo label="Email" name="email" type="email" defaultValue={cfg?.email} />
          <Campo label="Instagram (usuario)" name="instagram" defaultValue={cfg?.instagram} placeholder="gomeriacyp" />
          <Campo label="Facebook (URL)" name="facebook" defaultValue={cfg?.facebook} />
          <div />
          <Campo label="Personas trabajando (turnos a la vez)" name="personas" type="number" min={1} max={20} defaultValue={cfg?.personas ?? 1} />
          <Campo label="Intervalo entre turnos (min)" name="intervalo_min" type="number" min={5} max={240} defaultValue={cfg?.intervalo_min} />
          <Campo label="Anticipación mínima (horas)" name="anticipacion_min_horas" type="number" min={0} defaultValue={cfg?.anticipacion_min_horas} />
          <Campo label="Reservas hasta (días)" name="dias_max_reserva" type="number" min={1} max={365} defaultValue={cfg?.dias_max_reserva} />
          <div className="sm:col-span-2 lg:col-span-3">
            <button className="btn btn-oscuro">Guardar datos</button>
          </div>
        </form>
      </Seccion>

      <Seccion id="servicios" titulo="Servicios" ayuda="El tipo de recurso define qué máquina ocupa (ej: alineadora o elevador). Precio vacío = Consultar.">
        <div className="space-y-3">
          {[...(servicios ?? []), null].map((s) => (
            <form key={s?.id ?? "nuevo"} action={guardarServicio} className={`grid grid-cols-2 md:grid-cols-12 gap-2 items-end p-3 rounded-lg border ${s ? "border-borde" : "border-dashed border-senal bg-senal/5"}`}>
              {s && <input type="hidden" name="id" value={s.id} />}
              <Campo label={s ? "Nombre" : "Nuevo servicio"} name="nombre" defaultValue={s?.nombre} className="col-span-2 md:col-span-3" required />
              <Campo label="Min" name="duracion_min" type="number" min={5} max={600} defaultValue={s?.duracion_min ?? 30} className="md:col-span-1" />
              <Campo label="Precio" name="precio" type="number" min={0} step={100} defaultValue={s?.precio} className="md:col-span-2" />
              <div className="md:col-span-2">
                <label className="etiqueta" htmlFor={`tipo-${s?.id ?? "n"}`}>Recurso</label>
                <input className="input" id={`tipo-${s?.id ?? "n"}`} name="tipo_recurso" list="tipos-recurso" defaultValue={s?.tipo_recurso ?? "elevador"} />
              </div>
              <Campo label="Orden" name="orden" type="number" defaultValue={s?.orden ?? (servicios?.length ?? 0) + 1} className="md:col-span-1" />
              <div className="col-span-2 md:col-span-3 flex flex-wrap items-center gap-3 text-sm pb-2">
                <label className="flex items-center gap-1.5"><input type="checkbox" name="activo" defaultChecked={s?.activo ?? true} /> Activo</label>
                <label className="flex items-center gap-1.5"><input type="checkbox" name="reservable_web" defaultChecked={s?.reservable_web ?? true} /> En la web</label>
                <button className="btn btn-chico btn-secundario ml-auto">{s ? "Guardar" : "Agregar"}</button>
              </div>
              <Campo label="Descripción" name="descripcion" defaultValue={s?.descripcion} className="col-span-2 md:col-span-12" />
            </form>
          ))}
        </div>
        <datalist id="tipos-recurso">
          {tipos.map((t) => <option key={t} value={t} />)}
        </datalist>
      </Seccion>

      <Seccion id="horarios" titulo="Horarios de atención" ayuda="Podés cargar varias franjas por día (ej: mañana y tarde).">
        <ul className="divide-y divide-borde border border-borde rounded-lg mb-4">
          {(horarios ?? []).map((h) => (
            <li key={h.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span><strong className="inline-block w-24">{DIAS[h.dia_semana]}</strong>{h.apertura.slice(0, 5)} a {h.cierre.slice(0, 5)}</span>
              <form action={borrarHorario}>
                <input type="hidden" name="id" value={h.id} />
                <button className="text-peligro hover:underline">Quitar</button>
              </form>
            </li>
          ))}
          {(horarios ?? []).length === 0 && <li className="px-3 py-3 text-sm text-suave">Sin horarios: la web no va a ofrecer turnos.</li>}
        </ul>
        <form action={agregarHorario} className="flex flex-wrap items-end gap-2">
          <div>
            <label className="etiqueta" htmlFor="dia_semana">Día</label>
            <select className="input" id="dia_semana" name="dia_semana" defaultValue={1}>
              {DIAS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </div>
          <Campo label="Abre" name="apertura" type="time" defaultValue="08:30" />
          <Campo label="Cierra" name="cierre" type="time" defaultValue="12:30" />
          <button className="btn btn-secundario">+ Agregar franja</button>
        </form>
      </Seccion>

      <Seccion id="recursos" titulo="Elevadores y máquinas" ayuda="Cada recurso atiende un turno a la vez. Más recursos del mismo tipo = más turnos en paralelo.">
        <div className="space-y-2">
          {[...(recursos ?? []), null].map((r) => (
            <form key={r?.id ?? "nuevo"} action={guardarRecurso} className="flex flex-wrap items-end gap-2">
              {r && <input type="hidden" name="id" value={r.id} />}
              <Campo label={r ? "Nombre" : "Nuevo recurso"} name="nombre" defaultValue={r?.nombre} required />
              <div>
                <label className="etiqueta" htmlFor={`rt-${r?.id ?? "n"}`}>Tipo</label>
                <input className="input" id={`rt-${r?.id ?? "n"}`} name="tipo" list="tipos-recurso" defaultValue={r?.tipo ?? "elevador"} />
              </div>
              <label className="flex items-center gap-1.5 text-sm pb-2.5"><input type="checkbox" name="activo" defaultChecked={r?.activo ?? true} /> Activo</label>
              <button className="btn btn-chico btn-secundario mb-1">{r ? "Guardar" : "Agregar"}</button>
            </form>
          ))}
        </div>
      </Seccion>

      <Seccion id="bloqueos" titulo="Feriados y bloqueos" ayuda="Bloqueá días u horarios (feriados, vacaciones, una máquina en reparación). La web no ofrece turnos en esos rangos.">
        <ul className="divide-y divide-borde border border-borde rounded-lg mb-4">
          {(bloqueos ?? []).map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>
                <strong>{fechaCorta(b.inicio)} {hora(b.inicio)}</strong> a <strong>{fechaCorta(b.fin)} {hora(b.fin)}</strong>
                <span className="text-suave"> · {b.recursos?.nombre ?? "Todo el local"}{b.motivo ? ` · ${b.motivo}` : ""}</span>
              </span>
              <form action={borrarBloqueo}>
                <input type="hidden" name="id" value={b.id} />
                <button className="text-peligro hover:underline">Quitar</button>
              </form>
            </li>
          ))}
          {(bloqueos ?? []).length === 0 && <li className="px-3 py-3 text-sm text-suave">Sin bloqueos próximos.</li>}
        </ul>
        <form action={agregarBloqueo} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
          <Campo label="Desde" name="desde" type="date" defaultValue={fechaLocal()} required />
          <Campo label="Hora" name="hora_desde" type="time" defaultValue="00:00" />
          <Campo label="Hasta" name="hasta" type="date" defaultValue={fechaLocal()} required />
          <Campo label="Hora" name="hora_hasta" type="time" defaultValue="23:59" />
          <div>
            <label className="etiqueta" htmlFor="recurso_id">Aplica a</label>
            <select className="input" id="recurso_id" name="recurso_id" defaultValue="">
              <option value="">Todo el local</option>
              {(recursos ?? []).map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </div>
          <Campo label="Motivo" name="motivo" placeholder="Feriado" />
          <div className="col-span-2 md:col-span-6">
            <button className="btn btn-secundario">+ Agregar bloqueo</button>
          </div>
        </form>
      </Seccion>
    </div>
  );
}
