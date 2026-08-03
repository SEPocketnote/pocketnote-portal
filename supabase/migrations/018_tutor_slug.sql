alter table tutors add column if not exists slug text;

-- Backfill slugs for existing tutors from legal_name
do $$
declare
  rec record;
  base_slug text;
  new_slug text;
  counter int;
begin
  for rec in select id, legal_name from tutors where slug is null loop
    base_slug := lower(
      regexp_replace(
        regexp_replace(rec.legal_name, '[^a-zA-Z0-9\s]', '', 'g'),
        '\s+', '-', 'g'
      )
    );
    base_slug := trim(both '-' from base_slug);
    new_slug := base_slug;
    counter := 2;
    while exists (select 1 from tutors where slug = new_slug) loop
      new_slug := base_slug || '-' || counter;
      counter := counter + 1;
    end loop;
    update tutors set slug = new_slug where id = rec.id;
  end loop;
end;
$$;

alter table tutors alter column slug set not null;
create unique index if not exists tutors_slug_idx on tutors(slug);
