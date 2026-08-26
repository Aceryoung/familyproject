"use server";

import { revalidatePath } from "next/cache";

/**
 * 전역 또는 하위 경로의 캐시를 무효화하는 서버 액션
 * 기록 작성이 완료된 후 홈 화면의 데이터를 최신 상태로 유지하기 위해 사용합니다.
 */
export async function revalidateHome() {
    revalidatePath("/");
}
