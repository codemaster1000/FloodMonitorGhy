create extension if not exists pg_cron with schema cron;

alter table public.flood_reports
  add column if not exists image_path text;

create schema if not exists private;

create or replace function private.delete_flood_report_image()
returns trigger
language plpgsql
security definer
set search_path = public, storage, extensions, private
as $$
begin
  if old.image_path is not null then
    delete from storage.objects
    where bucket_id = 'flood-images'
      and name = old.image_path;
  end if;

  return old;
end;
$$;

create or replace function private.cleanup_expired_flood_reports()
returns void
language plpgsql
security definer
set search_path = public, storage, extensions, private
as $$
begin
  delete from public.flood_reports
  where created_at < now() - interval '2 hours';
end;
$$;

drop trigger if exists flood_reports_delete_image on public.flood_reports;
create trigger flood_reports_delete_image
after delete on public.flood_reports
for each row
execute function private.delete_flood_report_image();

drop policy if exists "Public can delete flood images" on storage.objects;
create policy "Public can delete flood images"
on storage.objects
for delete
to anon, authenticated
using (bucket_id = 'flood-images');

do $$
begin
  if not exists (
    select 1
    from cron.job
    where jobname = 'cleanup_expired_flood_reports'
  ) then
    perform cron.schedule(
      'cleanup_expired_flood_reports',
      '*/15 * * * *',
      $cmd$select private.cleanup_expired_flood_reports();$cmd$
    );
  end if;
end
$$;
