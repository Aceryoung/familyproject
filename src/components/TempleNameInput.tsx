"use client";

import { TEMPLES_BY_REGION } from "@/lib/templeData";

interface TempleNameInputProps {
  region: string;
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function TempleNameInput({
  region,
  value,
  onChange,
  placeholder = "사찰 이름을 입력하세요",
  disabled = false,
}: TempleNameInputProps) {
  const suggestions = TEMPLES_BY_REGION[region] ?? [];

  return (
    <div className="space-y-2">
      {/* 유명 사찰 칩 */}
      {suggestions.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-1.5">유명 사찰 선택</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((temple) => (
              <button
                key={temple}
                type="button"
                onClick={() => onChange(temple)}
                disabled={disabled}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  value === temple
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-white text-gray-600 border-gray-200 hover:border-amber-400 hover:text-amber-600"
                }`}
              >
                🛕 {temple}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 직접 입력 */}
      <div>
        {suggestions.length > 0 && (
          <p className="text-xs text-gray-400 mb-1.5">직접 입력</p>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
        />
      </div>
    </div>
  );
}
