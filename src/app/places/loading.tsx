export default function PlacesLoading() {
    return (
        <main className="min-h-dvh bg-[var(--background)] pb-20">
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100">
                <div className="max-w-3xl mx-auto px-5 py-4">
                    <div className="h-6 w-28 skeleton rounded-lg" />
                </div>
            </header>

            <div className="max-w-3xl mx-auto px-4 sm:px-5 py-6">
                {/* Filter tabs skeleton */}
                <div className="grid grid-cols-4 gap-2 mb-5">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="rounded-2xl skeleton h-20" />
                    ))}
                </div>

                {/* Place cards skeleton */}
                <div className="space-y-2">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100">
                            <div className="w-14 h-14 rounded-xl skeleton flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-2/3 skeleton rounded" />
                                <div className="h-3 w-1/3 skeleton rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
