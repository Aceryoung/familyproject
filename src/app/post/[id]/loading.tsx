export default function PostLoading() {
    return (
        <main className="min-h-dvh bg-[var(--background)] pb-20">
            <header className="sticky top-0 z-10 bg-[var(--background)]/80 backdrop-blur-xl border-b border-gray-100 px-5 py-4 flex items-center justify-between">
                <div className="h-5 w-32 skeleton rounded-lg" />
                <div className="flex gap-2">
                    <div className="h-8 w-12 skeleton rounded-lg" />
                    <div className="h-8 w-8 skeleton rounded-lg" />
                </div>
            </header>
            <article className="max-w-2xl mx-auto px-5 mt-8 space-y-6">
                <div className="h-5 w-20 skeleton rounded-full" />
                <div className="h-8 w-3/4 skeleton rounded-lg" />
                <div className="h-4 w-40 skeleton rounded-lg" />
                <div className="space-y-3 mt-8">
                    <div className="h-4 w-full skeleton rounded" />
                    <div className="h-4 w-5/6 skeleton rounded" />
                    <div className="h-4 w-2/3 skeleton rounded" />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="aspect-square skeleton rounded-2xl" />
                    <div className="aspect-square skeleton rounded-2xl" />
                </div>
            </article>
        </main>
    );
}
