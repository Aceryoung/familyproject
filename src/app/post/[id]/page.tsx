import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { PLACE_TYPE_LABELS, PlaceType } from "@/lib/placeUtils";
import DeletePostButton from "@/components/DeletePostButton";

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
            return notFound();
        }

        // 2-4. 이미지, 장소, 일차 기록을 병렬로 가져오기
        const [
            { data: images },
            { data: rawPlaces },
            { data: tripDays },
        ] = await Promise.all([
            supabase
                .from("post_images")
                .select("*")
                .eq("post_id", id)
                .order("order_index", { ascending: true }),
            supabase
                .from("place_records")
                .select(`id, place_type, name, day_index, memo, place_images(image_url, order_index)`)
                .eq("post_id", id)
                .order("created_at", { ascending: true }),
            supabase
                .from("trip_days")
                .select("*")
                .eq("post_id", id)
                .order("day_index", { ascending: true }),
        ]);

        const hasDays = tripDays && tripDays.length > 0;

        // 5. Batch signed URL 생성 (포스트 사진 + 장소 사진 한 번에)
        const placeFirstPaths = (rawPlaces || []).map((place: any) => {
            const imgs = Array.isArray(place.place_images) ? place.place_images : [];
            const first = imgs.sort((a: any, b: any) => a.order_index - b.order_index)[0];
            return first?.image_url || null;
        });

        const postImagePaths = (images || []).map((img) => {
            if (img.image_url.startsWith("http")) return img.image_url; // 이미 full URL
            if (img.image_url.includes("/public/archive_images/")) {
                return img.image_url.split("/public/archive_images/")[1];
            }
            return img.image_url;
        });

        // storage 경로만 모아 배치 요청
        const storagePaths = placeFirstPaths.filter((p): p is string => !!p);
        const storagePostPaths = postImagePaths.filter((p) => !p.startsWith("http"));
        const allStoragePaths = [...storagePaths, ...storagePostPaths];

        let batchSignedMap = new Map<string, string>();
        if (allStoragePaths.length > 0) {
            const { data: batchSigned } = await supabase.storage
                .from("archive_images").createSignedUrls(allStoragePaths, 7200);
            (batchSigned || []).forEach((s: any, i: number) => {
                if (s.signedUrl) batchSignedMap.set(allStoragePaths[i], s.signedUrl);
            });
        }

        // 장소에 signed URL 붙이기
        const places = (rawPlaces || []).map((place: any, i: number) => ({
            ...place,
            signedUrl: placeFirstPaths[i]
                ? (batchSignedMap.get(placeFirstPaths[i]) || null)
                : null,
        }));

        // 포스트 사진 signed URL
        const validImageUrls = postImagePaths.map((p) =>
            p.startsWith("http") ? p : (batchSignedMap.get(p) || null)
        ).filter((u): u is string => !!u);

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
                    <div className="flex items-center gap-1">
                        <Link href={`/compose?edit=${id}`} className="p-2 text-gray-500 hover:text-amber-600 rounded-lg hover:bg-amber-50 text-sm font-medium">
                            수정
                        </Link>
                        <DeletePostButton postId={id} />
                    </div>
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

                    {/* 전체 메모 (일차별 기록이 없을 때 표시) */}
                    {post.content && (
                        <div className="prose prose-gray max-w-none text-gray-700 mb-12 whitespace-pre-wrap leading-loose">
                            {post.content}
                        </div>
                    )}

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

                    {/* 일차별 기록 */}
                    {hasDays && (
                        <div className="mb-12 space-y-6">
                            <h2 className="text-lg font-bold text-gray-900">📅 일차별 기록</h2>
                            {(tripDays || []).map((day: any) => {
                                const dayPlaces = places.filter((p: any) => p.day_index === day.day_index);
                                const dayDate = new Date(post.visit_date);
                                dayDate.setDate(dayDate.getDate() + day.day_index - 1);
                                const dayLabel = `${day.day_index}일차 (${dayDate.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })})`;
                                return (
                                    <div key={day.id} className="border border-amber-200 rounded-2xl overflow-hidden">
                                        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200">
                                            <span className="text-sm font-bold text-amber-700">{dayLabel}</span>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            {day.content && (
                                                <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{day.content}</p>
                                            )}
                                            {dayPlaces.length > 0 && (
                                                <div className="space-y-2">
                                                    {dayPlaces.map((place: any) => {
                                                        const { emoji, label } = PLACE_TYPE_LABELS[place.place_type as PlaceType];
                                                        return (
                                                            <div key={place.id} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-amber-50 flex-shrink-0 flex items-center justify-center mt-0.5">
                                                                    {place.signedUrl ? (
                                                                        <Image src={place.signedUrl} alt={place.name} width={40} height={40} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <span className="text-lg">{emoji}</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-semibold text-gray-800 text-sm truncate">{place.name}</p>
                                                                    <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{emoji} {label}</span>
                                                                    {place.memo && (
                                                                        <p className="mt-1 text-xs text-gray-500 leading-relaxed line-clamp-2">{place.memo}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* 일차 미구분 장소 (일차별 기록 없을 때) */}
                    {!hasDays && places.length > 0 && (
                        <div className="mb-12">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">🗺️ 방문한 장소</h2>
                            <div className="space-y-2">
                                {places.map((place: any) => {
                                    const { emoji, label } = PLACE_TYPE_LABELS[place.place_type as PlaceType];
                                    return (
                                        <div key={place.id} className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-amber-50 flex-shrink-0 flex items-center justify-center mt-0.5">
                                                {place.signedUrl ? (
                                                    <Image src={place.signedUrl} alt={place.name} width={48} height={48} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xl">{emoji}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-800 text-sm truncate">{place.name}</p>
                                                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{emoji} {label}</span>
                                                {place.memo && (
                                                    <p className="mt-1 text-xs text-gray-500 leading-relaxed line-clamp-2">{place.memo}</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
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
