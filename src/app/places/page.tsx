import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import PlacesClient, { PlaceRecord } from "@/components/PlacesClient";

export const dynamic = "force-dynamic";

export default async function PlacesPage() {
    const supabase = await createSupabaseServerClient();

    const { data: rawPlaces } = await supabase
        .from("place_records")
        .select(`id, region, place_type, name, memo, created_at, post_id, place_images(image_url, order_index)`)
        .order("created_at", { ascending: false });

    // 각 장소의 첫 번째 사진 경로 수집 후 배치 signed URL 생성
    const firstPaths = (rawPlaces || []).map((place: any) => {
        const imgs = Array.isArray(place.place_images) ? place.place_images : [];
        const first = imgs.sort((a: any, b: any) => a.order_index - b.order_index)[0];
        return first?.image_url || null;
    });

    const storagePaths = firstPaths.filter((p): p is string => !!p);
    const signedMap = new Map<string, string>();
    if (storagePaths.length > 0) {
        const { data: batchSigned } = await supabase.storage
            .from("archive_images")
            .createSignedUrls(storagePaths, 7200);
        (batchSigned || []).forEach((s: any, i: number) => {
            if (s.signedUrl) signedMap.set(storagePaths[i], s.signedUrl);
        });
    }

    const places: PlaceRecord[] = (rawPlaces || []).map((place: any, i: number) => ({
        ...place,
        signedUrl: firstPaths[i] ? (signedMap.get(firstPaths[i]!) || null) : null,
    }));

    return (
        <main className="min-h-dvh bg-[var(--background)] pb-20">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
                <div className="max-w-3xl mx-auto px-5 py-4">
                    <h1 className="text-xl font-bold text-gray-800">🗺️ 장소 기록</h1>
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-4 sm:px-5 py-6">
                <PlacesClient places={places} />
            </div>

            {/* FAB - bottom-20 to clear the BottomNav (56px) */}
            <div className="fixed bottom-20 right-6 z-50">
                <Link
                    href="/places/new"
                    className="flex items-center justify-center w-14 h-14 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-lg shadow-orange-300/50 hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
                    aria-label="새 장소 기록"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                </Link>
            </div>
        </main>
    );
}
