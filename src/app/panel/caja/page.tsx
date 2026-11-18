import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requerirAdmin } from "@/lib/auth";
import { Encabezado, Vacio } from "@/components/ui";
import { fechaLarga, fechaLocal, hora, localAISO, pesos, rangoDia, sumarDias } from "@/lib/fechas";
import { CATEGORIAS_CAJA, MEDIOS_PAGO } from "@/lib/negocio";
import FormCaja from "./FormCaja";
import { borrarMovimiento } from "./actions";

type Mov = { tipo: string; monto: number; medio: string; categoria: string };

function resumir(movs: Mov[]) {
  const ingresos = movs.filter((m) => m.tipo === "ingreso").reduce((a, m) => a + m.monto, 0);
  const egresos = movs.filter((m) => m.tipo === "egreso").reduce((a, m) => a + m.monto, 0);
  const porMedio: Record<string, number> = {};
  for (const m of movs) porMedio[m.medio] = (porMedio[m.medio] ?? 0) + (m.tipo === "ingreso" ? m.monto : -m.monto);
  return { ingresos, egresos, saldo: ingresos - egresos, porMedio };
}

export default async function CajaPage({ searchParams }: { searchParams: Promise<{ fecha?: string }> }) {
  await requerirAdmin();
  const sp = await searchParams;
  const hoy = fechaLocal();
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha ?? "") ? sp.fecha! : hoy;
  const [desde, hasta] = rangoDia(fecha);
  const inicioMes = localAISO(fecha.slice(0, 8) + "01", "00:00");
  const [y, m] = fecha.split("-").map(Number);
  const finMes = localAISO(`${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`, "00:00");
  const supabase = await createClient();

  const [{ data: movs }, { data: delMes }] = await Promise.all([
    supabase
      .from("caja_movimientos")
      .select("id, fecha, tipo, categoria, medio, monto, concepto, orden_id, compra_id, ordenes(numero), compras(numero)")
      .gte("fecha", desde)
      .lt("fecha", hasta)
      .order("fecha", { ascending: false }),
    supabase.from("caja_movimientos").select("tipo, monto, medio, categoria").gte("fecha", inicioMes).lt("fecha", finMes),
  ]);

  const dia = resumir(movs ?? []);
  const mes = resumir(delMes ?? []);
  const nombreMes = new Intl.DateTimeFormat("es-UY", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 15)));

  return (
    <div className="max-w-6xl">
      <Encabezado titulo="Caja" subtitulo={fechaLarga(localAISO(fecha, "12:00"))} />

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex">
          <Link href={`/panel/caja?fecha=${sumarDias(fecha, -1)}`} className="btn btn-secundario rounded-r-none" aria-label="Día anterior">&larr;</Link>
          <Link href="/panel/caja" className="btn btn-secundario rounded-none border-x-0">Hoy</Link>
          <Link href={`/panel/caja?fecha=${sumarDias(fecha, 1)}`} className="btn btn-secundario rounded-l-none" aria-label="Día siguiente">&rarr;</Link>
        </div>
        <form className="flex gap-2">
          <input type="date" name="fecha" defaultValue={fecha} className="input w-auto" aria-label="Ir a fecha" />
          <button className="btn btn-secundario">Ir</button>
        </form>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="tarjeta p-4">
          <div className="text-sm text-suave">Ingresos del día</div>
          <div className="titulo text-3xl text-ok">{pesos(dia.ingresos)}</div>
        </div>
        <div className="tarjeta p-4">
          <div className="text-sm text-suave">Egresos del día</div>
          <div className="titulo text-3xl text-peligro">{pesos(dia.egresos)}</div>
        </div>
        <div className="tarjeta p-4 bg-asfalto text-white border-asfalto">
          <div className="text-sm text-zinc-400">Saldo del día</div>
          <div className="titulo text-3xl text-senal">{pesos(dia.saldo)}</div>
        </div>
      </div>

      {Object.keys(dia.porMedio).length > 0 && (
        <div className="tarjeta p-4 mb-6">
          <div className="text-sm text-suave mb-2">Saldo por medio de pago (para el cierre de caja)</div>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {Object.entries(dia.porMedio).map(([medio, v]) => (
              <div key={medio}><span className="text-suave">{MEDIOS_PAGO[medio] ?? medio}:</span> <strong className="tabular-nums">{pesos(v)}</strong></div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <section className="min-w-0">
          <h2 className="titulo text-xl mb-3">Movimientos del día</h2>
          {movs && movs.length > 0 ? (
            <ul className="tarjeta divide-y divide-borde">
              {movs.map((mv) => (
                <li key={mv.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                  <span className="w-14 tabular-nums text-suave">{hora(mv.fecha)}</span>
                  <span className="flex-1 min-w-40">
                    <span className="font-semibold">{CATEGORIAS_CAJA[mv.categoria]?.label ?? mv.categoria}</span>
                    <span className="text-suave"> · {MEDIOS_PAGO[mv.medio] ?? mv.medio}</span>
                    <span className="block text-sm text-suave">
                      {mv.orden_id ? (
                        <Link href={`/panel/ordenes/${mv.orden_id}`} className="underline">Orden #{mv.ordenes?.numero}</Link>
                      ) : mv.compra_id ? (
                        <Link href={`/panel/compras/${mv.compra_id}`} className="underline">{mv.concepto ?? `Compra #${mv.compras?.numero}`}</Link>
                      ) : (
                        mv.concepto
                      )}
                    </span>
                  </span>
                  <span className={`font-bold tabular-nums ${mv.tipo === "ingreso" ? "text-ok" : "text-peligro"}`}>
                    {mv.tipo === "ingreso" ? "+" : "-"}{pesos(mv.monto)}
                  </span>
                  {!mv.orden_id && !mv.compra_id && (
                    <form action={borrarMovimiento}>
                      <input type="hidden" name="id" value={mv.id} />
                      <button className="text-xs text-peligro hover:underline" aria-label="Borrar movimiento">Borrar</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Vacio>Sin movimientos este día.</Vacio>
          )}
        </section>

        <aside className="space-y-6">
          <section className="tarjeta p-5">
            <h2 className="titulo text-lg mb-1">Registrar gasto o ingreso</h2>
            <p className="text-xs text-suave mb-4">
              Los cobros de órdenes y las <Link href="/panel/compras/nueva" className="underline">compras</Link> entran solos. Usá esto para gastos sueltos, sueldos o retiros.
            </p>
            <FormCaja />
          </section>
          <section className="tarjeta p-5">
            <h2 className="titulo text-lg mb-3 capitalize">{nombreMes}</h2>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-suave">Ingresos</dt><dd className="font-semibold text-ok tabular-nums">{pesos(mes.ingresos)}</dd></div>
              <div className="flex justify-between"><dt className="text-suave">Egresos</dt><dd className="font-semibold text-peligro tabular-nums">{pesos(mes.egresos)}</dd></div>
              <div className="flex justify-between border-t border-borde pt-1.5"><dt className="font-semibold">Resultado</dt><dd className="font-bold tabular-nums">{pesos(mes.saldo)}</dd></div>
            </dl>
            {(delMes ?? []).length > 0 && (
              <div className="mt-4 text-xs text-suave space-y-1">
                {Object.entries(
                  (delMes ?? []).reduce<Record<string, number>>((a, x) => ({ ...a, [x.categoria]: (a[x.categoria] ?? 0) + x.monto }), {}),
                ).map(([k, v]) => (
                  <div key={k} className="flex justify-between"><span>{CATEGORIAS_CAJA[k]?.label ?? k}</span><span className="tabular-nums">{pesos(v)}</span></div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
