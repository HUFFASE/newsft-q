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

-- Targets tablosunu güncelle
DROP TABLE IF EXISTS public.targets CASCADE;

CREATE TABLE public.targets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  brand_id UUID REFERENCES public.brands(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
  profit DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (brand_id, year, month)
);

-- RLS politikalarını güncelle
ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Direktörler hedef ekleyebilir" ON public.targets;
DROP POLICY IF EXISTS "Direktörler hedef güncelleyebilir" ON public.targets;
DROP POLICY IF EXISTS "Direktörler hedef silebilir" ON public.targets;
DROP POLICY IF EXISTS "Herkes hedefleri görebilir" ON public.targets;

CREATE POLICY "Direktörler hedef ekleyebilir"
  ON public.targets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'director'
    )
  );

CREATE POLICY "Direktörler hedef güncelleyebilir"
  ON public.targets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'director'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'director'
    )
  );

CREATE POLICY "Direktörler hedef silebilir"
  ON public.targets
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'director'
    )
  );

CREATE POLICY "Herkes hedefleri görebilir"
  ON public.targets
  FOR SELECT
  TO authenticated
  USING (true); 