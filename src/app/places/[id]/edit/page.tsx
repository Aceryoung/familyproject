import { createSupabaseServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";
import EditPlaceForm from "@/components/EditPlaceForm";

export const dynamic = "force-dynamic";

interface EditPlacePageProps {
    params: Promise<{ id: string }>;
}

export default async function EditPlacePage({ params }: EditPlacePageProps) {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const { data: place, error } = await supabase
        .from("place_records")
        .select(`id, region, place_type, name, memo, place_images(image_url, order_index)`)
        .eq("id", id)
        .single();

    if (error || !place) return notFound();

    const imgs = Array.isArray(place.place_images) ? place.place_images : [];
    const sortedPaths = imgs
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((i: any) => i.image_url)
        .filter(Boolean) as string[];

    const signedMap = new Map<string, string>();
    if (sortedPaths.length > 0) {
        const { data: batch } = await supabase.storage
            .from("archive_images")
            .createSignedUrls(sortedPaths, 7200);
        (batch || []).forEach((s: any, i: number) => {
            if (s.signedUrl) signedMap.set(sortedPaths[i], s.signedUrl);
        });
    }
    const existingSignedUrls = sortedPaths.map((p) => signedMap.get(p)).filter(Boolean) as string[];

    return (
        <main className="min-h-dvh bg-[var(--background)] pb-24">
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
                <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
                    <Link href={`/places/${id}`} className="flex items-center text-gray-500 hover:text-gray-800 transition-colors p-2 -ml-2 rounded-full hover:bg-gray-100">
                        <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                        <span className="text-sm font-medium">취소</span>
                    </Link>
                    <h1 className="text-xl font-bold text-gray-800">장소 수정</h1>
                </div>
            </header>

            <div className="max-w-xl mx-auto px-4 sm:px-5 py-6">
                <EditPlaceForm
                    placeId={id}
                    initialRegion={place.region}
                    initialPlaceType={place.place_type as any}
                    initialName={place.name}
                    initialMemo={place.memo || ""}
                    existingPaths={sortedPaths}
                    existingSignedUrls={existingSignedUrls}
                />
            </div>
        </main>
    );
}
