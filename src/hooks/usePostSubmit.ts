import { useState } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import { getSupabase } from "@/lib/supabase";
import { z } from "zod";

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
    id: string; // post_images id
    url: string; // image_url
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
        previewUrls: string[]
    ) => {
        try {
            // Zod Validation
            const validatedData = PostSchema.parse(input);

            if (existingImages.length === 0 && selectedFiles.length === 0) {
                throw new z.ZodError([{ path: ["images"], message: "최소 1장의 사진이 필요합니다.", code: "custom" }]);
            }

            const supabase = getSupabase();

            // Auth Check
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert("로그인이 만료되었습니다. 다시 로그인해주세요.");
                router.push("/login");
                return;
            }

            setErrorMessage("");
            setStatus("compressing");
            setProgress(0);

            // Step A-1: Compress Images
            const compressedFiles: File[] = [];
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                fileType: "image/webp" as const,
            };

            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                const compressedFile = await imageCompression(file, options);
                compressedFiles.push(compressedFile);
                setProgress(Math.round(((i + 1) / selectedFiles.length) * 30));
            }

            // Step A-2: Upload to Storage
            setStatus("uploading");
            const uploadedImageUrls: string[] = [];
            const timestamp = Date.now();

            for (let i = 0; i < compressedFiles.length; i++) {
                const file = compressedFiles[i];
                const filePath = `${user.id}/${timestamp}_${i}.webp`;

                const { error: uploadError } = await supabase.storage
                    .from("archive_images")
                    .upload(filePath, file, {
                        contentType: "image/webp",
                        cacheControl: "3600",
                        upsert: false,
                    });

                if (uploadError) throw new Error(`업로드 실패: ${uploadError.message}`);
                uploadedImageUrls.push(filePath);
                setProgress(30 + Math.round(((i + 1) / compressedFiles.length) * 50));
            }

            // Step B: Upsert Post
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
                const { error: updateError } = await supabase
                    .from("posts")
                    .update(postPayload)
                    .eq("id", editId);

                if (updateError) throw new Error(`게시물 수정 실패: ${updateError.message}`);

                const { error: deleteImagesError } = await supabase
                    .from("post_images")
                    .delete()
                    .eq("post_id", editId);

                if (deleteImagesError) throw new Error(`기존 사진 링크 삭제 실패: ${deleteImagesError.message}`);
                
            } else {
                const { data: postData, error: postError } = await supabase
                    .from("posts")
                    .insert(postPayload)
                    .select("id")
                    .single();

                if (postError) throw new Error(`게시물 저장 실패: ${postError.message}`);
                postId = postData.id;
            }

            setProgress(95);

            // Step C: Save Images Mappings
            const finalImageUrls = [
                ...existingImages.map(img => img.url),
                ...uploadedImageUrls
            ];

            const imageRecords = finalImageUrls.map((url, index) => ({
                post_id: postId,
                image_url: url,
                order_index: index,
            }));

            if (imageRecords.length > 0) {
                const { error: imageInsertError } = await supabase
                    .from("post_images")
                    .insert(imageRecords);

                if (imageInsertError) throw new Error(`사진 링크 저장 실패: ${imageInsertError.message}`);
            }

            setProgress(100);
            setStatus("success");

            // Cleanup URLs
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

    return {
        status,
        setStatus,
        progress,
        errorMessage,
        setErrorMessage,
        submitPost
    };
}
