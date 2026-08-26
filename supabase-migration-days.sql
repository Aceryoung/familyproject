-- =====================================================
-- 일차별 기록 기능 마이그레이션
-- Supabase SQL Editor에서 실행하세요
-- =====================================================

-- 1. place_records에 day_index 컬럼 추가
ALTER TABLE place_records ADD COLUMN IF NOT EXISTS day_index INTEGER;

-- 2. trip_days 테이블 생성 (일차별 메모)
CREATE TABLE IF NOT EXISTS trip_days (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, day_index)
);

-- 3. RLS 활성화
ALTER TABLE trip_days ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책
CREATE POLICY "Anyone can read trip_days"
  ON trip_days FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert trip_days"
  ON trip_days FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update trip_days"
  ON trip_days FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete trip_days"
  ON trip_days FOR DELETE USING (auth.role() = 'authenticated');
