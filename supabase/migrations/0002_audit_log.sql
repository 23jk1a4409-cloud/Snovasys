create table public.audit_log (
  seq bigint generated always as identity primary key,
  id uuid not null,
  occurred_at timestamptz not null,
  actor_id uuid,
  action text not null,
  document_id uuid,
  outcome text not null check (outcome in ('success','denied','error')),
  metadata jsonb not null default '{}'::jsonb,
  request_id text,
  prev_hash text not null,
  row_hash text not null
);
create index audit_doc_idx on public.audit_log(document_id);
create index audit_actor_idx on public.audit_log(actor_id);

create function public.audit_compute_hash(
  p_id uuid, p_at timestamptz, p_actor uuid, p_action text, p_doc uuid,
  p_outcome text, p_meta jsonb, p_req text, p_prev text
) returns text language sql stable as $$
  select encode(sha256(convert_to(concat_ws('|',
    p_id::text,
    to_char(p_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'),
    coalesce(p_actor::text, ''), p_action, coalesce(p_doc::text, ''),
    p_outcome, p_meta::text, coalesce(p_req, ''), p_prev
  ), 'UTF8')), 'hex');
$$;

create function public.append_audit(
  p_actor uuid, p_action text, p_document uuid, p_outcome text,
  p_metadata jsonb default '{}'::jsonb, p_request_id text default null
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_prev text;
  v_id uuid := gen_random_uuid();
  v_at timestamptz := clock_timestamp();
begin
  perform pg_advisory_xact_lock(727001);
  select row_hash into v_prev from public.audit_log order by seq desc limit 1;
  v_prev := coalesce(v_prev, repeat('0', 64));
  insert into public.audit_log
    (id, occurred_at, actor_id, action, document_id, outcome, metadata, request_id, prev_hash, row_hash)
  values
    (v_id, v_at, p_actor, p_action, p_document, p_outcome, p_metadata, p_request_id, v_prev,
     public.audit_compute_hash(v_id, v_at, p_actor, p_action, p_document, p_outcome, p_metadata, p_request_id, v_prev));
  return v_id;
end $$;

create function public.audit_block_changes() returns trigger language plpgsql as $$
begin
  raise exception 'audit_log is append-only';
end $$;

create trigger audit_no_update_delete before update or delete on public.audit_log
  for each row execute function public.audit_block_changes();
create trigger audit_no_truncate before truncate on public.audit_log
  for each statement execute function public.audit_block_changes();

create function public.verify_audit_chain()
returns table(ok boolean, first_bad_seq bigint)
language plpgsql security definer set search_path = public, pg_temp as $$
declare r record; v_prev text := repeat('0', 64);
begin
  for r in select * from public.audit_log order by seq loop
    if r.prev_hash <> v_prev or r.row_hash <> public.audit_compute_hash(
         r.id, r.occurred_at, r.actor_id, r.action, r.document_id,
         r.outcome, r.metadata, r.request_id, r.prev_hash) then
      return query select false, r.seq;
      return;
    end if;
    v_prev := r.row_hash;
  end loop;
  return query select true, null::bigint;
end $$;

alter table public.audit_log enable row level security;
revoke all on public.audit_log from public, anon, authenticated, service_role;
grant select on public.audit_log to service_role;
revoke all on function public.append_audit(uuid,text,uuid,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.append_audit(uuid,text,uuid,text,jsonb,text) to service_role;
revoke all on function public.verify_audit_chain() from public, anon, authenticated;
grant execute on function public.verify_audit_chain() to service_role;
