create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

-- First registered user becomes admin
create or replace function public.assign_first_admin()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_admin after insert on auth.users
for each row execute function public.assign_first_admin();

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  status text not null default 'created',
  brief_token text not null unique,
  offer_token text not null unique,
  questions jsonb not null default '[]'::jsonb,
  answers jsonb,
  offer jsonb,
  consent_at timestamptz,
  submitted_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;
create policy "Admins manage projects" on public.projects for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Encrypted personal data (AES-GCM ciphertext only)
create table public.client_pii (
  project_id uuid primary key references public.projects(id) on delete cascade,
  name_enc text,
  phone_enc text,
  email_enc text,
  company_enc text,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.client_pii to authenticated;
grant all on public.client_pii to service_role;
alter table public.client_pii enable row level security;
create policy "Admins manage pii" on public.client_pii for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));