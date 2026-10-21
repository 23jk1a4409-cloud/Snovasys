create function public.grant_document_access(
  p_actor uuid, p_document uuid, p_grantee uuid, p_permission text, p_request_id text
) returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_owner uuid;
begin
  select owner_id into v_owner from public.documents where id = p_document;
  if v_owner is null or v_owner <> p_actor
     or p_grantee = v_owner
     or p_permission not in ('read','edit')
     or not exists (select 1 from public.profiles where id = p_grantee and is_active) then
    perform public.append_audit(p_actor, 'permission.grant', p_document, 'denied',
      jsonb_build_object('permission', p_permission), p_request_id);
    return false;
  end if;
  insert into public.document_grants (document_id, grantee_id, permission, granted_by)
  values (p_document, p_grantee, p_permission, p_actor)
  on conflict (document_id, grantee_id)
  do update set permission = excluded.permission, granted_by = excluded.granted_by, granted_at = now();
  perform public.append_audit(p_actor, 'permission.grant', p_document, 'success',
    jsonb_build_object('grantee', p_grantee, 'permission', p_permission), p_request_id);
  return true;
end $$;
create function public.revoke_document_access(
  p_actor uuid, p_document uuid, p_grantee uuid, p_request_id text
) returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_owner uuid; v_deleted int;
begin
  select owner_id into v_owner from public.documents where id = p_document;
  if v_owner is null or v_owner <> p_actor then
    perform public.append_audit(p_actor, 'permission.revoke', p_document, 'denied', '{}'::jsonb, p_request_id);
    return false;
  end if;
  delete from public.document_grants where document_id = p_document and grantee_id = p_grantee;
  get diagnostics v_deleted = row_count;
  perform public.append_audit(p_actor, 'permission.revoke', p_document, 'success',
    jsonb_build_object('grantee', p_grantee, 'grants_removed', v_deleted), p_request_id);
  return true;
end $$;
revoke all on function public.grant_document_access(uuid,uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.revoke_document_access(uuid,uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.grant_document_access(uuid,uuid,uuid,text,text) to service_role;
grant execute on function public.revoke_document_access(uuid,uuid,uuid,text) to service_role;
