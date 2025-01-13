-- Markalar tablosu
create table public.brands (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  logo_url text,
  sales_manager_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS politikaları
alter table public.brands enable row level security;

-- Markalar tablosu için RLS politikaları
create policy "Markalar herkese görünür"
  on public.brands for select
  to authenticated
  using (true);

create policy "Sadece direktörler marka ekleyebilir/düzenleyebilir/silebilir"
  on public.brands for all
  to authenticated
  using (auth.jwt() ->> 'role' = 'director');

-- Tetikleyici
create trigger handle_updated_at
  before update on public.brands
  for each row
  execute procedure public.handle_updated_at();

-- Foreign key ilişkisi için index
create index brands_sales_manager_id_idx on public.brands(sales_manager_id);

-- Supabase realtime için
comment on table public.brands is '@graphql({"foreign_keys":{"sales_manager_id":{"table":"profiles","column":"id"}}})'; 