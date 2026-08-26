-- =====================================================
-- 장소 기록 기능 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- =====================================================

-- 1. place_records 테이블 생성
CREATE TABLE place_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  region TEXT NOT NULL,
  place_type TEXT NOT NULL CHECK (place_type IN ('temple', 'restaurant', 'cafe')),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. place_images 테이블 생성
CREATE TABLE place_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id UUID REFERENCES place_records(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  order_index INT DEFAULT 0
);

-- 3. RLS 활성화
ALTER TABLE place_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_images ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 (누구나 읽기, 로그인 사용자만 쓰기)
CREATE POLICY "Anyone can read place_records"
  ON place_records FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert place_records"
  ON place_records FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update place_records"
  ON place_records FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete place_records"
  ON place_records FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can read place_images"
  ON place_images FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert place_images"
  ON place_images FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete place_images"
  ON place_images FOR DELETE USING (auth.role() = 'authenticated');
