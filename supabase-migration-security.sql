-- =====================================================
-- 보안 및 데이터 무결성 마이그레이션
-- Supabase SQL Editor에서 실행하세요
--
-- 수정 사항:
-- E1: RLS 정책에 사용자 소유권 검증 추가
-- E2: place_records.post_id FK를 ON DELETE CASCADE로 변경
--
-- 멱등성: 여러 번 실행해도 안전합니다
-- =====================================================

-- =====================================================
-- STEP 1: posts 테이블에 user_id 컬럼 추가
-- (이미 있으면 무시됨)
-- =====================================================
ALTER TABLE posts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 기존 데이터에 현재 사용자 ID 채우기 (첫 실행 시 한 번만)
-- ⚠️ 아래 쿼리 실행 전에 본인의 user ID를 확인하세요:
--    SELECT id FROM auth.users LIMIT 5;
-- 그 후 아래의 'YOUR_USER_ID_HERE'를 실제 ID로 교체하세요.
-- UPDATE posts SET user_id = 'YOUR_USER_ID_HERE' WHERE user_id IS NULL;

-- user_id에 기본값 설정 (새 레코드는 자동으로 현재 사용자)
ALTER TABLE posts ALTER COLUMN user_id SET DEFAULT auth.uid();

-- =====================================================
-- STEP 2: posts 테이블 RLS 정책 재설정
-- =====================================================
-- 기존 정책 + 새 정책 이름 모두 삭제 (멱등성 보장)
DROP POLICY IF EXISTS "Anyone can read posts" ON posts;
DROP POLICY IF EXISTS "Authenticated users can insert posts" ON posts;
DROP POLICY IF EXISTS "Authenticated users can update posts" ON posts;
DROP POLICY IF EXISTS "Authenticated users can delete posts" ON posts;
DROP POLICY IF EXISTS "Enable read access for all users" ON posts;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON posts;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON posts;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON posts;
DROP POLICY IF EXISTS "Users can insert own posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;

-- 새 정책: 읽기는 모든 사용자, 수정/삭제는 소유자만
CREATE POLICY "Anyone can read posts"
  ON posts FOR SELECT USING (true);

CREATE POLICY "Users can insert own posts"
  ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- STEP 3: post_images 테이블 RLS 정책 재설정
-- =====================================================
DROP POLICY IF EXISTS "Anyone can read post_images" ON post_images;
DROP POLICY IF EXISTS "Authenticated users can insert post_images" ON post_images;
DROP POLICY IF EXISTS "Authenticated users can delete post_images" ON post_images;
DROP POLICY IF EXISTS "Enable read access for all users" ON post_images;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON post_images;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON post_images;
DROP POLICY IF EXISTS "Owners can insert post_images" ON post_images;
DROP POLICY IF EXISTS "Owners can delete post_images" ON post_images;

CREATE POLICY "Anyone can read post_images"
  ON post_images FOR SELECT USING (true);

CREATE POLICY "Owners can insert post_images"
  ON post_images FOR INSERT
  WITH CHECK (post_id IN (SELECT id FROM posts WHERE user_id = auth.uid()));

CREATE POLICY "Owners can delete post_images"
  ON post_images FOR DELETE
  USING (post_id IN (SELECT id FROM posts WHERE user_id = auth.uid()));

-- =====================================================
-- STEP 4: place_records RLS 정책 재설정 + FK CASCADE 변경
-- =====================================================

-- E2 수정: ON DELETE SET NULL → ON DELETE CASCADE
ALTER TABLE place_records DROP CONSTRAINT IF EXISTS place_records_post_id_fkey;
ALTER TABLE place_records
  ADD CONSTRAINT place_records_post_id_fkey
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

-- RLS 정책 재설정
DROP POLICY IF EXISTS "Anyone can read place_records" ON place_records;
DROP POLICY IF EXISTS "Authenticated users can insert place_records" ON place_records;
DROP POLICY IF EXISTS "Authenticated users can update place_records" ON place_records;
DROP POLICY IF EXISTS "Authenticated users can delete place_records" ON place_records;
DROP POLICY IF EXISTS "Owners can insert place_records" ON place_records;
DROP POLICY IF EXISTS "Owners can update place_records" ON place_records;
DROP POLICY IF EXISTS "Owners can delete place_records" ON place_records;

CREATE POLICY "Anyone can read place_records"
  ON place_records FOR SELECT USING (true);

CREATE POLICY "Owners can insert place_records"
  ON place_records FOR INSERT
  WITH CHECK (post_id IN (SELECT id FROM posts WHERE user_id = auth.uid()));

CREATE POLICY "Owners can update place_records"
  ON place_records FOR UPDATE
  USING (post_id IN (SELECT id FROM posts WHERE user_id = auth.uid()));

CREATE POLICY "Owners can delete place_records"
  ON place_records FOR DELETE
  USING (post_id IN (SELECT id FROM posts WHERE user_id = auth.uid()));

-- =====================================================
-- STEP 5: place_images RLS 정책 재설정
-- =====================================================
DROP POLICY IF EXISTS "Anyone can read place_images" ON place_images;
DROP POLICY IF EXISTS "Authenticated users can insert place_images" ON place_images;
DROP POLICY IF EXISTS "Authenticated users can delete place_images" ON place_images;
DROP POLICY IF EXISTS "Owners can insert place_images" ON place_images;
DROP POLICY IF EXISTS "Owners can delete place_images" ON place_images;

CREATE POLICY "Anyone can read place_images"
  ON place_images FOR SELECT USING (true);

CREATE POLICY "Owners can insert place_images"
  ON place_images FOR INSERT
  WITH CHECK (place_id IN (
    SELECT pr.id FROM place_records pr
    JOIN posts p ON pr.post_id = p.id
    WHERE p.user_id = auth.uid()
  ));

CREATE POLICY "Owners can delete place_images"
  ON place_images FOR DELETE
  USING (place_id IN (
    SELECT pr.id FROM place_records pr
    JOIN posts p ON pr.post_id = p.id
    WHERE p.user_id = auth.uid()
  ));

-- =====================================================
-- STEP 6: trip_days RLS 정책 재설정
-- =====================================================
DROP POLICY IF EXISTS "Anyone can read trip_days" ON trip_days;
DROP POLICY IF EXISTS "Authenticated users can insert trip_days" ON trip_days;
DROP POLICY IF EXISTS "Authenticated users can update trip_days" ON trip_days;
DROP POLICY IF EXISTS "Authenticated users can delete trip_days" ON trip_days;
DROP POLICY IF EXISTS "Owners can insert trip_days" ON trip_days;
DROP POLICY IF EXISTS "Owners can update trip_days" ON trip_days;
DROP POLICY IF EXISTS "Owners can delete trip_days" ON trip_days;

CREATE POLICY "Anyone can read trip_days"
  ON trip_days FOR SELECT USING (true);

CREATE POLICY "Owners can insert trip_days"
  ON trip_days FOR INSERT
  WITH CHECK (post_id IN (SELECT id FROM posts WHERE user_id = auth.uid()));

CREATE POLICY "Owners can update trip_days"
  ON trip_days FOR UPDATE
  USING (post_id IN (SELECT id FROM posts WHERE user_id = auth.uid()));

CREATE POLICY "Owners can delete trip_days"
  ON trip_days FOR DELETE
  USING (post_id IN (SELECT id FROM posts WHERE user_id = auth.uid()));
