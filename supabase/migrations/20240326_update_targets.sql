-- Geçici tablo oluştur
CREATE TABLE temp_targets AS 
SELECT * FROM targets;

-- Mevcut tabloyu sil
DROP TABLE IF EXISTS targets CASCADE;

-- Yeni yapıda targets tablosunu oluştur
CREATE TABLE targets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    brand_id UUID REFERENCES brands(id),
    year INTEGER NOT NULL,
    quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
    revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
    profit DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS politikalarını güncelle
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;

-- Direktörler için INSERT politikası
CREATE POLICY "Direktörler hedef ekleyebilir"
    ON targets
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'director'
        )
    );

-- Direktörler için UPDATE politikası
CREATE POLICY "Direktörler hedef güncelleyebilir"
    ON targets
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

-- Herkes için SELECT politikası
CREATE POLICY "Herkes hedefleri görebilir"
    ON targets
    FOR SELECT
    TO authenticated
    USING (true);

-- Geçici tablodan verileri yeni tabloya aktar
INSERT INTO targets (
    id,
    brand_id,
    year,
    quarter,
    revenue,
    profit,
    created_at,
    updated_at
)
SELECT 
    id,
    brand_id,
    year,
    CASE 
        WHEN month BETWEEN 1 AND 3 THEN 1
        WHEN month BETWEEN 4 AND 6 THEN 2
        WHEN month BETWEEN 7 AND 9 THEN 3
        WHEN month BETWEEN 10 AND 12 THEN 4
    END as quarter,
    revenue,
    profit,
    created_at,
    updated_at
FROM temp_targets;

-- Geçici tabloyu sil
DROP TABLE temp_targets; 