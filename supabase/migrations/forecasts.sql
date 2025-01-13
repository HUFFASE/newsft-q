-- Önce mevcut tabloyu ve bağlantılı nesneleri temizleyelim
drop policy if exists "Forecast herkese görünür" on public.forecasts;
drop policy if exists "Direktörler forecast ekleyebilir" on public.forecasts;
drop policy if exists "Direktörler forecast düzenleyebilir" on public.forecasts;
drop policy if exists "Direktörler forecast silebilir" on public.forecasts;
drop trigger if exists handle_updated_at on public.forecasts;
drop table if exists public.forecasts cascade;

-- Forecast tablosu
create table public.forecasts (
  id uuid default gen_random_uuid() primary key,
  brand_id uuid references public.brands(id) on delete cascade,
  year integer not null check (year >= 2024 and year <= 2030),
  quarter integer not null check (quarter >= 1 and quarter <= 4),
  revenue numeric not null check (revenue >= 0),
  profit numeric not null check (profit >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(brand_id, year, quarter)
);

-- RLS politikaları
alter table public.forecasts enable row level security;

create policy "Forecast herkese görünür"
  on public.forecasts for select
  to authenticated
  using (true);

create policy "Direktörler forecast ekleyebilir"
  on public.forecasts for insert
  to authenticated
  using (auth.jwt() ->> 'role' = 'director')
  with check (auth.jwt() ->> 'role' = 'director');

create policy "Direktörler forecast düzenleyebilir"
  on public.forecasts for update
  to authenticated
  using (auth.jwt() ->> 'role' = 'director')
  with check (auth.jwt() ->> 'role' = 'director');

create policy "Direktörler forecast silebilir"
  on public.forecasts for delete
  to authenticated
  using (auth.jwt() ->> 'role' = 'director');

-- Tetikleyici
create trigger handle_updated_at
  before update on public.forecasts
  for each row
  execute procedure public.handle_updated_at(); 