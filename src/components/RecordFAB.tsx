"use client";

import { useState } from "react";
import Link from "next/link";

export default function RecordFAB() {
    const [open, setOpen] = useState(false);

    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setOpen(false)}
                />
            )}

            <div className="fixed bottom-20 right-6 z-50 flex flex-col items-end gap-3">
                {/* Action Options */}
                {open && (
                    <div className="flex flex-col items-end gap-2 mb-1">
                        <Link
                            href="/compose"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 bg-white rounded-2xl shadow-lg border border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-amber-50 hover:border-amber-200 transition-all active:scale-95"
                        >
                            <span className="text-base">📝</span>
                            여행 기록하기
                        </Link>
                        <Link
                            href="/places/new"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 bg-white rounded-2xl shadow-lg border border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-amber-50 hover:border-amber-200 transition-all active:scale-95"
                        >
                            <span className="text-base">🗺️</span>
                            장소 기록하기
                        </Link>
                    </div>
                )}

                {/* FAB */}
                <button
                    onClick={() => setOpen((prev) => !prev)}
                    className={`flex items-center justify-center w-14 h-14 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-lg shadow-orange-300/50 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 ${open ? "rotate-45" : ""}`}
                    aria-label="기록하기"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                </button>
            </div>
        </>
    );
}
