import { useState } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import { getSupabase } from "@/lib/supabase";
import { z } from "zod";
import { revalidateHome } from "@/app/actions";
import { savePlaces, PlaceEntry, DayRecord } from "@/lib/placeUtils";

export type { PlaceEntry, DayRecord };

export const PostSchema = z.object({
    title: z.string().min(1, "여행 제목은 필수입니다."),
    visitDate: z.string().min(1, "시작 일자는 필수입니다."),
    endDate: z.string().optional(),
    location: z.string().optional(),
    content: z.string().optional(),
});

export type PostInput = z.infer<typeof PostSchema>;

export type UploadStatus = "idle" | "loading_post" | "compressing" | "uploading" | "saving" | "success" | "error";

export interface ExistingImage {
    id: string;
    url: string;
}

export function usePostSubmit(editId: string | null) {
    const router = useRouter();
    const [status, setStatus] = useState<UploadStatus>(editId ? "loading_post" : "idle");
    const [progress, setProgress] = useState(0);
    const [errorMessage, setErrorMessage] = useState("");

    const submitPost = async (
        input: PostInput,
        existingImages: ExistingImage[],
        selectedFiles: File[],
        previewUrls: string[],
        places: PlaceEntry[] = [],    // 일차 미구분 장소
        days: DayRecord[] = [],       // 일차별 기록
    ) => {
        try {
            const validatedData = PostSchema.parse(input);
            const supabase = getSupabase();

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
                router.push("/login");
                return;
            }

            setErrorMessage("");
            setStatus("compressing");
            setProgress(0);

            // Step A: 이미지 압축
            const compressedFiles: File[] = [];
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                fileType: "image/webp" as const,
            };

            for (let i = 0; i < selectedFiles.length; i++) {
                compressedFiles.push(await imageCompression(selectedFiles[i], options));
                setProgress(Math.round(((i + 1) / selectedFiles.length) * 30));
            }

            // Step B: 스토리지 업로드
            setStatus("uploading");
            const uploadedImageUrls: string[] = [];
            const timestamp = Date.now();

            for (let i = 0; i < compressedFiles.length; i++) {
                const filePath = `${user.id}/${timestamp}_${i}.webp`;
                const { error: uploadError } = await supabase.storage
                    .from("archive_images")
                    .upload(filePath, compressedFiles[i], {
                        contentType: "image/webp",
                        cacheControl: "3600",
                        upsert: false,
                    });
                if (uploadError) throw new Error(`업로드 실패: ${uploadError.message}`);
                uploadedImageUrls.push(filePath);
                setProgress(30 + Math.round(((i + 1) / compressedFiles.length) * 50));
            }

            // Step C: 포스트 저장
            setStatus("saving");
            setProgress(85);

            const postPayload = {
                title: validatedData.title,
                visit_date: validatedData.visitDate,
                end_date: validatedData.endDate || null,
                location: validatedData.location || null,
                content: validatedData.content || null,
            };

            let postId = editId;

            if (editId) {
                // 수정 흐름: 스토리지 경로를 먼저 수집 → DB 삭제 → 새 데이터 삽입 → 스토리지 정리
                // (DB 삭제가 실패하면 스토리지 파일은 그대로 유지되어 데이터 손실 방지)

                const { error: updateError } = await supabase
                    .from("posts")
                    .update(postPayload)
                    .eq("id", editId);
                if (updateError) throw new Error(`게시물 수정 실패: ${updateError.message}`);

                // 1단계: 삭제할 스토리지 경로 미리 수집 (삭제 전)
                const keptUrls = new Set(existingImages.map(img => img.url));
                const { data: oldPostImgs } = await supabase
                    .from("post_images").select("image_url").eq("post_id", editId);
                const postFilesToDelete = (oldPostImgs || [])
                    .map((r: any) => r.image_url)
                    .filter((p: string) => !keptUrls.has(p) && !p.startsWith("http"));

                const { data: oldPlaceImgs } = await supabase
                    .from("place_images")
                    .select("image_url, place_records!inner(post_id)")
                    .eq("place_records.post_id", editId);
                const placeFilesToDelete = (oldPlaceImgs || [])
                    .map((r: any) => r.image_url)
                    .filter((p: string) => !p.startsWith("http"));

                // 2단계: DB 레코드 삭제 (CASCADE로 place_images도 함께 삭제됨)
                const { error: delPostImgs } = await supabase
                    .from("post_images").delete().eq("post_id", editId);
                if (delPostImgs) throw new Error(`기존 사진 삭제 실패: ${delPostImgs.message}`);

                const { error: delPlaces } = await supabase
                    .from("place_records").delete().eq("post_id", editId);
                if (delPlaces) throw new Error(`기존 장소 삭제 실패: ${delPlaces.message}`);

                const { error: delDays } = await supabase
                    .from("trip_days").delete().eq("post_id", editId);
                if (delDays) throw new Error(`기존 일차 삭제 실패: ${delDays.message}`);

                // 3단계: 스토리지 파일 정리 (DB 삭제 성공 후에만 실행)
                const allFilesToDelete = [...postFilesToDelete, ...placeFilesToDelete];
                if (allFilesToDelete.length > 0) {
                    await supabase.storage.from("archive_images").remove(allFilesToDelete);
                }
            } else {
                const { data: postData, error: postError } = await supabase
                    .from("posts")
                    .insert(postPayload)
                    .select("id")
                    .single();
                if (postError) throw new Error(`게시물 저장 실패: ${postError.message}`);
                postId = postData.id;
            }

            setProgress(92);

            // Step D: 사진 링크 저장
            const finalImageUrls = [
                ...existingImages.map(img => img.url),
                ...uploadedImageUrls,
            ];
            if (finalImageUrls.length > 0) {
                const { error: imageInsertError } = await supabase
                    .from("post_images")
                    .insert(finalImageUrls.map((url, index) => ({
                        post_id: postId,
                        image_url: url,
                        order_index: index,
                    })));
                if (imageInsertError) throw new Error(`사진 링크 저장 실패: ${imageInsertError.message}`);
            }

            // Step E: 장소 저장 (일차 미구분)
            const validPlaces = places.filter(p => p.name.trim());
            if (validPlaces.length > 0 && postId) {
                await savePlaces(validPlaces, validatedData.location || "", user.id, postId);
            }

            // Step F: 일차별 기록 저장
            if (days.length > 0 && postId) {
                // trip_days 삽입
                const dayRows = days.map(d => ({
                    post_id: postId,
                    day_index: d.dayIndex,
                    content: d.content || "",
                }));
                const { error: dayError } = await supabase.from("trip_days").insert(dayRows);
                if (dayError) throw new Error(`일차 기록 저장 실패: ${dayError.message}`);

                // 각 일차의 장소 저장
                for (const day of days) {
                    const validDayPlaces = day.places
                        .filter(p => p.name.trim())
                        .map(p => ({ ...p, dayIndex: day.dayIndex }));
                    if (validDayPlaces.length > 0) {
                        await savePlaces(validDayPlaces, validatedData.location || "", user.id, postId);
                    }
                }
            }

            setProgress(100);
            setStatus("success");

            await revalidateHome();
            previewUrls.forEach(url => URL.revokeObjectURL(url));

            setTimeout(() => {
                router.push("/");
                router.refresh();
            }, 500);

        } catch (err: any) {
            console.error(err);
            setStatus("error");
            if (err instanceof z.ZodError) {
                setErrorMessage(err.issues[0].message);
            } else {
                setErrorMessage(err.message || "알 수 없는 오류가 발생했습니다.");
            }
        }
    };

    return { status, setStatus, progress, errorMessage, setErrorMessage, submitPost };
}
