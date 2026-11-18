# CRM Gomeria & Alineaciones C&P - Plan

## Stack
- **Next.js (App Router) + TypeScript + Tailwind** - una sola app con dos zonas:
  - `/` publico: web del negocio + reserva de turnos
  - `/panel` privado: CRM interno (login)
- **Supabase**: Postgres, Auth (roles), Row Level Security, Storage (fotos/contenidos)
- **Vercel**: deploy
- **Mercado Pago** (fase posterior): sena de turnos via Checkout Pro + webhook
- **Agente IA** (futuro): consume la misma API/DB via herramientas (ver disponibilidad, crear turno, responder FAQ). Por eso toda la logica de turnos vive en funciones reutilizables del servidor, no en la UI.

## Roles
| Rol | Acceso |
|---|---|
| `admin` (dueno) | Todo: caja, reportes, precios, usuarios, marketing |
| `empleado` | Agenda, clientes, ordenes de trabajo, consulta de stock |

## Modelo de datos (fase 1, preparado para las siguientes)
- `profiles` (id = auth.users, nombre, rol)
- `clientes` (nombre, telefono, email, notas, origen: web/whatsapp/local)
- `vehiculos` (cliente_id, patente, marca, modelo, anio, medida_cubierta)
- `servicios` (nombre, duracion_min, precio, activo, requiere_sena, monto_sena)
  - ej: alineacion, balanceo, cambio de cubiertas, rotacion, reparacion de pinchadura, tren delantero
- `recursos` (elevadores/boxes/alineadora: define cuantos turnos simultaneos hay)
- `horarios` (dia_semana, apertura, cierre) + `bloqueos` (feriados, vacaciones)
- `turnos` (cliente_id, vehiculo_id, servicio_id, recurso_id, inicio, fin, estado, origen, notas)
  - estado: `pendiente_pago` | `confirmado` | `en_curso` | `completado` | `cancelado` | `no_asistio`
- `pagos` (turno_id, proveedor, monto, estado, referencia_externa) - vacia hasta activar Mercado Pago

## Fases
1. **Base + Agenda + Clientes + Web de turnos** (HECHO 2026-11-18, codigo en `crm/`)
   - Login y roles
   - ABM clientes y vehiculos (historial por patente)
   - Calendario dia/semana, arrastrar turnos, cambiar estado
   - Web publica: servicios, elegir horario libre, datos, confirmacion
   - Recordatorio por WhatsApp (link wa.me al principio; API despues)
2. **Ordenes de trabajo + Inventario + Caja** (HECHO y probado 2026-11-18)
   - Productos (cubiertas por medida, llantas, valvulas, parches), stock minimo, proveedores
   - Orden de trabajo desde un turno, descuenta stock, cobra
   - Caja diaria y reportes de ventas
3. **Sena con Mercado Pago**
   - Turno queda `pendiente_pago` con vencimiento; webhook lo confirma
4. **Marketing y contenidos** (HECHO 2026-11-18: editor de diseños, plantillas, calendario y campañas por WhatsApp)
   - Calendario editorial, banco de piezas (Storage), plantillas de posts
   - Campañas a clientes: recordatorio por servicio, inactivos y mensaje a todos (HECHO)
5. **Agente IA**
   - Herramientas: `consultar_disponibilidad`, `crear_turno`, `cancelar_turno`, `info_servicios`
   - Canal: WhatsApp / web chat

## Datos que necesito del negocio
- Servicios con duracion y precio aproximado
- Horarios de atencion por dia
- Cuantos turnos en paralelo (elevadores / alineadoras / personal)
- Direccion, telefono/WhatsApp, redes, logo y colores
