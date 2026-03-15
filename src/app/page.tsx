import { createSupabaseServerClient } from "@/lib/supabase-server";
import MapFeedClient from "@/components/MapFeedClient";
import Link from "next/link";

// Server Component (Data Fetching + UI)
export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. Fetch posts joined with their primary image (order_index = 0)
    const { data: posts, error } = await supabase
      .from("posts")
      .select(`
        id,
        title,
        visit_date,
        end_date,
        location,
        content,
        post_images (
          image_url
        )
      `)
      .order("visit_date", { ascending: false });

    if (error) {
      console.error("게시물 로드 에러:", error);
    }

  // 2. 비공개 버킷(archive_images)에 대한 Signed URL 일괄 발급
  let signedUrlsMap = new Map<string, string>();
  if (posts && posts.length > 0) {
    const rawPaths = posts
      .map((p) => {
        const img = Array.isArray(p.post_images) ? p.post_images[0] : p.post_images;
        return img?.image_url;
      })
      .filter(Boolean) as string[];

    // 이전 방식(publicUrl)으로 저장된 경우 "/public/archive_images/" 이후의 진짜 경로만 추출
    const validPaths = rawPaths.map(p => {
      if (p.includes("/public/archive_images/")) {
        return p.split("/public/archive_images/")[1];
      }
      // http로 시작하면 일단 무시 (단순 외부 링크 등)
      if (p.startsWith("http")) return "";
      return p;
    }).filter(p => p !== "");

    if (validPaths.length > 0) {
      const { data: signedUrls, error: signedError } = await supabase.storage
        .from("archive_images")
        .createSignedUrls(validPaths, 3600); // 1시간 만료

      if (!signedError && signedUrls) {
        signedUrls.forEach((file) => {
          if (file.signedUrl && file.path) signedUrlsMap.set(file.path, file.signedUrl);
        });
      } else {
        console.error("Signed URL 발급 실패:", signedError);
      }
    }
  }

    return (
      <main className="min-h-dvh bg-[var(--background)] pb-24 relative">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
          <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">
              🏠 가족 여행 아카이브
            </h1>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 sm:px-5 py-6 sm:py-8">
          {/* State: Error */}
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl mb-6">
              기록을 불러오는 중 오류가 발생했습니다.
            </div>
          )}

          {/* State: Empty */}
          {!error && (!posts || posts.length === 0) && (
            <div className="py-20 text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-amber-50 mb-6">
                <span className="text-5xl">📸</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                첫 추억을 남겨보세요
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                아직 기록된 가족 여행이 없습니다.<br />
                우측 하단 버튼을 눌러 사진을 올려보세요!
              </p>
            </div>
          )}
        </div>
        {/* Client Map Feed Area */}
        {!error && posts && (
          <MapFeedClient posts={posts} signedUrlsMap={signedUrlsMap} />
        )}
        {/* Floating Action Button (FAB) */}
        <div className="fixed bottom-6 right-6 z-50">
          <Link
            href="/compose"
            className="flex items-center justify-center w-14 h-14 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-lg shadow-orange-300/50 hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
            aria-label="새 추억 작성하기"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </Link>
        </div>
      </main>
    );
  } catch (err) {
    console.error("Critical Server Error:", err);
    return (
      <main className="min-h-dvh bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 text-4xl">⚠️</div>
        <h1 className="text-xl font-bold text-gray-900 mb-4">설명이 필요한 설정이 있습니다.</h1>
        <p className="text-gray-600 mb-8 max-w-sm">
          Vercel 환경 변수(Supabase URL/Key)가 설정되지 않았거나 연결에 실패했습니다. <br/>
          Vercel 프로젝트 설정에서 환경 변수를 확인해 주세요.
        </p>
        <div className="bg-gray-50 p-4 rounded-xl text-xs text-left text-gray-400 font-mono overflow-auto max-w-full">
          Error Message: {err instanceof Error ? err.message : "Unknown error"}
        </div>
      </main>
    );
  }
}
