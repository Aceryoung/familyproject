export default function HomeLoading() {
    return (
        <main className="min-h-dvh bg-[var(--background)] pb-20">
            {/* Header skeleton */}
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
                <div className="max-w-3xl mx-auto px-5 py-4">
                    <div className="h-6 w-36 skeleton rounded-lg" />
                </div>
            </header>

            {/* Map placeholder */}
            <div className="flex items-center justify-center pt-10 pb-6 px-4">
                <div className="w-full max-w-sm aspect-[4/5] skeleton rounded-3xl" />
            </div>

            {/* Recent records skeleton */}
            <section className="max-w-3xl mx-auto px-4 sm:px-5 pb-8">
                <div className="h-5 w-24 skeleton rounded-lg mb-4" />
                <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-4 p-3 bg-white rounded-2xl border border-gray-100">
                            <div className="w-16 h-16 rounded-xl skeleton flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-3/4 skeleton rounded" />
                                <div className="h-3 w-1/2 skeleton rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
