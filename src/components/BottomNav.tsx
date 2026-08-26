"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
    {
        href: "/",
        label: "홈",
        icon: (active: boolean) => (
            <svg className="w-6 h-6" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
        ),
    },
    {
        href: "/places",
        label: "장소",
        icon: (active: boolean) => (
            <svg className="w-6 h-6" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
        ),
    },
] as const;

// 탭 바를 표시할 경로 목록
const TAB_PATHS = new Set(["/", "/places"]);

export default function BottomNav() {
    const pathname = usePathname();
    if (!TAB_PATHS.has(pathname)) return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-xl border-t border-gray-100"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="flex items-center justify-around max-w-3xl mx-auto h-14">
                {TABS.map(({ href, label, icon }) => {
                    const active = pathname === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                                active ? "text-amber-500" : "text-gray-400 hover:text-gray-600"
                            }`}
                        >
                            {icon(active)}
                            <span className={`text-[10px] font-semibold ${active ? "text-amber-500" : "text-gray-400"}`}>
                                {label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
