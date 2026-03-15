import CreatePostForm from "@/components/CreatePostForm";
import Link from "next/link";
import { Suspense } from "react";

export default function ComposePage() {
    return (
        <main className="min-h-dvh bg-[var(--background)] pb-20">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-gray-100 mb-8">
                <div className="max-w-xl mx-auto px-5 py-4 flex items-center gap-3">
                    <Link
                        href="/"
                        className="text-gray-500 hover:text-gray-800 transition-colors p-2 -ml-2 rounded-full hover:bg-gray-100"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                    </Link>
                    <h1 className="text-lg font-bold text-gray-800">📝 소중한 추억 기록하기</h1>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="px-5">
                <Suspense fallback={<div className="p-8 text-center text-gray-500">로딩 중...</div>}>
                    <CreatePostForm />
                </Suspense>
            </div>
        </main>
    );
}
