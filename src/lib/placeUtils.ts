import { getSupabase } from "@/lib/supabase";
import imageCompression from "browser-image-compression";

export type PlaceType = "temple" | "restaurant" | "cafe";

export interface PlaceEntry {
  tempId: string;
  name: string;
  placeType: PlaceType;
  memo?: string;             // 간단 메모
  files: File[];
  previews: string[];
  existingPaths?: string[];  // 수정 모드: 이미 저장된 사진 경로
  signedUrls?: string[];     // 수정 모드: 기존 사진 표시용 URL
  dayIndex?: number | null;  // 일차 (1-based, null=일차 미지정)
}

export interface DayRecord {
  dayIndex: number;   // 1-based
  content: string;
  places: PlaceEntry[];
}

export const PLACE_TYPE_LABELS: Record<PlaceType, { label: string; emoji: string }> = {
  temple:     { label: "사찰",  emoji: "🛕" },
  restaurant: { label: "식당",  emoji: "🍽️" },
  cafe:       { label: "카페",  emoji: "☕" },
};

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: "image/webp" as const,
};

/**
 * 장소 배열을 Supabase에 저장한다.
 * existingPaths가 있으면 재업로드 없이 그대로 사용한다.
 */
export async function savePlaces(
  places: PlaceEntry[],
  region: string,
  userId: string,
  postId: string | null = null
): Promise<void> {
  if (places.length === 0) return;

  const supabase = getSupabase();
  const timestamp = Date.now();

  // 1단계: 모든 장소의 이미지를 병렬로 압축 & 업로드
  const uploadResults = await Promise.all(
    places.map(async (place) => {
      const newImageUrls = await Promise.all(
        place.files.map(async (file, i) => {
          const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
          const filePath = `places/${userId}/${timestamp}_${place.tempId}_${i}.webp`;
          const { error: uploadError } = await supabase.storage
            .from("archive_images")
            .upload(filePath, compressed, {
              contentType: "image/webp",
              cacheControl: "3600",
              upsert: false,
            });
          if (uploadError) throw new Error(`장소 사진 업로드 실패: ${uploadError.message}`);
          return filePath;
        })
      );
      return [...(place.existingPaths || []), ...newImageUrls];
    })
  );

  // 2단계: place_records 일괄 삽입
  const { data: insertedPlaces, error: placeError } = await supabase
    .from("place_records")
    .insert(
      places.map((place) => ({
        post_id: postId,
        region,
        place_type: place.placeType,
        name: place.name,
        memo: place.memo || null,
        day_index: place.dayIndex ?? null,
      }))
    )
    .select("id");

  if (placeError || !insertedPlaces) {
    throw new Error(`장소 저장 실패: ${placeError?.message}`);
  }

  // 3단계: place_images 일괄 삽입
  const allImageRows = insertedPlaces.flatMap((row, idx) =>
    uploadResults[idx].map((url, order) => ({
      place_id: row.id,
      image_url: url,
      order_index: order,
    }))
  );

  if (allImageRows.length > 0) {
    const { error: imgError } = await supabase
      .from("place_images")
      .insert(allImageRows);
    if (imgError) throw new Error(`장소 사진 링크 저장 실패: ${imgError.message}`);
  }
}
