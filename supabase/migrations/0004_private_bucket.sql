-- Private bucket for uploaded documents. public = false means no public URLs.
-- No storage policies are added, so browser roles (anon, authenticated) get no access.
-- Only the server, using the secret key, can read or write these files.
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 10485760)
on conflict (id) do nothing;
