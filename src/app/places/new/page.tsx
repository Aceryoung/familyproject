import Link from "next/link";
import AddPlaceForm from "@/components/AddPlaceForm";

export default function NewPlacePage() {
    return (
        <main className="min-h-dvh bg-[var(--background)] pb-24">
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
                <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-3">
                    <Link href="/places" className="flex items-center text-gray-500 hover:text-gray-800 transition-colors p-2 -ml-2 rounded-full hover:bg-gray-100">
                        <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                        <span className="text-sm font-medium">장소 목록</span>
                    </Link>
                    <h1 className="text-xl font-bold text-gray-800">🗺️ 장소 기록하기</h1>
                </div>
            </header>

            <div className="max-w-xl mx-auto px-4 sm:px-5 py-6">
                <AddPlaceForm />
            </div>
        </main>
    );
}
