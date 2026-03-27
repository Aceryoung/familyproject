"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";

interface Post {
    id: string;
    title: string;
    visit_date: string;
    end_date?: string | null;
    location?: string | null;
    post_images?: { image_url: string }[] | { image_url: string } | null;
}

interface RecentRecordsProps {
    posts: Post[];
}

export default function RecentRecords({ posts }: RecentRecordsProps) {
    const recentPosts = posts.slice(0, 5);
    const [signedUrlsMap, setSignedUrlsMap] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        if (recentPosts.length === 0) return;

        const fetchUrls = async () => {
            const supabase = getSupabase();
            const rawPaths = recentPosts
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
                const { data: signedUrls, error } = await supabase.storage
                    .from("archive_images")
                    .createSignedUrls(validPaths, 3600);

                if (!error && signedUrls) {
                    const newMap = new Map<string, string>();
                    signedUrls.forEach((file: any) => {
                        if (file.signedUrl && file.path) newMap.set(file.path, file.signedUrl);
                    });
                    setSignedUrlsMap(newMap);
                }
            }
        };

        fetchUrls();
    }, [recentPosts.map(p => p.id).join(",")]);

    if (recentPosts.length === 0) return null;

    const getImageUrl = (post: Post): string | null => {
        const img = Array.isArray(post.post_images) ? post.post_images[0] : post.post_images;
        if (!img?.image_url) return null;

        let path = img.image_url;
        if (path.includes("/public/archive_images/")) {
            path = path.split("/public/archive_images/")[1];
        }
        if (path.startsWith("http")) return path;
        return signedUrlsMap.get(path) || null;
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    };

    return (
        <section className="max-w-3xl mx-auto px-4 sm:px-5 pb-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                📝 최근 기록
            </h2>
            <div className="space-y-3">
                {recentPosts.map((post) => {
                    const imageUrl = getImageUrl(post);
                    return (
                        <Link
                            key={post.id}
                            href={`/post/${post.id}`}
                            className="flex items-center gap-4 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-amber-200 active:scale-[0.98] transition-all"
                        >
                            {/* Thumbnail */}
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                {imageUrl ? (
                                    <img
                                        src={imageUrl}
                                        alt={post.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">
                                        📷
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-800 text-sm truncate">
                                    {post.title}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    {post.location && (
                                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                            {post.location}
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-400">
                                        {formatDate(post.visit_date)}
                                    </span>
                                </div>
                            </div>

                            {/* Arrow Icon */}
                            <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
