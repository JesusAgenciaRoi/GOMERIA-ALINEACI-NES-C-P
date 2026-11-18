import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DIAS, fechaLocal, pesos } from "@/lib/fechas";
import { linkWhatsApp } from "@/lib/turnos";
import Image from "next/image";
import { BENEFICIOS, FOLLETOS, GALERIA, LOGO, PARALLAX, PASOS, SLIDES } from "@/lib/landing";
import Folletos from "@/components/landing/Folletos";
import Header from "@/components/landing/Header";
import HeroCarrusel from "@/components/landing/HeroCarrusel";
import Proceso from "@/components/landing/Proceso";
import Galeria from "@/components/landing/Galeria";
import { ConfigMovimiento, Contador, Marquesina, Parallax, Revelar } from "@/components/landing/Movimiento";
import { AbiertoAhora, BotonWhatsApp, TarjetaInclinable } from "@/components/landing/Extras";
import Reserva from "./Reserva";

export default async function Inicio() {
  const supabase = await createClient();
  const [{ data: cfg }, { data: servicios }, { data: horarios }] = await Promise.all([
    supabase.from("config_negocio").select("*").eq("id", 1).single(),
    supabase.from("servicios").select("id, nombre, descripcion, duracion_min, precio, reservable_web").eq("activo", true).order("orden"),
    supabase.from("horarios").select("dia_semana, apertura, cierre").order("dia_semana").order("apertura"),
  ]);

  const nombre = cfg?.nombre ?? "Gomería & Alineaciones C&P";
  const wa = linkWhatsApp(cfg?.whatsapp, "Hola! Quería hacer una consulta.");
  const lista = servicios ?? [];
  const reservables = lista.filter((s) => s.reservable_web);
  const diasAbiertos = Array.from(new Set((horarios ?? []).map((h) => h.dia_semana)));
  const porDia = [1, 2, 3, 4, 5, 6, 0].map((d) => ({
    dia: DIAS[d],
    franjas: (horarios ?? []).filter((h) => h.dia_semana === d).map((h) => `${h.apertura.slice(0, 5)} a ${h.cierre.slice(0, 5)}`),
  }));
  const alineacion = lista.find((s) => s.nombre.toLowerCase().startsWith("alineaci"));

  const cifras = [
    { valor: lista.length, sufijo: "", label: "servicios" },
    { valor: diasAbiertos.length, sufijo: "", label: "días a la semana" },
    { valor: alineacion?.duracion_min ?? 45, sufijo: "'", label: "dura una alineación" },
    { valor: cfg?.dias_max_reserva ?? 30, sufijo: "", label: "días de agenda online" },
  ];

  return (
    <ConfigMovimiento>
      <div className="flex-1 flex flex-col overflow-x-clip">
        <Header />
        <HeroCarrusel slides={SLIDES} whatsapp={wa} />

        {/* Bandas en movimiento */}
        <div className="relative py-6 bg-fondo">
          <Marquesina items={lista.map((s) => s.nombre)} className="bg-senal text-asfalto py-3 -rotate-2 scale-105 shadow-lg" duracion={35} />
          <Marquesina items={["Gomería", "Alineación", "Balanceo", "Cubiertas", "Llantas", "Turnos online"]} inversa className="bg-asfalto text-white py-3 rotate-1 scale-105 -mt-2" duracion={28} />
        </div>

        {/* Cifras */}
        <section className="max-w-6xl mx-auto px-4 py-14 w-full grid grid-cols-2 lg:grid-cols-4 gap-6">
          {cifras.map((c, k) => (
            <Revelar key={c.label} delay={k * 0.1} desde="zoom" className="text-center">
              <div className="titulo text-6xl sm:text-7xl text-asfalto">
                <Contador hasta={c.valor} sufijo={c.sufijo} />
              </div>
              <div className="text-suave font-medium uppercase tracking-wider text-sm mt-1">{c.label}</div>
            </Revelar>
          ))}
        </section>

        {/* Servicios */}
        <section id="servicios" className="max-w-6xl mx-auto px-4 pb-20 w-full scroll-mt-20">
          <Revelar>
            <p className="text-senal-oscura font-semibold tracking-[0.2em] uppercase text-sm">Lo que hacemos</p>
            <h2 className="titulo text-5xl sm:text-6xl mb-10">Servicios</h2>
          </Revelar>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {lista.map((s, k) => (
              <Revelar key={s.id} delay={(k % 3) * 0.12}>
                <TarjetaInclinable className="h-full">
                  <div className="tarjeta h-full p-6 relative overflow-hidden group">
                    <span className="absolute left-0 top-0 h-full w-1.5 bg-senal origin-top scale-y-50 group-hover:scale-y-100 transition-transform duration-500" />
                    <span className="absolute -right-6 -top-6 titulo text-8xl text-fondo group-hover:text-senal/20 transition-colors duration-500 select-none">
                      {String(k + 1).padStart(2, "0")}
                    </span>
                    <h3 className="titulo text-2xl relative">{s.nombre}</h3>
                    {s.descripcion && <p className="text-suave mt-2 relative">{s.descripcion}</p>}
                    <div className="flex justify-between items-end mt-6 relative">
                      <span className="text-sm text-suave">{s.reservable_web ? `${s.duracion_min} min aprox.` : "Consultá stock"}</span>
                      <span className="font-bold text-xl">{s.precio != null ? `Desde ${pesos(s.precio)}` : "Consultar"}</span>
                    </div>
                  </div>
                </TarjetaInclinable>
              </Revelar>
            ))}
          </div>
        </section>

        {/* Novedades: folletos */}
        <section className="bg-asfalto text-white overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 py-24 grid lg:grid-cols-2 gap-14 items-center">
            <Revelar desde="izquierda">
              <p className="text-senal font-semibold tracking-[0.2em] uppercase text-sm">Novedad</p>
              <h2 className="titulo text-5xl sm:text-7xl leading-[0.95] mt-2">
                Nuevo servicio de <span className="text-senal">alineación 3D</span>
              </h2>
              <p className="text-zinc-300 text-lg mt-5 max-w-md">
                Sumamos tecnología 3D para alinear autos y camionetas con más precisión. Además: balanceos, chequeos
                generales, cubiertas nuevas y de ocasión, y mecánica ligera.
              </p>
              <ul className="mt-6 grid grid-cols-2 gap-2 max-w-md">
                {["Alineación 3D", "Balanceos", "Chequeos generales", "Cubiertas nuevas", "Cubiertas de ocasión", "Mecánica ligera"].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-sm font-semibold">
                    <span className="w-2 h-2 rotate-45 bg-senal" />
                    {t}
                  </li>
                ))}
              </ul>
              <a href="#reservar" className="btn btn-primario text-lg px-7 py-3.5 mt-8">Reservar alineación</a>
            </Revelar>
            <Folletos folletos={FOLLETOS} />
          </div>
        </section>

        {/* Beneficios + parallax */}
        <Parallax src={PARALLAX}>
          <div className="max-w-6xl mx-auto px-4 py-20 grid lg:grid-cols-2 gap-12 items-center">
            <Revelar desde="izquierda">
              <h2 className="titulo text-5xl sm:text-7xl leading-[0.95]">
                ¿Tu vehículo <span className="text-senal">tira</span> para un lado?
              </h2>
              <p className="text-zinc-200 text-lg mt-5 max-w-md">
                Puede ser la alineación, la presión o el desgaste de las cubiertas. Traelo y lo revisamos con alineación 3D.
              </p>
              <a href="#reservar" className="btn btn-primario text-lg px-7 py-3.5 mt-8">Quiero un turno</a>
            </Revelar>
            <div className="grid sm:grid-cols-2 gap-4">
              {BENEFICIOS.map((b, k) => (
                <Revelar key={b.titulo} delay={k * 0.12} desde="derecha">
                  <div className="h-full rounded-xl bg-white/10 backdrop-blur border border-white/15 p-5 hover:bg-white/15 transition-colors">
                    <div className="w-9 h-1 bg-senal mb-4" />
                    <h3 className="titulo text-xl">{b.titulo}</h3>
                    <p className="text-zinc-300 text-sm mt-1">{b.texto}</p>
                  </div>
                </Revelar>
              ))}
            </div>
          </div>
        </Parallax>

        {/* Como funciona */}
        <section id="como-funciona" className="bg-asfalto scroll-mt-20">
          <div className="max-w-6xl mx-auto px-4 py-20">
            <Revelar>
              <p className="text-senal font-semibold tracking-[0.2em] uppercase text-sm">Simple y rápido</p>
              <h2 className="titulo text-5xl sm:text-6xl text-white mb-14">Cómo funciona</h2>
            </Revelar>
            <Proceso pasos={PASOS} />
          </div>
          <div className="franja h-3" />
        </section>

        {/* Galeria */}
        <section id="galeria" className="max-w-6xl mx-auto px-4 pt-20 pb-12 w-full scroll-mt-20">
          <Revelar>
            <p className="text-senal-oscura font-semibold tracking-[0.2em] uppercase text-sm">El taller</p>
            <h2 className="titulo text-5xl sm:text-6xl">Galería</h2>
          </Revelar>
          <Galeria fotos={GALERIA} />
        </section>

        {/* Reserva */}
        <section id="reservar" className="bg-superficie border-y border-borde scroll-mt-16">
          <div className="max-w-6xl mx-auto px-4 py-20">
            <Revelar>
              <p className="text-senal-oscura font-semibold tracking-[0.2em] uppercase text-sm">Online, en un minuto</p>
              <h2 className="titulo text-5xl sm:text-6xl mb-2">Reservá tu turno</h2>
              <p className="text-suave mb-10">Elegí el servicio, el día y el horario que te quede cómodo.</p>
            </Revelar>
            {reservables.length > 0 && diasAbiertos.length > 0 ? (
              <Reserva
                servicios={reservables}
                hoy={fechaLocal()}
                diasAbiertos={diasAbiertos}
                diasMax={cfg?.dias_max_reserva ?? 30}
                whatsapp={linkWhatsApp(cfg?.whatsapp, "Hola! Acabo de reservar un turno por la web.")}
              />
            ) : (
              <p className="text-suave">La reserva online no está disponible en este momento. Contactanos por teléfono o WhatsApp.</p>
            )}
          </div>
        </section>

        {/* Horarios y contacto */}
        <section id="contacto" className="max-w-6xl mx-auto px-4 py-20 w-full grid md:grid-cols-2 gap-10 scroll-mt-20">
          <Revelar desde="izquierda">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <h2 className="titulo text-5xl">Horarios</h2>
              <AbiertoAhora horarios={horarios ?? []} />
            </div>
            <dl className="tarjeta divide-y divide-borde">
              {porDia.map((d) => (
                <div key={d.dia} className="flex justify-between px-4 py-3">
                  <dt className="font-semibold">{d.dia}</dt>
                  <dd className={d.franjas.length ? "" : "text-suave"}>{d.franjas.length ? d.franjas.join(" y ") : "Cerrado"}</dd>
                </div>
              ))}
            </dl>
          </Revelar>
          <Revelar desde="derecha">
            <h2 className="titulo text-5xl mb-6">Contacto</h2>
            <div className="tarjeta p-6 space-y-4">
              {cfg?.direccion && <p><span className="etiqueta">Dirección</span>{cfg.direccion}</p>}
              {cfg?.telefono && <p><span className="etiqueta">Teléfono</span><a href={`tel:${cfg.telefono}`} className="hover:underline">{cfg.telefono}</a></p>}
              {cfg?.email && <p><span className="etiqueta">Email</span><a href={`mailto:${cfg.email}`} className="hover:underline">{cfg.email}</a></p>}
              <div className="flex flex-wrap gap-2 pt-1">
                {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-oscuro">WhatsApp</a>}
                {cfg?.instagram && <a href={`https://instagram.com/${cfg.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className="btn btn-secundario">Instagram</a>}
                {cfg?.facebook && <a href={cfg.facebook} target="_blank" rel="noopener noreferrer" className="btn btn-secundario">Facebook</a>}
                <a href="#reservar" className="btn btn-primario">Reservar turno</a>
              </div>
              {!cfg?.direccion && !cfg?.telefono && !wa && <p className="text-suave text-sm">Cargá dirección, teléfono y WhatsApp en el panel (Configuración) para que aparezcan acá.</p>}
            </div>
            {cfg?.direccion && (
              <iframe
                title="Mapa"
                className="mt-4 w-full h-64 rounded-xl border border-borde"
                loading="lazy"
                src={`https://www.google.com/maps?q=${encodeURIComponent(cfg.direccion)}&output=embed`}
              />
            )}
          </Revelar>
        </section>

        <footer className="mt-auto bg-asfalto text-zinc-400 text-sm">
          <Marquesina items={[nombre]} className="text-white/10 py-6" duracion={40} />
          <div className="max-w-6xl mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10">
            <span className="flex items-center gap-3">
              <Image src={LOGO} alt="Logo Gomería CYP" width={72} height={48} className="rounded-md h-12 w-auto" />
              © {new Date().getFullYear()} {nombre}
            </span>
            <Link href="/login" className="hover:text-white">Acceso personal</Link>
          </div>
        </footer>

        {wa && <BotonWhatsApp href={wa} />}
      </div>
    </ConfigMovimiento>
  );
}
