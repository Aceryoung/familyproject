"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getSupabase } from "@/lib/supabase";
import { PlaceType, PLACE_TYPE_LABELS } from "@/lib/placeUtils";
import { MAJOR_REGIONS } from "@/lib/regions";
import imageCompression from "browser-image-compression";

interface EditPlaceFormProps {
    placeId: string;
    initialRegion: string;
    initialPlaceType: PlaceType;
    initialName: string;
    initialMemo: string;
    existingPaths: string[];       // storage 경로 (원본)
    existingSignedUrls: string[];  // 표시용 signed URL
}

const COMPRESSION_OPTIONS = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: "image/webp" as const,
};

export default function EditPlaceForm({
    placeId,
    initialRegion,
    initialPlaceType,
    initialName,
    initialMemo,
    existingPaths,
    existingSignedUrls,
}: EditPlaceFormProps) {
    const router = useRouter();
    const [region, setRegion] = useState(initialRegion);
    const [placeType, setPlaceType] = useState<PlaceType>(initialPlaceType);
    const [name, setName] = useState(initialName);
    const [memo, setMemo] = useState(initialMemo);

    // 기존 사진: 삭제 여부 추적
    const [keptPaths, setKeptPaths] = useState<string[]>(existingPaths);
    const [keptSignedUrls, setKeptSignedUrls] = useState<string[]>(existingSignedUrls);

    // 새로 추가할 사진
    const [newFiles, setNewFiles] = useState<File[]>([]);
    const [newPreviews, setNewPreviews] = useState<string[]>([]);

    const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const totalPhotos = keptPaths.length + newFiles.length;

    const removeExistingPhoto = (i: number) => {
        setKeptPaths((prev) => prev.filter((_, idx) => idx !== i));
        setKeptSignedUrls((prev) => prev.filter((_, idx) => idx !== i));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const maxNew = 3 - totalPhotos;
        const selected = Array.from(e.target.files).slice(0, maxNew);
        setNewFiles((prev) => [...prev, ...selected]);
        setNewPreviews((prev) => [...prev, ...selected.map((f) => URL.createObjectURL(f))]);
    };

    const removeNewPhoto = (i: number) => {
        URL.revokeObjectURL(newPreviews[i]);
        setNewFiles((prev) => prev.filter((_, idx) => idx !== i));
        setNewPreviews((prev) => prev.filter((_, idx) => idx !== i));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { alert("장소 이름을 입력해주세요."); return; }

        setStatus("saving");
        setErrorMsg("");

        try {
            const supabase = getSupabase();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { alert("로그인이 필요합니다."); router.push("/login"); return; }

            // 1. place_records 업데이트
            const { error: updateError } = await supabase
                .from("place_records")
                .update({ region, place_type: placeType, name: name.trim(), memo: memo.trim() || null })
                .eq("id", placeId);
            if (updateError) throw new Error(`수정 실패: ${updateError.message}`);

            // 2. 삭제된 기존 사진 제거 (storage + DB)
            const deletedPaths = existingPaths.filter((p) => !keptPaths.includes(p));
            if (deletedPaths.length > 0) {
                await supabase.storage.from("archive_images").remove(deletedPaths);
                for (const path of deletedPaths) {
                    await supabase.from("place_images").delete().eq("image_url", path).eq("place_id", placeId);
                }
            }

            // 3. 새 사진 업로드
            const ts = Date.now();
            for (let i = 0; i < newFiles.length; i++) {
                const compressed = await imageCompression(newFiles[i], COMPRESSION_OPTIONS);
                const filePath = `places/${user.id}/${ts}_${i}.webp`;
                const { error: uploadError } = await supabase.storage
                    .from("archive_images")
                    .upload(filePath, compressed, { contentType: "image/webp", cacheControl: "3600", upsert: false });
                if (uploadError) throw new Error(`사진 업로드 실패: ${uploadError.message}`);

                const newOrder = keptPaths.length + i;
                await supabase.from("place_images").insert({ place_id: placeId, image_url: filePath, order_index: newOrder });
            }

            setStatus("success");
            setTimeout(() => router.push(`/places/${placeId}`), 500);
        } catch (err: any) {
            setStatus("error");
            setErrorMsg(err.message || "저장 중 오류가 발생했습니다.");
        }
    };

    return (
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-orange-100/50 border border-white/80 overflow-hidden">
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">

                {/* Region */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">지역</label>
                    <div className="relative">
                        <select
                            value={region}
                            onChange={(e) => setRegion(e.target.value)}
                            className="w-full px-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent appearance-none"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                backgroundRepeat: "no-repeat",
                                backgroundPosition: "right 1rem center",
                                backgroundSize: "1.25rem",
                            }}
                        >
                            {MAJOR_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                </div>

                {/* Place Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">장소 종류</label>
                    <div className="grid grid-cols-3 gap-3">
                        {(["temple", "restaurant", "cafe"] as PlaceType[]).map((type) => {
                            const { label, emoji } = PLACE_TYPE_LABELS[type];
                            return (
                                <button key={type} type="button" onClick={() => setPlaceType(type)}
                                    className={`py-3 rounded-2xl text-sm font-semibold transition-all ${
                                        placeType === type ? "bg-amber-500 text-white shadow-md" : "bg-gray-50 text-gray-600 border border-gray-200 hover:border-amber-300"
                                    }`}>
                                    <span className="text-xl block mb-1">{emoji}</span>{label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {PLACE_TYPE_LABELS[placeType].emoji} {PLACE_TYPE_LABELS[placeType].label} 이름 <span className="text-amber-500">*</span>
                    </label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                </div>

                {/* Memo */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">간단 메모 <span className="text-gray-400 text-xs">(선택)</span></label>
                    <textarea
                        rows={3}
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        placeholder="맛, 분위기, 다시 오고 싶은지 등 간단히 적어주세요"
                        className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                </div>

                {/* Photos */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        사진 <span className="text-gray-400 text-xs">({totalPhotos}/3)</span>
                    </label>
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* 기존 사진 */}
                        {keptSignedUrls.map((url, i) => (
                            <div key={`existing-${i}`} className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gray-100">
                                <Image src={url} alt="" fill sizes="80px" className="object-cover" />
                                <button type="button" onClick={() => removeExistingPhoto(i)}
                                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                        {/* 새 사진 */}
                        {newPreviews.map((url, i) => (
                            <div key={`new-${i}`} className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gray-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt="" className="w-full h-full object-cover" />
                                <button type="button" onClick={() => removeNewPhoto(i)}
                                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                        {/* 추가 버튼 */}
                        {totalPhotos < 3 && (
                            <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 flex flex-col items-center justify-center cursor-pointer hover:bg-amber-100/50">
                                <input type="file" multiple accept="image/*,image/heic,image/heif" onChange={handleFileSelect} className="hidden" disabled={status === "saving"} />
                                <svg className="w-6 h-6 text-amber-500 mb-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                <span className="text-xs text-amber-600 font-medium">추가</span>
                            </label>
                        )}
                    </div>
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
                    {status === "success" && "✓ 수정 완료!"}
                    {(status === "idle" || status === "error") && "수정 저장하기"}
                </button>
            </form>
        </div>
    );
}
