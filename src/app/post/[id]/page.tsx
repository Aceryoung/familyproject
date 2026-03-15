import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";

// Force dynamic rendering to ensure fresh data and avoid build-time issues
export const dynamic = "force-dynamic";

interface PostDetailPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
    let id: string | null = null;
    
    try {
        const resolvedParams = await params;
        id = resolvedParams.id;
        if (!id) return notFound();

        const supabase = await createSupabaseServerClient();

        // 1. Fetch the Post
        const { data: post, error } = await supabase
            .from("posts")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !post) {
            console.error("포스트 조회 에러:", error);
            // next/navigation의 notFound는 catch 블록에 걸릴 수 있으므로 밖에서 호출되도록 유도하거나
            // catch 안에서 다시 던져줘야 합니다. 여기서는 에러를 기록하고 null을 반환합니다.
            return notFound();
        }

        // 2. Fetch the images
        const { data: images } = await supabase
            .from("post_images")
            .select("*")
            .eq("post_id", id)
            .order("order_index", { ascending: true });

        // 3. Generate Signed URLs
        const signedImageUrls = await Promise.all(
            (images || []).map(async (img) => {
                let rawPath = img.image_url;
                if (rawPath.startsWith("http")) return rawPath;
                if (rawPath.includes("/public/archive_images/")) {
                    rawPath = rawPath.split("/public/archive_images/")[1];
                }
                const { data } = await supabase.storage
                    .from("archive_images")
                    .createSignedUrl(rawPath, 3600);
                return data?.signedUrl || null;
            })
        );

        const validImageUrls = signedImageUrls.filter((url) => url !== null) as string[];

        // Date Formatting
        const formattedDate = new Date(post.visit_date).toLocaleDateString("ko-KR", {
            year: "numeric", month: "long", day: "numeric"
        });
        const formattedEndDate = post.end_date ? new Date(post.end_date).toLocaleDateString("ko-KR", {
            year: "numeric", month: "long", day: "numeric"
        }) : null;
        const dateRangeStr = formattedEndDate && formattedEndDate !== formattedDate
            ? `${formattedDate} ~ ${formattedEndDate}`
            : formattedDate;

        return (
            <main className="min-h-dvh bg-[var(--background)] pb-20">
                <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100 mb-8 px-5 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center text-gray-500 hover:text-gray-800 transition-colors p-2 -ml-2 rounded-full hover:bg-gray-100">
                        <svg className="w-6 h-6 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                        <span className="text-sm font-medium">지도(홈)로 돌아가기</span>
                    </Link>
                    <Link href={`/compose?edit=${id}`} className="p-2 text-gray-500 hover:text-amber-600 rounded-lg hover:bg-amber-50">
                        수정
                    </Link>
                </header>

                <article className="max-w-2xl mx-auto px-5">
                    <div className="mb-8">
                        <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full">
                            {post.location}
                        </span>
                        <h1 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight leading-tight">{post.title}</h1>
                        <div className="flex items-center text-gray-500 text-sm">
                            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                            </svg>
                            <span>{dateRangeStr}</span>
                        </div>
                    </div>

                    <div className="prose prose-gray max-w-none text-gray-700 mb-12 whitespace-pre-wrap leading-loose">
                        {post.content}
                    </div>

                    {validImageUrls.length > 0 && (
                        <div className="mb-12">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">📸 남겨진 사진들</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {validImageUrls.map((url, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
                                        <Image src={url} alt={`사진 ${idx + 1}`} fill sizes="50vw" className="object-cover" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </article>
            </main>
        );
    } catch (err) {
        // Next.js 내부 에러(notFound 등)면 다시 던짐
        if ((err as any).digest?.includes("NEXT_NOT_FOUND")) {
            throw err;
        }

        console.error("Critical Post Detail Error:", err);
        return (
            <main className="min-h-dvh bg-white flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 text-4xl">⚠️</div>
                <h1 className="text-xl font-bold text-gray-900 mb-4">상세 정보를 불러올 수 없습니다.</h1>
                <p className="text-gray-600 mb-8 max-w-sm">
                    네트워크 연결이나 프로젝트 설정(환경 변수 등)을 다시 한번 확인해 주세요.
                </p>
                <div className="bg-gray-50 p-4 rounded-xl text-xs text-left text-gray-400 font-mono overflow-auto max-w-full">
                    ID: {id} <br/>
                    Error: {err instanceof Error ? err.message : "Unknown Error"}
                </div>
            </main>
        );
    }
}
