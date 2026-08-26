import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PLACE_TYPE_LABELS, PlaceType } from "@/lib/placeUtils";
import DeletePlaceButton from "@/components/DeletePlaceButton";

export const dynamic = "force-dynamic";

interface PlaceDetailPageProps {
    params: Promise<{ id: string }>;
}

export default async function PlaceDetailPage({ params }: PlaceDetailPageProps) {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const { data: place, error } = await supabase
        .from("place_records")
        .select(`id, region, place_type, name, memo, created_at, post_id, place_images(image_url, order_index)`)
        .eq("id", id)
        .single();

    if (error || !place) return notFound();

    const imgs = Array.isArray(place.place_images) ? place.place_images : [];
    const sortedImgs = imgs.sort((a: any, b: any) => a.order_index - b.order_index);
    const paths = sortedImgs.map((i: any) => i.image_url).filter(Boolean);

    const signedMap = new Map<string, string>();
    if (paths.length > 0) {
        const { data: batch } = await supabase.storage
            .from("archive_images")
            .createSignedUrls(paths, 7200);
        (batch || []).forEach((s: any, i: number) => {
            if (s.signedUrl) signedMap.set(paths[i], s.signedUrl);
        });
    }
    const signedUrls = paths.map((p: string) => signedMap.get(p)).filter(Boolean) as string[];

    const { emoji, label } = PLACE_TYPE_LABELS[place.place_type as PlaceType];
    const createdAt = new Date(place.created_at).toLocaleDateString("ko-KR", {
        year: "numeric", month: "long", day: "numeric",
    });

    return (
        <main className="min-h-dvh bg-[var(--background)] pb-24">
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
                <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
                    <Link href="/places" className="flex items-center text-gray-500 hover:text-gray-800 transition-colors p-2 -ml-2 rounded-full hover:bg-gray-100">
                        <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                        <span className="text-sm font-medium">장소 목록</span>
                    </Link>
                    <div className="flex items-center gap-1">
                        <Link
                            href={`/places/${id}/edit`}
                            className="p-2 text-gray-500 hover:text-amber-600 rounded-lg hover:bg-amber-50 text-sm font-medium"
                        >
                            수정
                        </Link>
                        <DeletePlaceButton placeId={id} />
                    </div>
                </div>
            </header>

            <article className="max-w-2xl mx-auto px-5 py-8 space-y-6">
                {/* 장소 헤더 */}
                <div>
                    <span className="inline-block px-3 py-1 mb-3 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full">
                        {emoji} {label} · {place.region}
                    </span>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">{place.name}</h1>
                    <p className="text-sm text-gray-400">{createdAt} 기록</p>
                </div>

                {/* 메모 */}
                {place.memo && (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{place.memo}</p>
                    </div>
                )}

                {/* 사진 */}
                {signedUrls.length > 0 && (
                    <div>
                        <h2 className="text-base font-bold text-gray-800 mb-3">📸 사진</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {signedUrls.map((url, i) => (
                                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100">
                                    <Image src={url} alt={`${place.name} 사진 ${i + 1}`} fill sizes="33vw" className="object-cover" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 연결된 여행 */}
                {place.post_id && (
                    <div>
                        <h2 className="text-base font-bold text-gray-800 mb-3">🗓️ 연결된 여행</h2>
                        <Link
                            href={`/post/${place.post_id}`}
                            className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-amber-200 hover:shadow-md transition-all"
                        >
                            <span className="text-2xl">📝</span>
                            <span className="text-sm font-medium text-gray-700">여행 기록 보기</span>
                            <svg className="w-4 h-4 text-gray-300 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>
                )}
            </article>
        </main>
    );
}
