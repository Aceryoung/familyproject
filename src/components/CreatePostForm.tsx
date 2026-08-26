"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { getSupabase } from "@/lib/supabase";
import { usePostSubmit, ExistingImage, PlaceEntry, DayRecord } from "@/hooks/usePostSubmit";
import { PLACE_TYPE_LABELS, PlaceType } from "@/lib/placeUtils";
import TempleNameInput from "@/components/TempleNameInput";
import { MAJOR_REGIONS } from "@/lib/regions";

function newPlace(): PlaceEntry {
    return {
        tempId: `${Date.now()}_${Math.random()}`,
        name: "",
        placeType: "temple",
        files: [],
        previews: [],
    };
}

// ──────────────────────────────────────────────
// 장소 한 줄 컴포넌트 (flat + day 양쪽에서 재사용)
// ──────────────────────────────────────────────
function PlaceRow({
    place,
    region,
    disabled,
    onChange,
    onRemove,
    onPhotoAdd,
}: {
    place: PlaceEntry;
    region: string;
    disabled: boolean;
    onChange: (updates: Partial<PlaceEntry>) => void;
    onRemove: () => void;
    onPhotoAdd: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    const totalPhotos = (place.signedUrls?.length ?? 0) + place.previews.length;

    return (
        <div className="p-3 bg-gray-50/80 border border-gray-200 rounded-2xl space-y-3">
            {/* 종류 선택 */}
            <div className="flex items-center gap-2">
                {(["temple", "restaurant", "cafe"] as PlaceType[]).map((type) => {
                    const { label, emoji } = PLACE_TYPE_LABELS[type];
                    return (
                        <button
                            key={type}
                            type="button"
                            onClick={() => onChange({ placeType: type })}
                            disabled={disabled}
                            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                                place.placeType === type
                                    ? "bg-amber-500 text-white"
                                    : "bg-white text-gray-500 border border-gray-200"
                            }`}
                        >
                            {emoji} {label}
                        </button>
                    );
                })}
                <button
                    type="button"
                    onClick={onRemove}
                    className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* 이름 입력 */}
            {place.placeType === "temple" ? (
                <TempleNameInput
                    region={region}
                    value={place.name}
                    onChange={(name) => onChange({ name })}
                    disabled={disabled}
                />
            ) : (
                <input
                    type="text"
                    value={place.name}
                    onChange={(e) => onChange({ name: e.target.value })}
                    placeholder={`${PLACE_TYPE_LABELS[place.placeType].label} 이름을 입력하세요`}
                    disabled={disabled}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                />
            )}

            {/* 메모 */}
            <textarea
                rows={2}
                value={place.memo ?? ""}
                onChange={(e) => onChange({ memo: e.target.value })}
                placeholder="간단 메모 (선택) — 맛, 분위기, 재방문 의사 등"
                disabled={disabled}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />

            {/* 사진 */}
            <div className="flex items-center gap-2 flex-wrap">
                {/* 기존 사진 (수정 모드) */}
                {place.signedUrls?.map((url, i) => (
                    <div key={`ex-${i}`} className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                ))}
                {/* 새 사진 미리보기 */}
                {place.previews.map((url, i) => (
                    <div key={`new-${i}`} className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                ))}
                {totalPhotos < 3 && (
                    <label className="w-14 h-14 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 flex items-center justify-center cursor-pointer hover:bg-amber-100/50 flex-shrink-0">
                        <input
                            type="file"
                            multiple
                            accept="image/*,image/heic,image/heif"
                            onChange={onPhotoAdd}
                            className="hidden"
                            disabled={disabled}
                        />
                        <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </label>
                )}
                <span className="text-xs text-gray-400">사진 최대 3장 (선택)</span>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────
// 메인 폼
// ──────────────────────────────────────────────
export default function CreatePostForm() {
    const searchParams = useSearchParams();
    const editId = searchParams.get("edit");

    const [title, setTitle] = useState("");
    const [visitDate, setVisitDate] = useState(new Date().toISOString().split("T")[0]);
    const [endDate, setEndDate] = useState("");
    const [majorRegion, setMajorRegion] = useState(searchParams.get("region") || "");
    const [content, setContent] = useState("");

    // 일차별 기록 모드
    const [useDays, setUseDays] = useState(false);
    const [days, setDays] = useState<DayRecord[]>([{ dayIndex: 1, content: "", places: [] }]);

    // 단순 장소 목록 (일차 미구분)
    const [places, setPlaces] = useState<PlaceEntry[]>([]);

    // 사진
    const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [signedUrlsMap, setSignedUrlsMap] = useState<Map<string, string>>(new Map());

    const { status, setStatus, progress, errorMessage, setErrorMessage, submitPost } = usePostSubmit(editId);

    // ── 수정 모드: 기존 데이터 로드 ──
    useEffect(() => {
        if (!editId) return;

        const fetchPost = async () => {
            const supabase = getSupabase();
            try {
                // 포스트
                const { data: post, error: postError } = await supabase
                    .from("posts").select("*").eq("id", editId).single();
                if (postError) throw postError;

                setTitle(post.title);
                setVisitDate(post.visit_date);
                if (post.end_date) setEndDate(post.end_date);
                setContent(post.content || "");
                const foundMajor = MAJOR_REGIONS.find(r => (post.location || "").includes(r));
                setMajorRegion(foundMajor || "");

                // 포스트 사진
                const { data: images } = await supabase
                    .from("post_images").select("*").eq("post_id", editId).order("order_index");
                const exImages = (images || []).map((img: any) => ({ id: img.id, url: img.image_url }));
                setExistingImages(exImages);

                const pathsToSign = exImages.map((i: any) => i.url).filter((u: string) => !u.startsWith("http"));
                if (pathsToSign.length > 0) {
                    const { data: signedUrls } = await supabase.storage
                        .from("archive_images").createSignedUrls(pathsToSign, 3600);
                    if (signedUrls) {
                        const map = new Map<string, string>();
                        signedUrls.forEach((su: any, i: number) => {
                            if (su.signedUrl) map.set(pathsToSign[i], su.signedUrl);
                        });
                        setSignedUrlsMap(map);
                    }
                }

                // 장소
                const { data: placeData } = await supabase
                    .from("place_records")
                    .select(`id, place_type, name, day_index, place_images(image_url, order_index)`)
                    .eq("post_id", editId)
                    .order("created_at");

                // 모든 장소의 사진 경로를 한 번에 모아 배치 signed URL 생성
                const placeList = (placeData || []).map((p: any) => {
                    const imgs = (Array.isArray(p.place_images) ? p.place_images : [])
                        .sort((a: any, b: any) => a.order_index - b.order_index);
                    return { p, paths: imgs.map((i: any) => i.image_url) };
                });
                const allPlacePaths = placeList.flatMap(({ paths }) => paths);
                let placeSignedMap = new Map<string, string>();
                if (allPlacePaths.length > 0) {
                    const { data: batchSigned } = await supabase.storage
                        .from("archive_images").createSignedUrls(allPlacePaths, 3600);
                    (batchSigned || []).forEach((s: any, i: number) => {
                        if (s.signedUrl) placeSignedMap.set(allPlacePaths[i], s.signedUrl);
                    });
                }
                const existingPlaces: PlaceEntry[] = placeList.map(({ p, paths }) => ({
                    tempId: p.id,
                    name: p.name,
                    placeType: p.place_type as PlaceType,
                    memo: p.memo ?? "",
                    files: [],
                    previews: [],
                    existingPaths: paths,
                    signedUrls: paths.map((path: string) => placeSignedMap.get(path)).filter(Boolean) as string[],
                    dayIndex: p.day_index ?? null,
                }));

                // trip_days
                const { data: tripDaysData } = await supabase
                    .from("trip_days").select("*").eq("post_id", editId).order("day_index");

                if (tripDaysData && tripDaysData.length > 0) {
                    setUseDays(true);
                    setDays(tripDaysData.map((d: any) => ({
                        dayIndex: d.day_index,
                        content: d.content || "",
                        places: existingPlaces.filter(p => p.dayIndex === d.day_index),
                    })));
                } else {
                    setPlaces(existingPlaces.filter(p => !p.dayIndex));
                }

                setStatus("idle");
            } catch (err: any) {
                console.error(err);
                setStatus("error");
                setErrorMessage("기존 게시물을 불러오는 데 실패했습니다.");
            }
        };

        fetchPost();
    }, [editId]);

    // ── 일차 계산 헬퍼 ──
    const getDayLabel = (dayIndex: number) => {
        if (!visitDate) return `${dayIndex}일차`;
        const d = new Date(visitDate);
        d.setDate(d.getDate() + dayIndex - 1);
        return `${dayIndex}일차 (${d.getMonth() + 1}/${d.getDate()})`;
    };

    const totalDays = visitDate && endDate
        ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(visitDate).getTime()) / 86400000) + 1)
        : null;

    // ── 일차 핸들러 ──
    const addDay = () => {
        setDays(prev => [...prev, { dayIndex: prev.length + 1, content: "", places: [] }]);
    };

    const removeDay = (idx: number) => {
        setDays(prev => {
            const updated = prev.filter((_, i) => i !== idx);
            return updated.map((d, i) => ({ ...d, dayIndex: i + 1 }));
        });
    };

    const updateDayContent = (idx: number, c: string) => {
        setDays(prev => prev.map((d, i) => i === idx ? { ...d, content: c } : d));
    };

    const addPlaceToDay = (idx: number) => {
        setDays(prev => prev.map((d, i) => i === idx
            ? { ...d, places: [...d.places, newPlace()] }
            : d
        ));
    };

    const updateDayPlace = (dayIdx: number, tempId: string, updates: Partial<PlaceEntry>) => {
        setDays(prev => prev.map((d, i) => i === dayIdx
            ? { ...d, places: d.places.map(p => p.tempId === tempId ? { ...p, ...updates } : p) }
            : d
        ));
    };

    const removeDayPlace = (dayIdx: number, tempId: string) => {
        setDays(prev => prev.map((d, i) => i === dayIdx
            ? { ...d, places: d.places.filter(p => p.tempId !== tempId) }
            : d
        ));
    };

    const handleDayPlacePhoto = (dayIdx: number, tempId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const day = days[dayIdx];
        const place = day.places.find(p => p.tempId === tempId);
        if (!place) return;
        const max = 3 - ((place.signedUrls?.length ?? 0) + place.previews.length);
        const files = Array.from(e.target.files).slice(0, max);
        const previews = files.map(f => URL.createObjectURL(f));
        updateDayPlace(dayIdx, tempId, {
            files: [...place.files, ...files],
            previews: [...place.previews, ...previews],
        });
    };

    // ── 단순 장소 핸들러 ──
    const addPlace = () => setPlaces(prev => [...prev, newPlace()]);

    const updatePlace = (tempId: string, updates: Partial<PlaceEntry>) => {
        setPlaces(prev => prev.map(p => p.tempId === tempId ? { ...p, ...updates } : p));
    };

    const removePlace = (tempId: string) => {
        setPlaces(prev => {
            const p = prev.find(x => x.tempId === tempId);
            p?.previews.forEach(url => URL.revokeObjectURL(url));
            return prev.filter(x => x.tempId !== tempId);
        });
    };

    const handlePlacePhoto = (tempId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const place = places.find(p => p.tempId === tempId);
        if (!place) return;
        const max = 3 - ((place.signedUrls?.length ?? 0) + place.previews.length);
        const files = Array.from(e.target.files).slice(0, max);
        const previews = files.map(f => URL.createObjectURL(f));
        updatePlace(tempId, { files: [...place.files, ...files], previews: [...place.previews, ...previews] });
    };

    // ── 포스트 사진 핸들러 ──
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const rawFiles = Array.from(e.target.files);
        if (existingImages.length + selectedFiles.length + rawFiles.length > 10) {
            alert("사진은 최대 10장까지 업로드할 수 있습니다.");
            return;
        }
        const validFiles: File[] = [];
        const maxSize = 10 * 1024 * 1024;
        const allowed = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
        for (const file of rawFiles) {
            const ext = file.name.split(".").pop()?.toLowerCase() || "";
            if (!allowed.includes(ext)) { alert(`"${file.name}" 허용되지 않는 확장자입니다.`); continue; }
            if (file.size > maxSize) { alert(`"${file.name}" 10MB를 초과합니다.`); continue; }
            if (!file.type.startsWith("image/")) { alert(`"${file.name}" 유효한 이미지가 아닙니다.`); continue; }
            validFiles.push(file);
        }
        if (validFiles.length === 0) return;
        setSelectedFiles(prev => [...prev, ...validFiles]);
        setPreviewUrls(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))]);
    };

    const removeExistingImage = (index: number) => setExistingImages(prev => prev.filter((_, i) => i !== index));
    const removeNewImage = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => { URL.revokeObjectURL(prev[index]); return prev.filter((_, i) => i !== index); });
    };

    // ── 제출 ──
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!majorRegion) { alert("지역을 선택해주세요."); return; }

        if (useDays) {
            await submitPost(
                { title, visitDate, endDate, location: majorRegion, content },
                existingImages, selectedFiles, previewUrls,
                [],   // flat places 없음
                days,
            );
        } else {
            await submitPost(
                { title, visitDate, endDate, location: majorRegion, content },
                existingImages, selectedFiles, previewUrls,
                places,
                [],   // days 없음
            );
        }
    };

    const isDisabled = status !== "idle" && status !== "error";

    if (status === "loading_post") {
        return (
            <div className="max-w-xl mx-auto p-12 text-center text-gray-500">
                <svg className="animate-spin w-8 h-8 mx-auto mb-4 text-amber-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                데이터를 불러오는 중입니다...
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-orange-100/50 border border-white/80 overflow-hidden">
            {/* 진행바 */}
            {(status === "compressing" || status === "uploading" || status === "saving") && (
                <div className="w-full bg-gray-100 h-1.5">
                    <div className="bg-amber-500 h-1.5 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">

                {/* 제목 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        여행 제목 <span className="text-amber-500">*</span>
                    </label>
                    <input
                        type="text" required value={title} onChange={e => setTitle(e.target.value)}
                        placeholder="예) 2024년 제주도 여름 휴가"
                        className="w-full px-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                </div>

                {/* 날짜 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            시작 일자 <span className="text-amber-500">*</span>
                        </label>
                        <input type="date" required value={visitDate} onChange={e => setVisitDate(e.target.value)}
                            className="w-full px-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            종료 일자 <span className="text-gray-400 text-xs">(당일치기면 비워두세요)</span>
                        </label>
                        <input type="date" value={endDate} min={visitDate} onChange={e => setEndDate(e.target.value)}
                            className="w-full px-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* 지역 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        지역 선택 <span className="text-amber-500">*</span>
                    </label>
                    <div className="relative">
                        <select required value={majorRegion} onChange={e => setMajorRegion(e.target.value)}
                            className="w-full px-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent appearance-none"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                backgroundRepeat: "no-repeat", backgroundPosition: "right 1rem center", backgroundSize: "1.25rem",
                            }}
                        >
                            <option value="" disabled>지역을 선택해주세요</option>
                            {MAJOR_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                </div>

                {/* 전체 메모 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        전체 메모 <span className="text-gray-400 text-xs">(선택)</span>
                    </label>
                    <textarea
                        rows={3} value={content} onChange={e => setContent(e.target.value)}
                        placeholder="여행 전체에 대한 기억을 적어주세요"
                        className="w-full px-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-base text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                </div>

                {/* ── 일차별 기록 섹션 ── */}
                <div>
                    {/* 토글 헤더 */}
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <span className="text-sm font-medium text-gray-700">📅 일차별로 기록하기</span>
                            {totalDays && (
                                <span className="ml-2 text-xs text-gray-400">({totalDays}일 여행)</span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                if (!useDays && totalDays && totalDays > 1 && days.length === 1) {
                                    setDays(Array.from({ length: totalDays }, (_, i) => ({ dayIndex: i + 1, content: "", places: [] })));
                                }
                                setUseDays(prev => !prev);
                            }}
                            className={`relative w-11 h-6 rounded-full transition-colors ${useDays ? "bg-amber-500" : "bg-gray-200"}`}
                        >
                            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${useDays ? "translate-x-5.5 left-0" : "left-0.5"}`} style={{ transform: useDays ? "translateX(20px)" : "translateX(2px)" }} />
                        </button>
                    </div>

                    {/* 일차별 섹션 */}
                    {useDays && (
                        <div className="space-y-4">
                            {days.map((day, dayIdx) => (
                                <div key={day.dayIndex} className="border border-amber-200 rounded-2xl overflow-hidden">
                                    {/* 일차 헤더 */}
                                    <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50">
                                        <span className="text-sm font-bold text-amber-700">{getDayLabel(day.dayIndex)}</span>
                                        {days.length > 1 && (
                                            <button type="button" onClick={() => removeDay(dayIdx)}
                                                className="text-xs text-gray-400 hover:text-red-400 transition-colors">
                                                삭제
                                            </button>
                                        )}
                                    </div>

                                    <div className="p-3 space-y-3">
                                        {/* 일차 메모 */}
                                        <textarea
                                            rows={2}
                                            value={day.content}
                                            onChange={e => updateDayContent(dayIdx, e.target.value)}
                                            placeholder={`${getDayLabel(day.dayIndex)} 기억을 적어주세요`}
                                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                                        />

                                        {/* 일차 장소 목록 */}
                                        {day.places.map(place => (
                                            <PlaceRow
                                                key={place.tempId}
                                                place={place}
                                                region={majorRegion}
                                                disabled={isDisabled}
                                                onChange={updates => updateDayPlace(dayIdx, place.tempId, updates)}
                                                onRemove={() => removeDayPlace(dayIdx, place.tempId)}
                                                onPhotoAdd={e => handleDayPlacePhoto(dayIdx, place.tempId, e)}
                                            />
                                        ))}

                                        <button
                                            type="button"
                                            onClick={() => addPlaceToDay(dayIdx)}
                                            className="w-full py-2 text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-xl border border-dashed border-amber-300 transition-colors"
                                        >
                                            + 장소 추가
                                        </button>
                                    </div>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={addDay}
                                className="w-full py-2.5 text-sm font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-dashed border-gray-300 transition-colors"
                            >
                                + {days.length + 1}일차 추가
                            </button>
                        </div>
                    )}

                    {/* 단순 장소 목록 (일차 미구분) */}
                    {!useDays && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">🗺️ 방문한 장소 <span className="text-gray-400 text-xs">(선택)</span></span>
                                <button type="button" onClick={addPlace}
                                    className="text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-full transition-colors">
                                    + 장소 추가
                                </button>
                            </div>

                            {places.length === 0 && (
                                <p className="text-xs text-gray-400 text-center py-2">
                                    방문한 사찰, 식당, 카페를 기록해보세요
                                </p>
                            )}

                            {places.map(place => (
                                <PlaceRow
                                    key={place.tempId}
                                    place={place}
                                    region={majorRegion}
                                    disabled={isDisabled}
                                    onChange={updates => updatePlace(place.tempId, updates)}
                                    onRemove={() => removePlace(place.tempId)}
                                    onPhotoAdd={e => handlePlacePhoto(place.tempId, e)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* 여행 사진 */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        추억 사진들 <span className="text-gray-400 text-xs">(선택)</span>
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {existingImages.map((img, i) => (
                            <div key={`ext-${i}`} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
                                <Image
                                    src={signedUrlsMap.get(img.url) || img.url}
                                    alt={`existing-${i}`} fill sizes="100px" className="object-cover rounded-lg"
                                />
                                <button type="button" onClick={() => removeExistingImage(i)}
                                    className="absolute -top-1 -right-1 bg-gray-500 text-white rounded-full p-0.5">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}

                        {previewUrls.map((url, i) => (
                            <div key={`new-${i}`} className="relative aspect-square rounded-2xl overflow-hidden group bg-gray-100 border border-gray-200">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt={`Preview ${i}`} className="object-cover w-full h-full" />
                                <button type="button" onClick={() => removeNewImage(i)}
                                    className="absolute top-1.5 right-1.5 bg-black/50 text-white rounded-full p-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}

                        {(existingImages.length + selectedFiles.length) < 10 && (
                            <label className="relative aspect-square rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 flex flex-col items-center justify-center cursor-pointer hover:bg-amber-100/50 hover:border-amber-400 transition-colors">
                                <input type="file" multiple accept="image/*,image/heic,image/heif"
                                    onChange={handleFileSelect} className="hidden" disabled={isDisabled} />
                                <svg className="w-8 h-8 text-amber-500 mb-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                <span className="text-xs font-medium text-amber-600">사진 추가</span>
                            </label>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">최대 10장까지 업로드 가능합니다 (HEIC 자동 변환 됨).</p>
                </div>

                {/* 에러 */}
                {status === "error" && (
                    <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl">{errorMessage}</div>
                )}

                {/* 제출 버튼 */}
                <button
                    type="submit"
                    disabled={isDisabled}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-base rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {(status === "compressing" || status === "uploading" || status === "saving") && (
                        <>
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span>
                                {status === "compressing" && `사진 압축 중... (${progress}%)`}
                                {status === "uploading" && `업로드 중... (${progress}%)`}
                                {status === "saving" && "저장 중..."}
                            </span>
                        </>
                    )}
                    {status === "success" && (
                        <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            <span>저장 완료!</span>
                        </>
                    )}
                    {(status === "idle" || status === "error") && (
                        editId ? "추억 수정하기" : "이 추억 간직하기"
                    )}
                </button>
            </form>
        </div>
    );
}
