"use client";

import React, { useState, useEffect } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

interface RegionMapProps {
    onRegionClick: (regionName: string) => void;
    // A mapping of region names to the number of posts there
    recordsMeta: Record<string, number>;
}

export const REGION_NAMES: Record<string, string> = {
    seoul: "서울특별시",
    busan: "부산광역시",
    daegu: "대구광역시",
    incheon: "인천광역시",
    gwangju: "광주광역시",
    daejeon: "대전광역시",
    ulsan: "울산광역시",
    sejong: "세종특별자치시",
    gyeonggi: "경기도",
    gangwon: "강원특별자치도",
    chungbuk: "충청북도",
    chungnam: "충청남도",
    jeonbuk: "전라북도",
    jeonnam: "전라남도",
    gyeongbuk: "경상북도",
    gyeongnam: "경상남도",
    jeju: "제주특별자치도",
    ulleung: "울릉도",
    dokdo: "독도",
};

// Manual coordinate overrides for perfect visual centering
const REGION_CENTERS: Record<string, { shortName: string; coordinates: [number, number] }> = {
    "서울특별시": { shortName: "서울", coordinates: [126.9780, 37.5665] },
    "부산광역시": { shortName: "부산", coordinates: [129.0756, 35.1796] },
    "대구광역시": { shortName: "대구", coordinates: [128.6014, 35.8714] },
    "인천광역시": { shortName: "인천", coordinates: [126.45, 37.45] },
    "광주광역시": { shortName: "광주", coordinates: [126.8526, 35.1595] },
    "대전광역시": { shortName: "대전", coordinates: [127.3845, 36.3504] },
    "울산광역시": { shortName: "울산", coordinates: [129.3114, 35.5384] },
    "세종특별자치시": { shortName: "세종", coordinates: [127.2890, 36.55] },
    "경기도": { shortName: "경기", coordinates: [127.4, 37.25] },
    "강원도": { shortName: "강원", coordinates: [128.25, 37.75] },
    "충청북도": { shortName: "충북", coordinates: [127.75, 36.8] },
    "충청남도": { shortName: "충남", coordinates: [126.65, 36.5] },
    "전라북도": { shortName: "전북", coordinates: [127.15, 35.75] },
    "전라남도": { shortName: "전남", coordinates: [126.9, 34.8] },
    "경상북도": { shortName: "경북", coordinates: [128.75, 36.4] },
    "경상남도": { shortName: "경남", coordinates: [128.25, 35.4] },
    "제주특별자치도": { shortName: "제주", coordinates: [126.55, 33.4] },
    // Islands (Shifted westward and southward to ensure visibility on narrow screens)
    "울릉도": { shortName: "울릉", coordinates: [130.2, 37.3] },
    "독도": { shortName: "독도", coordinates: [130.5, 37.1] },
};

export default function KoreaMap({ onRegionClick, recordsMeta }: RegionMapProps) {
    const [activeRegion, setActiveRegion] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="relative w-full max-w-lg mx-auto h-[550px] sm:h-[750px] select-none mt-2">
            <div className={`w-full h-full drop-shadow-xl transition-opacity duration-1000 ${mounted ? "opacity-100" : "opacity-0"}`}>
                <ComposableMap
                    projection="geoMercator"
                    projectionConfig={{
                        scale: 7200, // Reduced from 8000 to fit better on mobile
                        // Shifted center latitude South (36.0 -> 35.6) to lift Jeju Island up
                        center: [128.0, 35.6]
                    }}
                    style={{ width: "100%", height: "100%" }}
                >
                    <Geographies geography="/korea.json">
                        {({ geographies }) =>
                            geographies.map((geo) => {
                                const regionName = geo.properties.name;
                                const hasRecords = recordsMeta[regionName] > 0;
                                const isActive = activeRegion === regionName;

                                return (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        onClick={() => {
                                            setActiveRegion(regionName);
                                            onRegionClick(regionName);
                                        }}
                                        style={{
                                            default: {
                                                fill: hasRecords ? (isActive ? "#f59e0b" : "#fcd34d") : "#cbd5e1", // darker gray for missing regions
                                                outline: "none",
                                                stroke: "#ffffff",
                                                strokeWidth: 0.8,
                                            },
                                            hover: {
                                                fill: hasRecords ? "#fbbf24" : "#94a3b8",
                                                outline: "none",
                                                stroke: "#ffffff",
                                                strokeWidth: 0.8,
                                                cursor: "pointer",
                                            },
                                            pressed: {
                                                fill: "#f59e0b",
                                                outline: "none",
                                            },
                                        }}
                                    />
                                );
                            })
                        }
                    </Geographies>

                    {/* Render Text Labels */}
                    {Object.entries(REGION_CENTERS).map(([name, data]) => {
                        const hasRecords = recordsMeta[name] > 0;
                        const isActive = activeRegion === name;
                        const isIsland = name === "울릉도" || name === "독도";

                        return (
                            <Marker key={name} coordinates={data.coordinates}>
                                {/* Invisible larger hit area for easier clicking on mobile */}
                                {isIsland && (
                                    <circle
                                        r={15}
                                        fill="transparent"
                                        style={{ cursor: "pointer" }}
                                        onClick={() => {
                                            setActiveRegion(name);
                                            onRegionClick(name);
                                        }}
                                        onTouchEnd={(e) => {
                                            e.preventDefault();
                                            setActiveRegion(name);
                                            onRegionClick(name);
                                        }}
                                    />
                                )}
                                {/* Draw small physical dots for the islands if the geo path is too tiny */}
                                {isIsland && (
                                    <circle r={2.5} fill={hasRecords ? (isActive ? "#ffffff" : "#f59e0b") : "#94a3b8"} style={{ pointerEvents: "none" }} />
                                )}
                                <text
                                    textAnchor="middle"
                                    y={isIsland ? -7 : 6} // Shift island text up to not overlap the dot
                                    onClick={isIsland ? () => {
                                        setActiveRegion(name);
                                        onRegionClick(name);
                                    } : undefined}
                                    style={{
                                        fontFamily: "pretendard, sans-serif",
                                        fontSize: isIsland ? 14 : 17, // Much larger font size for elderly users
                                        fill: hasRecords ? (isActive ? "#ffffff" : "#a16207") : "#334155", // Darker text for readability
                                        fontWeight: "800", // Extra bold for readability
                                        pointerEvents: isIsland ? "auto" : "none",
                                        cursor: isIsland ? "pointer" : "default"
                                    }}
                                >
                                    {data.shortName}
                                </text>
                            </Marker>
                        );
                    })}
                </ComposableMap>
            </div>

            {/* Map Legend Overlay */}
            <div className="absolute top-2 right-2 bg-white/80 backdrop-blur-md px-3 py-2 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-1 text-[10px] text-gray-500 font-medium">
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-300 border border-white shadow-sm"></span>
                    <span>기록된 곳</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-white shadow-sm"></span>
                    <span>미달성</span>
                </div>
            </div>
        </div>
    );
}
