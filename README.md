# CRM Gomería & Alineaciones C&P

Next.js 16 + Supabase. Web pública con reserva de turnos (`/`) y panel interno (`/panel`).

## Correr en local

```bash
npm install
npm run dev
```

Abrir http://localhost:3000. Las variables están en `.env.local` (ver `.env.example`).

> La carpeta del proyecto tiene `&` en el nombre, que rompe los scripts de npm en Windows (cmd.exe).
> Por eso `.npmrc` usa Git Bash como shell de scripts. Si Git está en otra ruta, ajustá `script-shell`.

## Primer uso

1. Entrar a `/login` > "Crear cuenta". **La primera cuenta es la del dueño (admin).**
2. Confirmar el email (Supabase manda el link). En Supabase > Authentication > URL Configuration,
   poner como Site URL la URL real del sitio (en local `http://localhost:3000`) y agregar
   `<sitio>/auth/callback` a Redirect URLs.
3. En `/panel/configuracion` cargar datos del negocio, servicios y precios reales, horarios y elevadores/máquinas.
4. Los empleados crean su cuenta en `/login`; el admin los habilita en `/panel/usuarios`.

## Estructura

- `supabase/migrations/` esquema, RLS y datos de ejemplo (ya aplicados al proyecto Supabase).
- Lógica de turnos en la base (reutilizable por web, panel y el futuro agente IA):
  - `disponibilidad(servicio, fecha)` horarios libres
  - `reservar_turno(...)` crea/reutiliza cliente (por teléfono) y vehículo (por patente) y agenda
  - `recurso_libre(tipo, inicio, fin)` primer elevador/máquina libre
  - La restricción `turnos_sin_superposicion` impide dos turnos solapados en el mismo recurso.
- `src/app/page.tsx` + `Reserva.tsx`: web pública y flujo de reserva.
- `src/app/panel/`: inicio, agenda (día/semana), clientes y vehículos, turnos, configuración, usuarios.
- Fase 2 (inventario, órdenes y caja):
  - `cobrar_orden(orden, pagos, factura)` registra los pagos en caja (pueden ser varios medios), descuenta stock y completa el turno.
  - `anular_orden(orden, motivo)` (si estaba cobrada, solo admin) devuelve stock y registra el reintegro en caja.
  - El stock solo cambia a través de `movimientos_stock` (ingreso, venta, ajuste, devolución).
  - Una orden cobrada o anulada no se puede modificar (lo controla la base).
  - `/imprimir/orden/[id]` versión imprimible / PDF de la orden.
- Compras (`/panel/compras`):
  - `registrar_compra(datos)` en un solo paso: suma stock de productos existentes (y actualiza su costo), crea productos nuevos, registra herramientas/gastos que no van al inventario y el egreso en caja (agrupado por categoría). Con "cuenta corriente" no toca la caja.
  - `anular_compra(compra)` (solo admin) descuenta el stock sumado y borra el pago de caja.
- Órdenes: ítem "Insumo incluido" (producto a precio 0 que descuenta stock al cobrar). La vista `productos_reservado` muestra lo comprometido en órdenes sin cobrar.

- Contenidos (`/panel/contenidos`): editor de diseños para redes (Fabric.js 7) en `src/components/editor/`.
  - `plantillas.ts`: plantillas (Nuevo servicio, Nuestros servicios, Promoción, Foto + título, Horarios, Aviso). En Fabric 7 `left/top` son el centro del objeto.
  - Los diseños se guardan como JSON en la tabla `disenos`; fotos y vistas previas en el bucket público `contenidos`.
- Campañas (`/panel/campanas`): mensajes de WhatsApp a clientes vía links `wa.me` (sin API de WhatsApp).
  - Tipos: `recordatorio` (última vez con ciertos servicios hace X meses), `inactivos` (sin venir hace X meses), `libre` (todos).
  - `campana_destinatarios(campana)` arma la lista con turnos completados + servicios de órdenes terminadas/cobradas. Pensada para reutilizar desde el agente IA.
  - Cada "Enviar por WhatsApp" queda en `campana_envios`; un cliente vuelve a aparecer como pendiente solo después de una nueva visita.
  - `clientes.acepta_promos = false` excluye al cliente de todas las campañas.
  - Variables del mensaje: `{nombre}`, `{servicio}`, `{vehiculo}`, `{meses}`, `{negocio}` (ver `src/lib/campanas.ts`).

## Capacidad del taller

- Trabaja una sola persona con un elevador y una alineadora (`Elevador 2` quedó inactivo).
- `config_negocio.personas` (Configuración > Personas trabajando) es el máximo de turnos al mismo tiempo. Hoy es 1.
- `capacidad_libre(inicio, fin)` lo verifica y `recurso_libre` lo incluye, así la web, el panel y el agente nunca ofrecen un horario superpuesto.
- El trigger `turnos_capacidad` lo garantiza en la base aunque dos reservas lleguen a la vez (error `horario_no_disponible: persona_ocupada`).
- "Estoy ocupado" en el inicio del panel crea un bloqueo general (`motivo = 'Trabajo sin turno'`) para clientes que llegan sin turno.

## Roles

- **admin**: todo, incluida configuración, usuarios y borrar registros.
- **empleado**: agenda, clientes, vehículos y turnos.
- **pendiente**: sin acceso hasta que el admin lo habilite.
