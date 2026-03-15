import { createBrowserClient } from "@supabase/ssr";

type SupabaseClient = ReturnType<typeof createBrowserClient>;

let supabaseInstance: SupabaseClient | null = null;

function isValidUrl(url: string | undefined): boolean {
    return !!url && (url.startsWith("http://") || url.startsWith("https://"));
}

export function getSupabase(): SupabaseClient {
    if (!supabaseInstance) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

        if (!isValidUrl(url)) {
            console.warn(
                "[Supabase] NEXT_PUBLIC_SUPABASE_URL이 유효하지 않습니다. .env.local을 확인하세요."
            );
            // 더미 URL로 클라이언트 생성 (인증은 실패하지만 UI는 동작)
            supabaseInstance = createBrowserClient(
                "https://placeholder.supabase.co",
                key || "placeholder-key"
            );
        } else {
            supabaseInstance = createBrowserClient(url, key);
        }
    }
    return supabaseInstance;
}
