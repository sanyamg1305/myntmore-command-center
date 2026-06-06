
-- Roles enum + user_roles table (separate from profiles to avoid privilege escalation)
create type public.app_role as enum ('admin', 'member');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "user_roles_self_read" on public.user_roles for select
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "user_roles_admin_write" on public.user_roles for all
  using (public.has_role(auth.uid(), 'admin'));

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  department text default 'admin',
  invite_status text default 'active',
  disabled boolean default false,
  invited_by uuid,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;

create policy "profiles_read_all_auth" on public.profiles for select
  using (auth.role() = 'authenticated');
create policy "profiles_update_own" on public.profiles for update
  using (auth.uid() = id);
create policy "profiles_admin_all" on public.profiles for all
  using (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Invites
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  department text not null,
  role text default 'member',
  token text unique not null default gen_random_uuid()::text,
  status text default 'pending',
  invited_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.invites enable row level security;
create policy "invites_admin_all" on public.invites for all using (public.has_role(auth.uid(), 'admin'));
create policy "invites_read_by_token" on public.invites for select using (true);

-- Clients
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  status text default 'active',
  content_manager_id uuid references public.profiles(id),
  leadgen_manager_id uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.clients enable row level security;
create policy "clients_read_auth" on public.clients for select using (auth.role() = 'authenticated');
create policy "clients_admin_write" on public.clients for all using (public.has_role(auth.uid(), 'admin'));

create table public.client_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text,
  unique(client_id, user_id, role)
);
alter table public.client_assignments enable row level security;
create policy "ca_read_auth" on public.client_assignments for select using (auth.role() = 'authenticated');
create policy "ca_admin_write" on public.client_assignments for all using (public.has_role(auth.uid(), 'admin'));

create or replace function public.is_assigned(_user_id uuid, _client_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.client_assignments where user_id = _user_id and client_id = _client_id)
$$;

-- Weekly data
create table public.weekly_data (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  week_label text,
  content_metrics jsonb default '{}'::jsonb,
  leadgen_metrics jsonb default '{}'::jsonb,
  content_submitted_at timestamptz,
  leadgen_submitted_at timestamptz,
  content_submitted_by uuid references public.profiles(id),
  leadgen_submitted_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  unique(client_id, week_start)
);
alter table public.weekly_data enable row level security;
create policy "wd_admin" on public.weekly_data for all using (public.has_role(auth.uid(), 'admin'));
create policy "wd_assigned" on public.weekly_data for all using (public.is_assigned(auth.uid(), client_id));

-- High scores
create table public.high_scores (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  metric_id text not null,
  metric_name text,
  lifetime_high numeric,
  achieved_week date,
  previous_high numeric,
  updated_at timestamptz default now(),
  unique(client_id, metric_id)
);
alter table public.high_scores enable row level security;
create policy "hs_read_auth" on public.high_scores for select using (auth.role() = 'authenticated');
create policy "hs_admin_write" on public.high_scores for all using (public.has_role(auth.uid(), 'admin'));
create policy "hs_assigned_write" on public.high_scores for all using (public.is_assigned(auth.uid(), client_id));

-- Actionables
create table public.actionables (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assignee_id uuid references public.profiles(id),
  assigner_id uuid references public.profiles(id),
  client_id uuid references public.clients(id) on delete set null,
  week_start date,
  status text default 'open',
  due_date date,
  created_at timestamptz default now()
);
alter table public.actionables enable row level security;
create policy "act_read_auth" on public.actionables for select using (auth.role() = 'authenticated');
create policy "act_write_auth" on public.actionables for all using (auth.role() = 'authenticated');

-- TJ weekly
create table public.tj_weekly_data (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  week_end date not null,
  week_label text,
  instagram jsonb default '{}'::jsonb,
  youtube jsonb default '{}'::jsonb,
  linkedin_newsletter jsonb default '{}'::jsonb,
  email_newsletter jsonb default '{}'::jsonb,
  podcast jsonb default '{}'::jsonb,
  video_pipeline jsonb default '{}'::jsonb,
  submitted_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.tj_weekly_data enable row level security;
create policy "tj_read_auth" on public.tj_weekly_data for select using (auth.role() = 'authenticated');
create policy "tj_write_auth" on public.tj_weekly_data for all using (auth.role() = 'authenticated');

-- Sales weekly
create table public.sales_weekly_data (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  week_end date not null,
  week_label text,
  tj_outreach jsonb default '{}'::jsonb,
  jahnvi_outreach jsonb default '{}'::jsonb,
  shirin_outreach jsonb default '{}'::jsonb,
  cold_email jsonb default '{}'::jsonb,
  meeting_tracker jsonb default '{}'::jsonb,
  submitted_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.sales_weekly_data enable row level security;
create policy "sales_admin_all" on public.sales_weekly_data for all using (public.has_role(auth.uid(), 'admin'));

-- Hot leads
create table public.hot_leads (
  id uuid primary key default gen_random_uuid(),
  lead_name text not null,
  company text,
  source text,
  owner_id uuid references public.profiles(id),
  status text default 'New',
  probability integer default 0,
  deal_value numeric default 0,
  weighted_value numeric generated always as (deal_value * probability / 100.0) stored,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.hot_leads enable row level security;
create policy "leads_admin_all" on public.hot_leads for all using (public.has_role(auth.uid(), 'admin'));

-- Client settings
create table public.client_settings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade unique,
  active_content_metrics text[] default array['C01','C02','C03','C04','C05','C06','C07','C08','C09','C10','C11','C12','C13','C14','C15','C16','C17','C18','C19','C20','C21','C22','C23','C24','C25'],
  active_leadgen_metrics text[] default array['L01','L02','L03','L04','L05','L06','L07','L08','L09','L10','L11','L12','L13','L14','L15','L16','L17','L18','L19','L20','L21','L22','L23','L24','L25','L26','L27','L28','L29','L30','L31','L32','L33','L34','L35','L36','L37'],
  custom_targets jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);
alter table public.client_settings enable row level security;
create policy "cs_read_auth" on public.client_settings for select using (auth.role() = 'authenticated');
create policy "cs_admin_write" on public.client_settings for all using (public.has_role(auth.uid(), 'admin'));

-- Finance
create table public.finance_data (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  client_id uuid references public.clients(id) on delete cascade,
  monthly_fee numeric default 0,
  payment_status text default 'pending',
  date_received date,
  notes text
);
alter table public.finance_data enable row level security;
create policy "fin_admin_all" on public.finance_data for all using (public.has_role(auth.uid(), 'admin'));

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  category text,
  amount numeric default 0,
  notes text
);
alter table public.expenses enable row level security;
create policy "exp_admin_all" on public.expenses for all using (public.has_role(auth.uid(), 'admin'));

-- Initiatives
create table public.initiatives (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  owner_id uuid references public.profiles(id),
  status text default 'Not Started',
  percent_complete integer default 0,
  target_date date,
  blockers text,
  notes text,
  week_updates jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
alter table public.initiatives enable row level security;
create policy "init_read_auth" on public.initiatives for select using (auth.role() = 'authenticated');
create policy "init_admin_write" on public.initiatives for all using (public.has_role(auth.uid(), 'admin'));
