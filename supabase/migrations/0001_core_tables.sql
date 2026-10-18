create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'viewer' check (role in ('admin','owner','viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '',
  category text not null default 'general',
  original_filename text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  sha256 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index documents_owner_idx on public.documents(owner_id);

create table public.document_grants (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  grantee_id uuid not null references public.profiles(id),
  permission text not null check (permission in ('read','edit')),
  granted_by uuid not null references public.profiles(id),
  granted_at timestamptz not null default now(),
  unique (document_id, grantee_id)
);
create index grants_grantee_idx on public.document_grants(grantee_id);

alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_grants enable row level security;
revoke all on public.profiles, public.documents, public.document_grants from anon, authenticated;