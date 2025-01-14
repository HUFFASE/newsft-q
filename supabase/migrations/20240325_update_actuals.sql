-- Actuals tablosunu yeniden oluştur
DROP TABLE IF EXISTS public.actuals CASCADE;

CREATE TABLE public.actuals (
  id BIGSERIAL PRIMARY KEY,
  brand_id UUID REFERENCES public.brands(id),
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
  profit DECIMAL(15,2) NOT NULL DEFAULT 0,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS politikalarını güncelle
ALTER TABLE public.actuals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Direktörler gerçekleşen verileri ekleyebilir/düzenleyebilir" ON public.actuals;
DROP POLICY IF EXISTS "Herkes gerçekleşen verileri görebilir" ON public.actuals;

-- Direktörler için INSERT/UPDATE politikası
CREATE POLICY "Direktörler veri ekleyebilir"
  ON public.actuals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'director'
    )
  );

CREATE POLICY "Direktörler veri güncelleyebilir"
  ON public.actuals
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

-- Herkes için okuma izni
CREATE POLICY "Herkes gerçekleşen verileri görebilir"
  ON public.actuals
  FOR SELECT
  TO authenticated
  USING (true);

-- Çeyrek kapanma durumunu kontrol eden fonksiyon
CREATE OR REPLACE FUNCTION check_quarter_closure()
RETURNS TRIGGER AS $$
BEGIN
  -- Eğer çeyrek kapandıysa, aynı yıl ve çeyrek için yeni veri girişi veya güncelleme yapılamaz
  IF EXISTS (
    SELECT 1 FROM public.actuals
    WHERE year = NEW.year 
    AND quarter = NEW.quarter 
    AND is_closed = true
    AND id != COALESCE(NEW.id, -1)
  ) THEN
    RAISE EXCEPTION 'Bu çeyrek kapanmış durumda. Değişiklik yapamazsınız.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tetikleyiciyi ekle
DROP TRIGGER IF EXISTS check_quarter_closure_trigger ON public.actuals;

CREATE TRIGGER check_quarter_closure_trigger
  BEFORE INSERT OR UPDATE ON public.actuals
  FOR EACH ROW
  EXECUTE FUNCTION check_quarter_closure(); 