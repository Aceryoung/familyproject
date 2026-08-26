export default function PlaceDetailLoading() {
    return (
        <main className="min-h-dvh bg-[var(--background)] pb-24">
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
                <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
                    <div className="h-5 w-20 skeleton rounded-lg" />
                    <div className="h-5 w-10 skeleton rounded-lg" />
                </div>
            </header>
            <article className="max-w-2xl mx-auto px-5 py-8 space-y-6">
                <div className="h-5 w-28 skeleton rounded-full" />
                <div className="h-7 w-1/2 skeleton rounded-lg" />
                <div className="h-4 w-32 skeleton rounded-lg" />
                <div className="h-20 w-full skeleton rounded-2xl" />
                <div className="grid grid-cols-3 gap-3">
                    <div className="aspect-square skeleton rounded-2xl" />
                    <div className="aspect-square skeleton rounded-2xl" />
                </div>
            </article>
        </main>
    );
}
