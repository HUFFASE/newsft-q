-- Önce mevcut tabloyu ve politikaları temizleyelim
drop policy if exists "Forecastler herkese görünür" on public.forecasts;
drop policy if exists "Forecast ekleme politikası" on public.forecasts;
drop policy if exists "Forecast güncelleme politikası" on public.forecasts;
drop policy if exists "Forecast silme politikası" on public.forecasts;
drop table if exists public.forecasts;

-- Forecasts tablosunu yeniden oluşturalım
create table public.forecasts (
  id uuid default gen_random_uuid() primary key,
  brand_id uuid references public.brands(id) on delete cascade not null,
  year integer not null check (year >= 2024 and year <= 2030),
  quarter integer not null check (quarter >= 1 and quarter <= 4),
  revenue numeric not null check (revenue >= 0),
  profit numeric not null check (profit >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(brand_id, year, quarter)
);

-- RLS'i aktif edelim
alter table public.forecasts enable row level security;

-- Yeni politikalar ekleyelim
create policy "Forecastler herkese görünür"
  on public.forecasts
  for select
  to authenticated
  using (true);

create policy "Forecast ekleme politikası"
  on public.forecasts
  for insert
  to authenticated
  with check (
    (select role from public.profiles where id = auth.uid()) = 'director'
    OR 
    (
      (select role from public.profiles where id = auth.uid()) = 'sales_manager'
      AND
      brand_id IN (
        select id from public.brands 
        where sales_manager_id = auth.uid()
      )
    )
  );

create policy "Forecast güncelleme politikası"
  on public.forecasts
  for update
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) = 'director'
    OR 
    (
      (select role from public.profiles where id = auth.uid()) = 'sales_manager'
      AND
      brand_id IN (
        select id from public.brands 
        where sales_manager_id = auth.uid()
      )
    )
  )
  with check (
    (select role from public.profiles where id = auth.uid()) = 'director'
    OR 
    (
      (select role from public.profiles where id = auth.uid()) = 'sales_manager'
      AND
      brand_id IN (
        select id from public.brands 
        where sales_manager_id = auth.uid()
      )
    )
  );

create policy "Forecast silme politikası"
  on public.forecasts
  for delete
  to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) = 'director'
    OR 
    (
      (select role from public.profiles where id = auth.uid()) = 'sales_manager'
      AND
      brand_id IN (
        select id from public.brands 
        where sales_manager_id = auth.uid()
      )
    )
  );

-- Tetikleyici ekleyelim
create trigger handle_updated_at
  before update on public.forecasts
  for each row
  execute procedure public.handle_updated_at(); 

-- Dashboard için view'lar
create or replace view public.forecast_summary as
select 
  year,
  sum(revenue) as total_revenue,
  sum(profit) as total_profit,
  case 
    when sum(revenue) > 0 then round((sum(profit)::numeric / sum(revenue)::numeric * 100)::numeric, 1)
    else 0 
  end as profit_margin
from public.forecasts
group by year;

create or replace view public.forecast_quarterly_summary as
select 
  year,
  quarter,
  sum(revenue) as total_revenue,
  sum(profit) as total_profit,
  case 
    when sum(revenue) > 0 then round((sum(profit)::numeric / sum(revenue)::numeric * 100)::numeric, 1)
    else 0 
  end as profit_margin
from public.forecasts
group by year, quarter
order by year, quarter; 