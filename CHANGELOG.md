# Changelog

All notable changes to this project will be documented in this file.

---

## [Unreleased] - 2026-06-23

### Fixed
- **[보안]** `CRON_SECRET` 환경변수 미설정 시 즉시 401 반환하도록 가드 추가 (`src/app/api/cron/route.ts`)
  - 기존: 환경변수가 없으면 `Bearer undefined` 비교로 인증 우회 가능
  - 변경: 환경변수 없을 경우 쿼리 없이 즉시 차단
- **[버그]** `MapFeedClient` 지역 클릭 시 Signed URL 비동기 패치의 클로저 오염 수정 (`src/components/MapFeedClient.tsx`)
  - 기존: `new Map(signedUrlsMap)` — await 전 캡처된 오래된 상태 참조
  - 변경: `setSignedUrlsMap(prev => ...)` 함수형 업데이트로 항상 최신 상태 보장
- 미사용 `React` import 제거 (`src/components/MapFeedClient.tsx`)

### Added
- Vercel Cron Job으로 Supabase DB Keep-Alive 구현 (`src/app/api/cron/route.ts`, `vercel.json`)
  - 매일 UTC 00:00 (KST 09:00) 자동 실행
  - `CRON_SECRET` Bearer 토큰 인증 포함
- 홈 화면 최근 기록 5개 섹션 추가 (`src/components/RecentRecords.tsx`)
- Supabase admin 클라이언트 lazy 초기화 (`src/lib/supabase.ts`)

### Changed
- Signed URL 발급 방식 변경: 서버 일괄 발급 → 클라이언트 온디맨드 발급 (`src/components/MapFeedClient.tsx`)
  - 홈 페이지 초기 로딩 속도 개선
- 게시물 위치 입력 단순화: 상세 장소 필드 제거, 주요 지역만 선택 (`src/components/CreatePostForm.tsx`)
