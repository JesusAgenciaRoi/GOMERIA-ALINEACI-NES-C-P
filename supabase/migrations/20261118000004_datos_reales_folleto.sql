-- Servicios y contacto segun los folletos del negocio (aplicado 2026-11-18). Precios a cargar desde el panel.
delete from public.servicios where nombre in ('Rotación de cubiertas','Revisión de tren delantero')
  and not exists (select 1 from public.turnos t where t.servicio_id = servicios.id);
update public.servicios set nombre='Alineación 3D', descripcion='Alineación computarizada 3D para autos y camionetas', precio=null, orden=1 where nombre='Alineación';
update public.servicios set descripcion='Alineación 3D y balanceo de las 4 ruedas', precio=null, orden=2 where nombre='Alineación + balanceo';
update public.servicios set nombre='Balanceo', descripcion='Balanceo de las 4 ruedas para un manejo sin vibraciones', precio=null, orden=3 where nombre='Balanceo (4 ruedas)';
update public.servicios set nombre='Montaje de cubiertas', descripcion='Servicio para todas las medidas de cubiertas', precio=null, orden=4 where nombre='Cambio de cubiertas';
update public.servicios set descripcion='Parche o tarugo según el daño', precio=null, orden=5 where nombre='Reparación de pinchadura';
insert into public.servicios (nombre, descripcion, duracion_min, precio, tipo_recurso, reservable_web, orden) values
  ('Chequeo general', 'Revisión general del vehículo: tren delantero, frenos y cubiertas', 30, null, 'elevador', true, 6),
  ('Mecánica ligera', 'Service y reparaciones menores', 60, null, 'elevador', true, 7),
  ('Cubiertas nuevas y de ocasión', 'Venta de cubiertas nuevas y usadas en buen estado, todas las medidas', 30, null, 'elevador', false, 8);
update public.config_negocio set nombre='Gomería & Alineaciones C&P', whatsapp='099327532', telefono='099327532 / 099377126', zona_horaria='America/Montevideo' where id=1;
