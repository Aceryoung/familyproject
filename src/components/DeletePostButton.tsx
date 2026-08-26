"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { revalidateHome } from "@/app/actions";

export default function DeletePostButton({ postId }: { postId: string }) {
    const router = useRouter();
    const [confirm, setConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const supabase = getSupabase();

            // 스토리지 파일 먼저 수집
            const { data: postImgs } = await supabase
                .from("post_images").select("image_url").eq("post_id", postId);
            const { data: placeImgs } = await supabase
                .from("place_images")
                .select("image_url, place_records!inner(post_id)")
                .eq("place_records.post_id", postId);

            const filesToDelete = [
                ...(postImgs || []).map((r: any) => r.image_url),
                ...(placeImgs || []).map((r: any) => r.image_url),
            ].filter((p: string) => !p.startsWith("http"));

            // DB 삭제 (cascade로 연관 레코드 자동 삭제)
            const { error } = await supabase.from("posts").delete().eq("id", postId);
            if (error) throw error;

            // 스토리지 파일 삭제 (DB 삭제 성공 후)
            if (filesToDelete.length > 0) {
                await supabase.storage.from("archive_images").remove(filesToDelete);
            }

            await revalidateHome();
            router.push("/");
            router.refresh();
        } catch (err: any) {
            alert("삭제에 실패했습니다: " + err.message);
            setDeleting(false);
            setConfirm(false);
        }
    };

    if (confirm) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">정말 삭제할까요?</span>
                <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg disabled:opacity-60"
                >
                    {deleting ? "삭제 중..." : "삭제"}
                </button>
                <button
                    onClick={() => setConfirm(false)}
                    disabled={deleting}
                    className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1.5"
                >
                    취소
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => setConfirm(true)}
            className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            title="삭제"
        >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
        </button>
    );
}
