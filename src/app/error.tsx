"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * 전역 에러 핸들러 (500 에러 포착)
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 서버 로그나 외부 모니터링 서비스에 기록할 수 있습니다.
    console.error("Global Runtime Error:", error);
  }, [error]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-white text-center">
      <div className="mb-6 w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-4xl">
        🧐
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        서비스 이용에 불편을 드려 죄송합니다.
      </h1>
      <p className="text-gray-600 mb-8 max-w-sm mx-auto leading-relaxed">
        예기치 못한 오류가 발생했습니다. <br />
        아래 정보를 확인하시거나 잠시 후 다시 시도해 주세요.
      </p>

      {/* Debug Info */}
      <div className="mb-8 w-full max-w-md bg-gray-50 border border-gray-100 rounded-2xl p-4 text-left">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 font-mono">
          System Error Message
        </p>
        <p className="text-sm text-gray-700 font-mono break-all bg-white p-3 rounded-lg border border-gray-100 italic">
          {error.message || "No specific message provided."}
        </p>
        {error.digest && (
          <p className="mt-3 text-[10px] text-gray-300 font-mono">
            Digest: {error.digest}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <button
          onClick={() => reset()}
          className="flex-1 px-6 py-3 bg-gray-900 text-white font-bold rounded-xl active:scale-95 transition-all"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="flex-1 px-6 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl active:scale-95 transition-all"
        >
          홈으로 이동
        </Link>
      </div>
    </div>
  );
}
