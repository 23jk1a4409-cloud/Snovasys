-- The server (service_role) needs explicit access to the app tables.
-- Browser roles (anon, authenticated) stay fully revoked.
grant select, insert, update, delete
  on public.profiles, public.documents, public.document_grants
  to service_role;
