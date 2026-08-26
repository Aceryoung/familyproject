import { createSupabaseServerClient } from "@/lib/supabase-server";
import MapFeedClient from "@/components/MapFeedClient";
import RecentRecords from "@/components/RecentRecords";
import RecordFAB from "@/components/RecordFAB";

function toStoragePath(url: string): string {
  if (url.includes("/public/archive_images/")) {
    return url.split("/public/archive_images/")[1];
  }
  return url;
}

// Server Component (Data Fetching + UI)
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

    // 2. 최근 5개 포스트의 썸네일 signed URL을 서버에서 미리 생성
    const recentPosts = (posts || []).slice(0, 5);
    const thumbPaths = recentPosts
      .map((p) => {
        const img = Array.isArray(p.post_images) ? p.post_images[0] : p.post_images;
        return (img as any)?.image_url;
      })
      .filter((url): url is string => !!url && !url.startsWith("http"))
      .map(toStoragePath);

    const serverSignedMap: Record<string, string> = {};
    if (thumbPaths.length > 0) {
      const { data: signed } = await supabase.storage
        .from("archive_images")
        .createSignedUrls(thumbPaths, 7200);
      (signed || []).forEach((s: any, i: number) => {
        if (s.signedUrl) serverSignedMap[thumbPaths[i]] = s.signedUrl;
      });
    }

    return (
      <main className="min-h-dvh bg-[var(--background)] pb-20 relative">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
          <div className="max-w-3xl mx-auto px-5 py-4">
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
          <MapFeedClient posts={posts} />
        )}

        {/* Recent Records Section */}
        {!error && posts && posts.length > 0 && (
          <RecentRecords posts={posts} serverSignedMap={serverSignedMap} />
        )}

        {/* Unified Record FAB */}
        <RecordFAB />
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
