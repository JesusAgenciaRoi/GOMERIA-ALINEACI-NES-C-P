-- Fase 4: contenidos para redes (editor de diseños + planificación)

create table public.disenos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null default 'Sin título',
  formato text not null default 'post' check (formato in ('post', 'vertical', 'historia', 'afiche')),
  ancho int not null,
  alto int not null,
  datos jsonb not null default '{}'::jsonb,
  preview_path text,
  estado text not null default 'borrador' check (estado in ('borrador', 'listo', 'programado', 'publicado')),
  fecha_publicacion date,
  redes text[] not null default '{}',
  texto_publicacion text,
  creado_por uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index disenos_fecha_idx on public.disenos (fecha_publicacion);
create index disenos_updated_idx on public.disenos (updated_at desc);
create index disenos_creado_por_idx on public.disenos (creado_por);

create function public.tocar_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end $$;
create trigger disenos_updated before update on public.disenos
  for each row execute function public.tocar_updated_at();
revoke execute on function public.tocar_updated_at() from public, anon, authenticated;

alter table public.disenos enable row level security;
create policy disenos_staff_sel on public.disenos for select to authenticated using ((select public.es_staff()));
create policy disenos_staff_ins on public.disenos for insert to authenticated with check ((select public.es_staff()));
create policy disenos_staff_upd on public.disenos for update to authenticated using ((select public.es_staff())) with check ((select public.es_staff()));
create policy disenos_staff_del on public.disenos for delete to authenticated using ((select public.es_staff()));

-- Almacenamiento de fotos y piezas terminadas (lectura publica para poder compartir/descargar)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contenidos', 'contenidos', true, 15728640, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy contenidos_staff_sel on storage.objects for select to authenticated
  using (bucket_id = 'contenidos' and (select public.es_staff()));
create policy contenidos_staff_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'contenidos' and (select public.es_staff()));
create policy contenidos_staff_upd on storage.objects for update to authenticated
  using (bucket_id = 'contenidos' and (select public.es_staff()));
create policy contenidos_staff_del on storage.objects for delete to authenticated
  using (bucket_id = 'contenidos' and (select public.es_staff()));
