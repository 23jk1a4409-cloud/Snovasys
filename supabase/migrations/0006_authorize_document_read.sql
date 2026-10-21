create function public.authorize_document_read(
  p_user uuid, p_document uuid, p_request_id text
) returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_path text;
  v_allowed boolean := false;
begin
  select d.storage_path,
         (d.owner_id = p_user or exists (
            select 1 from public.document_grants g
            where g.document_id = d.id and g.grantee_id = p_user))
    into v_path, v_allowed
  from public.documents d
  where d.id = p_document;
  if v_path is not null and v_allowed then
    perform public.append_audit(p_user, 'document.download', p_document, 'success', '{}'::jsonb, p_request_id);
    return v_path;
  end if;
  -- Same audit row whether the document is missing or merely not allowed.
  perform public.append_audit(p_user, 'document.download', p_document, 'denied', '{}'::jsonb, p_request_id);
  return null;
end $$;
revoke all on function public.authorize_document_read(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.authorize_document_read(uuid,uuid,text) to service_role;
