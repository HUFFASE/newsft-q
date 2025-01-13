-- Kullanıcılar tablosu
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('director', 'sales_manager')),
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS politikaları
alter table public.profiles enable row level security;

-- Kullanıcılar tablosu için RLS politikaları
create policy "Kullanıcılar herkese görünür"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Sadece direktörler kullanıcı ekleyebilir/düzenleyebilir/silebilir"
  on public.profiles for all
  to authenticated
  using (auth.jwt() ->> 'role' = 'director');

-- Tetikleyici fonksiyonu
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- Tetikleyici
create trigger handle_updated_at
  before update on public.profiles
  for each row
  execute procedure public.handle_updated_at();

-- Yeni kullanıcı kaydı olduğunda otomatik profil oluşturma
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'sales_manager'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

-- Yeni kullanıcı tetikleyicisi
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user(); 