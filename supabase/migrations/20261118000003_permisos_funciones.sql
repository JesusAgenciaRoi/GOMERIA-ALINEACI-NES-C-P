-- Las funciones de rol solo las necesitan usuarios logueados (policies de authenticated)
drop policy servicios_lectura on public.servicios;
create policy servicios_lectura_anon on public.servicios for select to anon using (activo);
create policy servicios_lectura_auth on public.servicios for select to authenticated
  using (activo or (select public.es_staff()));

revoke execute on function public.es_staff() from public, anon;
revoke execute on function public.es_admin() from public, anon;
revoke execute on function public.rol_actual() from public, anon;
grant execute on function public.es_staff() to authenticated;
grant execute on function public.es_admin() to authenticated;
grant execute on function public.rol_actual() to authenticated;
