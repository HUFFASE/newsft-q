-- Geçici tablo oluştur ve mevcut verileri kopyala
CREATE TEMP TABLE temp_targets AS 
SELECT * FROM targets;

-- Mevcut tabloyu sil
DROP TABLE targets;

-- Yeni yapıda targets tablosunu oluştur
CREATE TABLE targets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
    revenue DECIMAL NOT NULL DEFAULT 0,
    profit DECIMAL NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(brand_id, year, quarter)
);

-- RLS politikalarını güncelle
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;

-- Tüm kullanıcıların hedefleri görmesine izin ver
DROP POLICY IF EXISTS "Hedefleri herkes görebilir" ON targets;
CREATE POLICY "Hedefleri herkes görebilir" ON targets
    FOR SELECT USING (true);

-- Sadece director'ların hedef eklemesine ve güncellemesine izin ver
DROP POLICY IF EXISTS "Hedefleri sadece director ekleyebilir" ON targets;
CREATE POLICY "Hedefleri sadece director ekleyebilir" ON targets
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'director'
        )
    );

DROP POLICY IF EXISTS "Hedefleri sadece director güncelleyebilir" ON targets;
CREATE POLICY "Hedefleri sadece director güncelleyebilir" ON targets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'director'
        )
    );

-- Sadece director'ların hedef silmesine izin ver
DROP POLICY IF EXISTS "Hedefleri sadece director silebilir" ON targets;
CREATE POLICY "Hedefleri sadece director silebilir" ON targets
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'director'
        )
    );

-- Trigger fonksiyonu
CREATE OR REPLACE FUNCTION update_targets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı ekle
CREATE TRIGGER update_targets_updated_at
    BEFORE UPDATE ON targets
    FOR EACH ROW
    EXECUTE FUNCTION update_targets_updated_at();

-- Geçici tabloyu sil
DROP TABLE temp_targets; 