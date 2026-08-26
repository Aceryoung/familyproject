"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PLACE_TYPE_LABELS, PlaceType } from "@/lib/placeUtils";

export interface PlaceRecord {
    id: string;
    region: string;
    place_type: PlaceType;
    name: string;
    memo: string | null;
    created_at: string;
    post_id: string | null;
    signedUrl: string | null;
}

const FILTERS = [
    { key: "all",        label: "전체",  emoji: "📍" },
    { key: "temple",     label: "사찰",  emoji: "🛕" },
    { key: "restaurant", label: "식당",  emoji: "🍽️" },
    { key: "cafe",       label: "카페",  emoji: "☕" },
] as const;

type FilterKey = typeof FILTERS[number]["key"];

export default function PlacesClient({ places }: { places: PlaceRecord[] }) {
    const [filter, setFilter] = useState<FilterKey>("all");

    const counts = {
        all:        places.length,
        temple:     places.filter(p => p.place_type === "temple").length,
        restaurant: places.filter(p => p.place_type === "restaurant").length,
        cafe:       places.filter(p => p.place_type === "cafe").length,
    };

    const filtered = filter === "all" ? places : places.filter(p => p.place_type === filter);

    // 지역별 그룹화
    const byRegion: Record<string, PlaceRecord[]> = {};
    for (const place of filtered) {
        if (!byRegion[place.region]) byRegion[place.region] = [];
        byRegion[place.region].push(place);
    }
    const regions = Object.keys(byRegion).sort();

    return (
        <>
            {/* Stats + 필터 탭 */}
            <div className="grid grid-cols-4 gap-2 mb-5">
                {FILTERS.map(({ key, label, emoji }) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`rounded-2xl border p-3 text-center transition-all ${
                            filter === key
                                ? "bg-amber-500 border-amber-500 text-white shadow-md"
                                : "bg-white border-gray-100 text-gray-700 shadow-sm hover:border-amber-300"
                        }`}
                    >
                        <div className="text-xl mb-1">{emoji}</div>
                        <div className={`text-base font-bold ${filter === key ? "text-white" : "text-gray-800"}`}>
                            {counts[key]}
                        </div>
                        <div className={`text-xs ${filter === key ? "text-white/80" : "text-gray-500"}`}>
                            {label}
                        </div>
                    </button>
                ))}
            </div>

            {/* 빈 상태 */}
            {filtered.length === 0 && (
                <div className="py-16 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-50 mb-4">
                        <span className="text-4xl">{FILTERS.find(f => f.key === filter)?.emoji ?? "🗺️"}</span>
                    </div>
                    <h2 className="text-lg font-bold text-gray-800 mb-2">
                        {filter === "all" ? "아직 기록된 장소가 없어요" : `기록된 ${FILTERS.find(f => f.key === filter)?.label}이 없어요`}
                    </h2>
                    <p className="text-sm text-gray-500">방문한 장소를 기록해보세요</p>
                </div>
            )}

            {/* 지역별 목록 */}
            <div className="space-y-6">
                {regions.map((region) => {
                    const regionPlaces = byRegion[region];
                    // 전체 보기일 때 타입별 서브그룹으로 분리
                    const typeOrder: PlaceType[] = ["temple", "restaurant", "cafe"];
                    const groups = filter === "all"
                        ? typeOrder
                            .map((type) => ({
                                type,
                                places: regionPlaces.filter((p) => p.place_type === type),
                            }))
                            .filter((g) => g.places.length > 0)
                        : [{ type: filter as PlaceType, places: regionPlaces }];

                    return (
                        <section key={region}>
                            <h2 className="text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <span className="text-amber-500">📍</span>
                                {region}
                                <span className="text-xs font-normal text-gray-400">({regionPlaces.length}곳)</span>
                            </h2>
                            <div className="space-y-4">
                                {groups.map(({ type, places: groupPlaces }) => {
                                    const { emoji: groupEmoji, label: groupLabel } = PLACE_TYPE_LABELS[type];
                                    return (
                                        <div key={type}>
                                            {/* 타입별 소제목 (전체 보기일 때만) */}
                                            {filter === "all" && (
                                                <p className="text-xs font-semibold text-gray-500 mb-2 ml-1 flex items-center gap-1.5">
                                                    <span>{groupEmoji}</span> {groupLabel}
                                                    <span className="text-gray-300 font-normal">·</span>
                                                    <span className="text-gray-400 font-normal">{groupPlaces.length}곳</span>
                                                </p>
                                            )}
                                            <div className="space-y-2">
                                                {groupPlaces.map((place) => {
                                                    const { emoji, label } = PLACE_TYPE_LABELS[place.place_type];
                                                    return (
                                                        <Link
                                                            key={place.id}
                                                            href={`/places/${place.id}`}
                                                            className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-amber-200 hover:shadow-md active:scale-[0.98] transition-all"
                                                        >
                                                            {/* 썸네일 */}
                                                            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 mt-0.5 relative">
                                                                {place.signedUrl ? (
                                                                    <Image
                                                                        src={place.signedUrl}
                                                                        alt={place.name}
                                                                        width={56}
                                                                        height={56}
                                                                        className="w-full h-full object-cover"
                                                                        placeholder="blur"
                                                                        blurDataURL="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full bg-amber-50 flex items-center justify-center">
                                                                        <span className="text-2xl">{emoji}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* 정보 */}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-gray-800 text-sm truncate">{place.name}</p>
                                                                {filter !== "all" && (
                                                                    <span className="inline-block mt-0.5 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                                                        {emoji} {label}
                                                                    </span>
                                                                )}
                                                                {place.memo && (
                                                                    <p className="mt-1.5 text-xs text-gray-500 leading-relaxed line-clamp-2">
                                                                        {place.memo}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {/* 화살표 */}
                                                            <svg className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                            </svg>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}
            </div>
        </>
    );
}
