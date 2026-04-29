create extension if not exists postgis with schema extensions;

alter table public.flood_reports
  add column if not exists locality_key text,
  add column if not exists locality_name text,
  add column if not exists ward_name text,
  add column if not exists district_name text,
  add column if not exists pincode text,
  add column if not exists locality_source text,
  add column if not exists locality_confidence numeric,
  add column if not exists geom geography(point, 4326)
    generated always as (
      extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::geography
    ) stored;

create index if not exists flood_reports_created_at_idx
  on public.flood_reports (created_at desc);

create index if not exists flood_reports_locality_key_created_at_idx
  on public.flood_reports (locality_key, created_at desc);

create index if not exists flood_reports_geom_gix
  on public.flood_reports
  using gist (geom);