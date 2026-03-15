import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import DOMPurify from "isomorphic-dompurify";

interface PostDetailPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
    try {
        // Determine the post ID carefully depending on Next.js version (async params or direct)
        const resolvedParams = await params;
        const id = resolvedParams.id;
        if (!id) return notFound();

        const supabase = await createSupabaseServerClient();

        // Fetch the Post
        const { data: post, error } = await supabase
            .from("posts")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !post) {
            console.error("포스트 조회 실패:", error);
            return notFound();
        }

        // Fetch the images
        const { data: images, error: imagesError } = await supabase
            .from("post_images")
            .select("*")
            .eq("post_id", id)
            .order("order_index", { ascending: true });

        if (imagesError) {
            console.error("이미지 조회 실패:", imagesError);
        }

        // Generate Signed URLs for the images
        const signedImageUrls = await Promise.all(
            (images || []).map(async (img) => {
                let rawPath = img.image_url;
                if (rawPath.startsWith("http")) return rawPath;
                if (rawPath.includes("/public/archive_images/")) {
                    rawPath = rawPath.split("/public/archive_images/")[1];
                }
                const { data, error: signedError } = await supabase.storage
                    .from("archive_images")
                    .createSignedUrl(rawPath, 3600); // 1 hour expiry
                
                if (signedError) {
                    console.error(`Signed URL 발급 실패 (${rawPath}):`, signedError);
                }
                return data?.signedUrl || null;
            })
        );

        const validImageUrls = signedImageUrls.filter((url) => url !== null) as string[];

        // Format Dates
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
                {/* Header */}
                <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100 mb-8 px-5 py-4 flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center text-gray-500 hover:text-gray-800 transition-colors p-2 -ml-2 rounded-full hover:bg-gray-100"
                    >
                        <svg className="w-6 h-6 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                        <span className="text-sm font-medium">지도(홈)로 돌아가기</span>
                    </Link>
                    <div className="flex gap-2">
                        <Link
                            href={`/compose?edit=${id}`}
                            className="p-2 text-gray-500 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors"
                            title="수정하기"
                        >
                            수정
                        </Link>
                    </div>
                </header>

                {/* Main Content */}
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

                    {/* Content Paragraphs - Sanitized for safety */}
                    <div className="prose prose-gray max-w-none text-gray-700 mb-12 whitespace-pre-wrap leading-loose">
                        {DOMPurify.sanitize(post.content || "")}
                    </div>

                    {/* Photo Gallery Grid */}
                    {validImageUrls.length > 0 && (
                        <div className="mb-12">
                            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                </svg>
                                남겨진 사진들
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {validImageUrls.map((url, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
                                        <Image 
                                            src={url} 
                                            alt={`추억 사진 ${idx + 1}`} 
                                            fill
                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                            className="object-cover hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </article>
            </main>
        );
    } catch (err) {
        console.error("Critical Post Detail Error:", err);
        return (
            <main className="min-h-dvh bg-white flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6 text-4xl">⚠️</div>
                <h1 className="text-xl font-bold text-gray-900 mb-4">기록을 불러올 수 없습니다.</h1>
                <p className="text-gray-600 mb-8 max-w-sm">
                    서버와의 통신 중 오류가 발생했거나 설정에 문제가 있습니다.
                </p>
                <Link href="/" className="px-6 py-3 bg-amber-500 text-white rounded-xl font-bold">
                    홈으로 돌아가기
                </Link>
                <div className="mt-8 bg-gray-50 p-4 rounded-xl text-xs text-left text-gray-400 font-mono overflow-auto max-w-full">
                    Error Message: {err instanceof Error ? err.message : "Unknown error"}
                </div>
            </main>
        );
    }
}
