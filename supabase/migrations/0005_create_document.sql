create function public.create_document_with_audit(
  p_owner uuid, p_title text, p_description text, p_category text,
  p_original_filename text, p_storage_path text, p_mime text,
  p_size bigint, p_sha256 text, p_request_id text
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  insert into public.documents
    (owner_id, title, description, category, original_filename, storage_path, mime_type, size_bytes, sha256)
  values
    (p_owner, p_title, p_description, p_category, p_original_filename, p_storage_path, p_mime, p_size, p_sha256)
  returning id into v_id;
  perform public.append_audit(
    p_owner, 'document.upload', v_id, 'success',
    jsonb_build_object('size_bytes', p_size, 'mime_type', p_mime, 'category', p_category),
    p_request_id
  );
  return v_id;
end $$;
revoke all on function public.create_document_with_audit(uuid,text,text,text,text,text,text,bigint,text,text)
  from public, anon, authenticated;
grant execute on function public.create_document_with_audit(uuid,text,text,text,text,text,text,bigint,text,text)
  to service_role;
