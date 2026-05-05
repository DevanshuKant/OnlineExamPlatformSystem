
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  roll_no text not null,
  branch text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- Exam attempts
create type public.attempt_status as enum ('in_progress','submitted','terminated');
create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score int not null default 0,
  total int not null default 20,
  status public.attempt_status not null default 'in_progress',
  answers jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
alter table public.exam_attempts enable row level security;
create policy "own attempts select" on public.exam_attempts for select using (auth.uid() = user_id);
create policy "own attempts insert" on public.exam_attempts for insert with check (auth.uid() = user_id);
create policy "own attempts update" on public.exam_attempts for update using (auth.uid() = user_id);

-- Violations
create type public.violation_type as enum ('multiple_faces','microphone','tab_switch');
create table public.violations (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  v_type public.violation_type not null,
  details text,
  created_at timestamptz not null default now()
);
alter table public.violations enable row level security;
create policy "own violations select" on public.violations for select using (auth.uid() = user_id);
create policy "own violations insert" on public.violations for insert with check (auth.uid() = user_id);

-- Auto profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, roll_no, branch)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'roll_no',''),
    coalesce(new.raw_user_meta_data->>'branch','')
  );
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
