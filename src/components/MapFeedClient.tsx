"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import KoreaMap, { REGION_NAMES } from "./KoreaMap";
import dynamic from "next/dynamic";

const BottomSheet = dynamic(() => import("./BottomSheet"), { ssr: false });

interface Post {
    id: string;
    title: string;
    visit_date: string;
    end_date?: string | null;
    location: string;
    content: string;
    post_images: any;
}

interface MapFeedClientProps {
    posts: Post[];
}

export default function MapFeedClient({ posts }: MapFeedClientProps) {
    const router = useRouter();
    const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [signedUrlsMap, setSignedUrlsMap] = useState<Map<string, string>>(new Map());
    const [isLoadingUrls, setIsLoadingUrls] = useState(false);

    // 1. Calculate how many posts exist per region for the Map markers
    const recordsMeta = useMemo(() => {
        const meta: Record<string, number> = {};
        // Initialize all regions with 0
        Object.values(REGION_NAMES).forEach(name => {
            meta[name] = 0;
        });

        posts.forEach(post => {
            // Very simple matching: if the post's location string contains the region name
            // Example: location="제주특별자치도 서귀포시" contains "제주특별자치도"
            Object.values(REGION_NAMES).forEach(regionName => {
                if (post.location && post.location.includes(regionName)) {
                    meta[regionName] += 1;
                }
            });
        });
        return meta;
    }, [posts]);

    // 2. Filter posts by selected region
    const filteredPosts = useMemo(() => {
        if (!selectedRegion) return [];
        return posts.filter(post => post.location && post.location.includes(selectedRegion));
    }, [posts, selectedRegion]);

    const handleRegionClick = async (regionName: string) => {
        setSelectedRegion(regionName);
        setIsSheetOpen(true);
        
        // Fetch signed URLs for the selected region's posts on-demand
        const regionPosts = posts.filter(post => post.location && post.location.includes(regionName));
        if (regionPosts.length === 0) return;

        setIsLoadingUrls(true);
        const supabase = getSupabase();
        
        try {
            const rawPaths = regionPosts
                .map((p) => {
                    const img = Array.isArray(p.post_images) ? p.post_images[0] : p.post_images;
                    return img?.image_url;
                })
                .filter(Boolean) as string[];

            const validPaths = rawPaths.map(p => {
                if (p.includes("/public/archive_images/")) {
                    return p.split("/public/archive_images/")[1];
                }
                if (p.startsWith("http")) return "";
                return p;
            }).filter(p => p !== "");

            if (validPaths.length > 0) {
                const { data: signedUrls, error: signedError } = await supabase.storage
                    .from("archive_images")
                    .createSignedUrls(validPaths, 3600);

                if (!signedError && signedUrls) {
                    const newMap = new Map(signedUrlsMap);
                    signedUrls.forEach((file: any) => {
                        if (file.signedUrl && file.path) newMap.set(file.path, file.signedUrl);
                    });
                    setSignedUrlsMap(newMap);
                }
            }
        } catch (error) {
            console.error("Failed to fetch signed URLs:", error);
        } finally {
            setIsLoadingUrls(false);
        }
    };

    const handleCloseSheet = () => {
        setIsSheetOpen(false);
        // Delay clearing the region so the closing animation stays smooth
        setTimeout(() => setSelectedRegion(null), 300);
    };

    const handleDelete = async (postId: string) => {
        if (!window.confirm("정말로 이 기록을 삭제하시겠습니까?")) return;
        const supabase = getSupabase();
        
        try {
            // Delete images first
            await supabase.from("post_images").delete().eq("post_id", postId);
            // Delete post
            await supabase.from("posts").delete().eq("id", postId);
            
            // Re-fetch posts
            router.refresh();
        } catch (e) {
            console.error(e);
            alert("알 수 없는 오류로 삭제에 실패했습니다.");
        }
    };

    return (
        <>
            <div className="flex-grow flex flex-col pt-4 pb-20 px-4 sm:px-6 relative">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 tracking-tight">우리의 발자취</h2>
                    <p className="text-sm text-gray-500 mt-1">지도를 탭하여 추억을 확인하세요</p>
                </div>

                {/* The Interactive Map */}
                <div className="flex items-center justify-center flex-grow">
                    <KoreaMap onRegionClick={handleRegionClick} recordsMeta={recordsMeta} />
                </div>
            </div>

            {/* Floating Action Button (Global Add) */}
            <div className="fixed bottom-6 right-6 z-40">
                <Link
                    href="/compose"
                    className="flex items-center justify-center w-14 h-14 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-lg shadow-orange-300/50 hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
                    aria-label="새 추억 작성하기"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                </Link>
            </div>

            {/* Bottom Sheet for Region Details */}
            <BottomSheet
                isOpen={isSheetOpen}
                onClose={handleCloseSheet}
                title={selectedRegion || "지역 기록"}
            >
                <div className="space-y-6">
                    {isLoadingUrls && (
                        <div className="flex items-center justify-center py-10 text-amber-500">
                            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span className="text-sm font-medium">사진을 불러오는 중...</span>
                        </div>
                    )}

                    {!isLoadingUrls && filteredPosts.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {filteredPosts.map(post => {
                                // Get the thumbnail
                                const firstImageInfo = Array.isArray(post.post_images)
                                    ? post.post_images[0]
                                    : post.post_images;

                                let rawPath = firstImageInfo?.image_url;
                                if (rawPath && rawPath.includes("/public/archive_images/")) {
                                    rawPath = rawPath.split("/public/archive_images/")[1];
                                }
                                const thumbnailUrl = rawPath
                                    ? (rawPath.startsWith("http") ? rawPath : signedUrlsMap.get(rawPath))
                                    : null;

                                const formattedDate = new Date(post.visit_date).toLocaleDateString("ko-KR", {
                                    year: "numeric", month: "long", day: "numeric"
                                });
                                const formattedEndDate = post.end_date ? new Date(post.end_date).toLocaleDateString("ko-KR", {
                                    year: "numeric", month: "long", day: "numeric"
                                }) : null;
                                const dateRangeStr = formattedEndDate && formattedEndDate !== formattedDate
                                    ? `${formattedDate} ~ ${formattedEndDate}`
                                    : formattedDate;

                                return (
                                    <article key={post.id} className="relative bg-gray-50 rounded-2xl p-4 flex gap-4 border border-gray-100 group">
                                        {/* Main clickable area for the detail view */}
                                        <Link href={`/post/${post.id}`} className="flex flex-grow min-w-0 pr-2 col-span-2 group/link cursor-pointer">
                                            {thumbnailUrl ? (
                                                <div className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-gray-200 mr-4 relative">
                                                    <Image 
                                                        src={thumbnailUrl} 
                                                        alt={post.title} 
                                                        fill 
                                                        sizes="96px"
                                                        className="object-cover group-hover/link:scale-105 transition-transform duration-300" 
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex-shrink-0 w-24 h-24 rounded-xl bg-gray-200 flex items-center justify-center mr-4">
                                                    <span className="text-xs text-gray-400">사진 없음</span>
                                                </div>
                                            )}
                                            <div className="flex flex-col flex-grow justify-center min-w-0 pr-2">
                                                <span className="text-xs font-semibold text-amber-600 mb-1">{dateRangeStr}</span>
                                                <h3 className="text-sm font-bold text-gray-900 truncate mb-1 group-hover/link:text-amber-700 transition-colors" title={post.title}>{post.title}</h3>
                                                {post.content && (
                                                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                                        {post.content}
                                                    </p>
                                                )}
                                            </div>
                                        </Link>
                                        
                                        {/* Action Buttons (Edit/Delete) - Positioned on right side natively, isolated from Link */}
                                        <div className="flex flex-col items-end justify-center pl-2 border-l border-gray-100 gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 w-14">
                                            <Link 
                                                href={`/compose?edit=${post.id}`}
                                                className="px-2.5 py-1 text-xs font-medium text-gray-400 hover:text-amber-500 rounded-lg hover:bg-amber-50 transition-colors w-full text-center"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                수정
                                            </Link>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(post.id);
                                                }}
                                                className="px-2.5 py-1 text-xs font-medium text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors w-full text-center"
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-10 text-center">
                            <span className="text-4xl block mb-4">🧳</span>
                            <p className="text-gray-500 text-sm">아직 이 지역에 남겨진 추억이 없어요.</p>
                        </div>
                    )}

                    {/* Contextual Compose Button */}
                    <Link
                        href={`/compose?region=${selectedRegion}`}
                        className="flex items-center justify-center w-full py-4 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold text-sm rounded-2xl border border-amber-200 transition-colors"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        이 지역에 새 추억 기록하기 ✏️
                    </Link>
                </div>
            </BottomSheet>
        </>
    );
}
