"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { getSupabase } from "@/lib/supabase";
import { usePostSubmit, ExistingImage, UploadStatus } from "@/hooks/usePostSubmit";

export default function CreatePostForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get("edit"); // If present, we are in edit mode

    // Form State
    const [title, setTitle] = useState("");
    const [visitDate, setVisitDate] = useState(new Date().toISOString().split("T")[0]);
    const [endDate, setEndDate] = useState(""); // New field
    const [location, setLocation] = useState(searchParams.get("region") || "");
    const [content, setContent] = useState("");

    // Image State
    const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [signedUrlsMap, setSignedUrlsMap] = useState<Map<string, string>>(new Map());

    // Form & Upload Logic from Hook
    const { status, setStatus, progress, errorMessage, setErrorMessage, submitPost } = usePostSubmit(editId);

    useEffect(() => {
        if (!editId) return;
        
        const fetchPost = async () => {
            const supabase = getSupabase();
            try {
                // Fetch post data
                const { data: post, error: postError } = await supabase
                    .from("posts")
                    .select("*")
                    .eq("id", editId)
                    .single();

                if (postError) throw postError;

                setTitle(post.title);
                setVisitDate(post.visit_date);
                if (post.end_date) setEndDate(post.end_date);
                setLocation(post.location || "");
                setContent(post.content || "");

                // Fetch images
                const { data: images, error: imagesError } = await supabase
                    .from("post_images")
                    .select("*")
                    .eq("post_id", editId)
                    .order("order_index", { ascending: true });

                if (imagesError) throw imagesError;

                const exImages = images.map((img: any) => ({
                    id: img.id,
                    url: img.image_url,
                }));
                setExistingImages(exImages);

                // Fetch signed URLs for previewing existing images
                const pathsToSign = exImages
                    .map((img: any) => img.url)
                    .filter((url: string) => !url.startsWith("http"));

                if (pathsToSign.length > 0) {
                    const { data: signedUrls, error: signError } = await supabase
                        .storage
                        .from("archive_images")
                        .createSignedUrls(pathsToSign, 60 * 60);

                    if (!signError && signedUrls) {
                        const newUrlMap = new Map<string, string>();
                        signedUrls.forEach((su: any, idx: number) => {
                            if (!su.error && su.signedUrl) {
                                newUrlMap.set(pathsToSign[idx], su.signedUrl);
                            }
                        });
                        setSignedUrlsMap(newUrlMap);
                    }
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

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const rawFiles = Array.from(e.target.files);

        // 최대 10장 제한 
        if (existingImages.length + selectedFiles.length + rawFiles.length > 10) {
            alert("사진은 최대 10장까지 업로드할 수 있습니다.");
            return;
        }

        const validFiles: File[] = [];
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedExtensions = ["jpg", "jpeg", "png", "webp", "heic", "heif"];

        for (const file of rawFiles) {
            const ext = file.name.split('.').pop()?.toLowerCase() || "";
            if (!allowedExtensions.includes(ext)) {
                alert(`파일 "${file.name}" 은(는) 허용되지 않는 확장자입니다. (jpg, png, webp, heic 지원)`);
                continue;
            }
            if (file.size > maxSize) {
                alert(`파일 "${file.name}" 은(는) 10MB를 초과하여 제외되었습니다.`);
                continue;
            }
            if (!file.type.startsWith("image/")) {
                alert(`파일 "${file.name}" 은(는) 유효한 이미지가 아닙니다.`);
                continue;
            }
            validFiles.push(file);
        }

        if (validFiles.length === 0) return;

        setSelectedFiles((prev) => [...prev, ...validFiles]);

        // 미리보기 URL 생성
        const newPreviews = validFiles.map(file => URL.createObjectURL(file));
        setPreviewUrls((prev) => [...prev, ...newPreviews]);
    };

    const removeExistingImage = (index: number) => {
        setExistingImages(prev => prev.filter((_, i) => i !== index));
    };

    const removeNewImage = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => {
            const newUrls = prev.filter((_, i) => i !== index);
            URL.revokeObjectURL(prev[index]); // 메모리 누수 방지
            return newUrls;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await submitPost(
            { title, visitDate, endDate, location, content },
            existingImages,
            selectedFiles,
            previewUrls
        );
    };

    if (status === "loading_post") {
        return (
            <div className="max-w-xl mx-auto p-12 text-center text-gray-500">
                <svg className="animate-spin w-8 h-8 mx-auto mb-4 text-amber-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                데이터를 불러오는 중입니다...
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto bg-white/70 backdrop-blur-xl rounded-3xl shadow-xl shadow-orange-100/50 border border-white/80 overflow-hidden">
            {/* Progress Bar (상단에 얇게 배치) */}
            {(status === "compressing" || status === "uploading" || status === "saving") && (
                <div className="w-full bg-gray-100 h-1.5">
                    <div
                        className="bg-amber-500 h-1.5 transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">

                {/* Title Input */}
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                        여행 제목 <span className="text-amber-500">*</span>
                    </label>
                    <input
                        id="title"
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="예) 2024년 제주도 여름 휴가"
                        className="w-full px-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                </div>

                {/* Dates (start to end) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                        <label htmlFor="visitDate" className="block text-sm font-medium text-gray-700 mb-2">
                            시작 일자 <span className="text-amber-500">*</span>
                        </label>
                        <input
                            id="visitDate"
                            type="date"
                            required
                            value={visitDate}
                            onChange={(e) => setVisitDate(e.target.value)}
                            className="w-full px-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                            종료 일자 <span className="text-gray-400 text-xs">(당일치기면 비워두세요)</span>
                        </label>
                        <input
                            id="endDate"
                            type="date"
                            value={endDate}
                            min={visitDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Location */}
                <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                        장소
                    </label>
                    <input
                        id="location"
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="예) 제주특별자치도 서귀포시"
                        className="w-full px-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                </div>

                {/* Content Input */}
                <div>
                    <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                        기억에 남는 순간들
                    </label>
                    <textarea
                        id="content"
                        rows={4}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="어떤 추억이 있었나요?"
                        className="w-full px-4 py-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl text-base text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    />
                </div>

                {/* Image Upload Area */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        추억 사진들 <span className="text-amber-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {/* Existing Images Previews */}
                        {existingImages.map((img, i) => {
                            const displayUrl = img.url.startsWith("http") ? img.url : signedUrlsMap.get(img.url);
                            return (
                                <div key={`ext-${i}`} className="relative aspect-square rounded-2xl overflow-hidden group bg-gray-100 border border-gray-200">
                                    <div key={i} className="relative aspect-square">
                                        <Image 
                                            src={signedUrlsMap.get(img.url) || img.url} 
                                            alt={`existing-${i}`} 
                                            fill
                                            sizes="100px"
                                            className="object-cover rounded-lg" 
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeExistingImage(i)}
                                            className="absolute -top-1 -right-1 bg-gray-500 text-white rounded-full p-0.5"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {/* New Image Previews */}
                        {previewUrls.map((url, i) => (
                            <div key={`new-${i}`} className="relative aspect-square rounded-2xl overflow-hidden group bg-gray-100 border border-gray-200">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt={`Preview ${i}`} className="object-cover w-full h-full" />
                                <button
                                    type="button"
                                    onClick={() => removeNewImage(i)}
                                    className="absolute top-1.5 right-1.5 bg-black/50 text-white rounded-full p-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}

                        {/* Upload Button */}
                        {(existingImages.length + selectedFiles.length) < 10 && (
                            <label className="relative aspect-square rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 flex flex-col items-center justify-center cursor-pointer hover:bg-amber-100/50 hover:border-amber-400 transition-colors">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*,image/heic,image/heif"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    disabled={status !== "idle" && status !== "error"}
                                />
                                <svg className="w-8 h-8 text-amber-500 mb-1" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                <span className="text-xs font-medium text-amber-600">사진 추가</span>
                            </label>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">최대 10장까지 업로드 가능합니다 (HEIC 자동 변환 됨).</p>
                </div>

                {/* Error Message */}
                {status === "error" && (
                    <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl">
                        {errorMessage}
                    </div>
                )}

                {/* Submit Button & Status Indicator */}
                <button
                    type="submit"
                    disabled={status !== "idle" && status !== "error"}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-base rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {status === "compressing" && (
                        <>
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            <span>사진 압축 중... ({progress}%)</span>
                        </>
                    )}
                    {status === "uploading" && (
                        <>
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            <span>서버로 업로드 중... ({progress}%)</span>
                        </>
                    )}
                    {status === "saving" && (
                        <>
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            <span>기록 저장 중...</span>
                        </>
                    )}
                    {status === "success" && (
                        <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                            <span>업로드 성공!</span>
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
