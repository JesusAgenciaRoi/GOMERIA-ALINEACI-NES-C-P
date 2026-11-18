-- Datos de ejemplo: reemplazar con los reales del negocio desde el panel
insert into public.config_negocio (id, nombre) values (1, 'Gomería & Alineaciones C&P') on conflict do nothing;

insert into public.recursos (nombre, tipo) values
  ('Elevador 1', 'elevador'),
  ('Elevador 2', 'elevador'),
  ('Alineadora', 'alineadora');

insert into public.servicios (nombre, descripcion, duracion_min, precio, tipo_recurso, orden) values
  ('Alineación', 'Alineación computarizada de tren delantero', 45, 35000, 'alineadora', 1),
  ('Alineación + balanceo', 'Alineación y balanceo de las 4 ruedas', 90, 50000, 'alineadora', 2),
  ('Balanceo (4 ruedas)', 'Balanceo electrónico de las 4 ruedas', 45, 20000, 'elevador', 3),
  ('Cambio de cubiertas', 'Desmontaje y montaje de cubiertas', 60, 15000, 'elevador', 4),
  ('Rotación de cubiertas', 'Rotación para desgaste parejo', 30, 10000, 'elevador', 5),
  ('Reparación de pinchadura', 'Parche o tarugo según el daño', 30, 8000, 'elevador', 6),
  ('Revisión de tren delantero', 'Diagnóstico de suspensión y dirección', 30, null, 'elevador', 7);

-- Lunes a viernes 8:30-12:30 y 14:30-19:00, sabados 8:30-13:00
insert into public.horarios (dia_semana, apertura, cierre)
select d, '08:30'::time, '12:30'::time from generate_series(1, 5) d
union all
select d, '14:30'::time, '19:00'::time from generate_series(1, 5) d
union all
select 6, '08:30'::time, '13:00'::time;
