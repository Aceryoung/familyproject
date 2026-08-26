"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { savePlaces, PlaceEntry, PlaceType, PLACE_TYPE_LABELS } from "@/lib/placeUtils";
import { TEMPLES_BY_REGION } from "@/lib/templeData";
import { MAJOR_REGIONS } from "@/lib/regions";

export default function AddPlaceForm() {
    const router = useRouter();
    const [region, setRegion] = useState("");
    const [placeType, setPlaceType] = useState<PlaceType>("temple");
    // 사찰: 멀티선택 배열 + 직접입력
    const [selectedTemples, setSelectedTemples] = useState<string[]>([]);
    const [manualTempleName, setManualTempleName] = useState("");
    // 사찰 외 장소: 단일 이름
    const [name, setName] = useState("");
    const [memo, setMemo] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const templeChips = TEMPLES_BY_REGION[region] ?? [];

    const toggleTemple = (temple: string) => {
        setSelectedTemples((prev) =>
            prev.includes(temple) ? prev.filter((t) => t !== temple) : [...prev, temple]
        );
    };

    // 실제 저장할 사찰 이름 목록 (칩 선택 + 직접입력, 쉼표로 여러 개 구분 가능)
    const manualTempleNames = manualTempleName
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    const allTempleNames = [...selectedTemples, ...manualTempleNames];

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const selected = Array.from(e.target.files).slice(0, 3 - files.length);
        setFiles((prev) => [...prev, ...selected]);
        setPreviews((prev) => [...prev, ...selected.map((f) => URL.createObjectURL(f))]);
    };

    const removePhoto = (i: number) => {
        URL.revokeObjectURL(previews[i]);
        setFiles((prev) => prev.filter((_, idx) => idx !== i));
        setPreviews((prev) => prev.filter((_, idx) => idx !== i));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!region) { alert("지역을 선택해주세요."); return; }

        const isTemple = placeType === "temple";
        if (isTemple && allTempleNames.length === 0) {
            alert("사찰을 선택하거나 이름을 입력해주세요."); return;
        }
        if (!isTemple && !name.trim()) {
            alert("장소 이름을 입력해주세요."); return;
        }

        setStatus("saving");
        setErrorMsg("");
        try {
            const supabase = getSupabase();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { alert("로그인이 필요합니다."); router.push("/login"); return; }

            const ts = Date.now();

            if (isTemple) {
                // 선택된 사찰 수만큼 각각 PlaceEntry 생성
                const entries: PlaceEntry[] = allTempleNames.map((templeName, i) => ({
                    tempId: `${ts}_${i}`,
                    name: templeName,
                    placeType: "temple",
                    memo: memo.trim() || undefined,
                    // 사진은 첫 번째 사찰에만 첨부 (공통 사진 공유 불가)
                    files: i === 0 ? files : [],
                    previews: i === 0 ? previews : [],
                }));
                await savePlaces(entries, region, user.id, null);
            } else {
                const entry: PlaceEntry = {
                    tempId: `${ts}`,
                    name: name.trim(),
                    placeType,
                    memo: memo.trim() || undefined,
                    files,
                    previews,
                };
                await savePlaces([entry], region, user.id, null);
            }

            setStatus("success");
            setTimeout(() => router.push("/places"), 600);
        } catch (err: any) {
            setStatus("error");
            setErrorMsg(err.message || "저장 중 오류가 발생했습니다.");
        }
    };

    return (
        <div className="max-w-xl mx-auto bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-orange-100/50 border border-white/80 overflow-hidden">
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">

                {/* Region */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        지역 <span className="text-amber-500">*</span>
                    </label>
                    <div className="relative">
                        <select
                            required
                            value={region}
                            onChange={(e) => { setRegion(e.target.value); setSelectedTemples([]); }}
                            className="w-full px-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent appearance-none"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                backgroundRepeat: "no-repeat",
                                backgroundPosition: "right 1rem center",
                                backgroundSize: "1.25rem",
                            }}
                        >
                            <option value="" disabled>지역을 선택해주세요</option>
                            {MAJOR_REGIONS.map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Place Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        장소 종류 <span className="text-amber-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        {(["temple", "restaurant", "cafe"] as PlaceType[]).map((type) => {
                            const { label, emoji } = PLACE_TYPE_LABELS[type];
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => { setPlaceType(type); setSelectedTemples([]); setManualTempleName(""); setName(""); }}
                                    className={`py-3 rounded-2xl text-sm font-semibold transition-all ${
                                        placeType === type
                                            ? "bg-amber-500 text-white shadow-md"
                                            : "bg-gray-50 text-gray-600 border border-gray-200 hover:border-amber-300"
                                    }`}
                                >
                                    <span className="text-xl block mb-1">{emoji}</span>
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Name / Temple multi-select */}
                {placeType === "temple" ? (
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                            🛕 사찰 선택 <span className="text-amber-500">*</span>
                            {selectedTemples.length > 0 && (
                                <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                    {selectedTemples.length}곳 선택됨
                                </span>
                            )}
                        </label>

                        {/* 유명 사찰 칩 (멀티선택) */}
                        {templeChips.length > 0 && (
                            <div>
                                <p className="text-xs text-gray-400 mb-2">유명 사찰 (여러 곳 선택 가능)</p>
                                <div className="flex flex-wrap gap-2">
                                    {templeChips.map((temple) => {
                                        const isSelected = selectedTemples.includes(temple);
                                        return (
                                            <button
                                                key={temple}
                                                type="button"
                                                onClick={() => toggleTemple(temple)}
                                                disabled={status === "saving"}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                                    isSelected
                                                        ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                                                        : "bg-white text-gray-600 border-gray-200 hover:border-amber-400 hover:text-amber-600"
                                                }`}
                                            >
                                                {isSelected ? "✓ " : ""}🛕 {temple}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {!region && (
                            <p className="text-xs text-gray-400">지역을 먼저 선택하면 유명 사찰 목록이 표시됩니다</p>
                        )}

                        {/* 직접 입력 */}
                        <div>
                            <p className="text-xs text-gray-400 mb-1.5">직접 입력</p>
                            <input
                                type="text"
                                value={manualTempleName}
                                onChange={(e) => setManualTempleName(e.target.value)}
                                placeholder="예) 불국사, 석굴암, 통도사 (쉼표로 여러 개 입력 가능)"
                                disabled={status === "saving"}
                                className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                            />
                        </div>

                        {/* 선택된 목록 미리보기 */}
                        {allTempleNames.length > 0 && (
                            <div className="p-3 bg-amber-50 rounded-2xl">
                                <p className="text-xs font-medium text-amber-700 mb-1.5">저장될 사찰 목록</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {allTempleNames.map((t) => (
                                        <span key={t} className="text-xs bg-white text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                                            🛕 {t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {PLACE_TYPE_LABELS[placeType].emoji} {PLACE_TYPE_LABELS[placeType].label} 이름 <span className="text-amber-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={`예) ${placeType === "restaurant" ? "가족 돼지갈비" : "파란 지붕 카페"}`}
                            className="w-full px-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                        />
                    </div>
                )}

                {/* Memo */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        간단 메모 <span className="text-gray-400 text-xs">(선택)</span>
                    </label>
                    <textarea
                        rows={2}
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        placeholder="맛, 분위기, 다시 오고 싶은지 등 간단히 적어주세요"
                        className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                </div>

                {/* Photos */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        사진 <span className="text-gray-400 text-xs">(최대 3장)</span>
                    </label>
                    <div className="flex items-center gap-3 flex-wrap">
                        {previews.map((url, i) => (
                            <div key={i} className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gray-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt="" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removePhoto(i)}
                                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                        {files.length < 3 && (
                            <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 flex flex-col items-center justify-center cursor-pointer hover:bg-amber-100/50">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*,image/heic,image/heif"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    disabled={status === "saving"}
                                />
                                <svg className="w-6 h-6 text-amber-500 mb-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                <span className="text-xs text-amber-600 font-medium">추가</span>
                            </label>
                        )}
                    </div>
                    {placeType === "temple" && allTempleNames.length > 1 && (
                        <p className="text-xs text-gray-400 mt-2">사진은 첫 번째 사찰({allTempleNames[0]})에 첨부됩니다</p>
                    )}
                </div>

                {status === "error" && (
                    <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl">{errorMsg}</div>
                )}

                <button
                    type="submit"
                    disabled={status === "saving" || status === "success"}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-base rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {status === "saving" && (
                        <>
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            저장 중...
                        </>
                    )}
                    {status === "success" && "✓ 저장 완료!"}
                    {(status === "idle" || status === "error") && (
                        placeType === "temple" && allTempleNames.length > 1
                            ? `사찰 ${allTempleNames.length}곳 기록하기`
                            : "장소 기록하기"
                    )}
                </button>
            </form>
        </div>
    );
}
