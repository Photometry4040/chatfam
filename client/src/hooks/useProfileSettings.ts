import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface ProfileSettings {
  id: string;
  userId: string;
  displayName: string;
  avatarEmoji: string | null;
  status: "online" | "away" | "offline" | "busy";
  timezone: string;
  language: string;
}

export interface AvatarOption {
  emoji: string;
  label: string;
  category: string;
}

// TOP 40 아이들 친화적 이모지
export const TOP_40_EMOJIS: AvatarOption[] = [
  // 가족 (5개)
  { emoji: "👨", label: "아버지", category: "가족" },
  { emoji: "👩", label: "어머니", category: "가족" },
  { emoji: "🧒", label: "아이", category: "가족" },
  { emoji: "👧", label: "여자아이", category: "가족" },
  { emoji: "👦", label: "남자아이", category: "가족" },

  // 동물 (9개)
  { emoji: "🐱", label: "고양이", category: "동물" },
  { emoji: "🐶", label: "강아지", category: "동물" },
  { emoji: "🐰", label: "토끼", category: "동물" },
  { emoji: "🐼", label: "판다", category: "동물" },
  { emoji: "🐨", label: "코알라", category: "동물" },
  { emoji: "🦁", label: "사자", category: "동물" },
  { emoji: "🐯", label: "호랑이", category: "동물" },
  { emoji: "🐻", label: "곰", category: "동물" },
  { emoji: "🐸", label: "개구리", category: "동물" },

  // 판타지 (5개)
  { emoji: "🦄", label: "유니콘", category: "판타지" },
  { emoji: "🧚", label: "요정", category: "판타지" },
  { emoji: "👑", label: "왕관", category: "판타지" },
  { emoji: "💎", label: "다이아몬드", category: "판타지" },
  { emoji: "⭐", label: "별", category: "판타지" },

  // 음식 (6개)
  { emoji: "🍕", label: "피자", category: "음식" },
  { emoji: "🍔", label: "버거", category: "음식" },
  { emoji: "🍰", label: "케이크", category: "음식" },
  { emoji: "🍪", label: "쿠키", category: "음식" },
  { emoji: "🍓", label: "딸기", category: "음식" },
  { emoji: "🍦", label: "아이스크림", category: "음식" },

  // 활동 (5개)
  { emoji: "⚽", label: "축구공", category: "활동" },
  { emoji: "🏀", label: "농구공", category: "활동" },
  { emoji: "🎮", label: "게임", category: "활동" },
  { emoji: "🎸", label: "기타", category: "활동" },
  { emoji: "🎨", label: "미술", category: "활동" },

  // 우주 (5개)
  { emoji: "🚀", label: "로켓", category: "우주" },
  { emoji: "🌙", label: "달", category: "우주" },
  { emoji: "🌈", label: "무지개", category: "우주" },
  { emoji: "✨", label: "반짝임", category: "우주" },
  { emoji: "🔥", label: "불", category: "우주" },

  // 자연 (4개)
  { emoji: "🌻", label: "해바라기", category: "자연" },
  { emoji: "🌹", label: "장미", category: "자연" },
  { emoji: "🌸", label: "벚꽃", category: "자연" },
  { emoji: "🌳", label: "나무", category: "자연" },

  // 이모티콘 (1개)
  { emoji: "😀", label: "행복", category: "감정" },
];

export const STATUS_OPTIONS = [
  { value: "online" as const, label: "온라인", color: "#22c55e", emoji: "🟢" },
  { value: "away" as const, label: "자리비움", color: "#eab308", emoji: "🟡" },
  { value: "offline" as const, label: "오프라인", color: "#6b7280", emoji: "⚫" },
  { value: "busy" as const, label: "바쁨", color: "#ef4444", emoji: "🔴" },
];

interface UseProfileSettingsReturn {
  profile: ProfileSettings | null;
  loading: boolean;
  error: string | null;
  getProfile: (profileId: string) => Promise<void>;
  updateProfile: (
    profileId: string,
    updates: Partial<Omit<ProfileSettings, "id" | "userId">>
  ) => Promise<void>;
  updateDisplayName: (profileId: string, name: string) => Promise<void>;
  updateAvatarEmoji: (profileId: string, emoji: string) => Promise<void>;
  updateStatus: (profileId: string, status: string) => Promise<void>;
  clearError: () => void;
}

export function useProfileSettings(): UseProfileSettingsReturn {
  const [profile, setProfile] = useState<ProfileSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 프로필 조회
  const getProfile = useCallback(async (profileId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from("chat_profiles")
        .select(
          "id, user_id, display_name, avatar_emoji, status, timezone, language"
        )
        .eq("id", profileId)
        .single();

      if (queryError) {
        throw queryError;
      }

      if (data) {
        setProfile({
          id: data.id,
          userId: data.user_id,
          displayName: data.display_name,
          avatarEmoji: data.avatar_emoji,
          status: data.status || "online",
          timezone: data.timezone || "Asia/Seoul",
          language: data.language || "ko",
        });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "프로필 조회 실패";
      setError(message);
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 전체 프로필 업데이트
  const updateProfile = useCallback(
    async (profileId: string, updates: Partial<Omit<ProfileSettings, "id" | "userId">>) => {
      try {
        setLoading(true);
        setError(null);

        const updateData: Record<string, any> = {};

        if (updates.displayName !== undefined) {
          updateData.display_name = updates.displayName;
        }
        if (updates.avatarEmoji !== undefined) {
          updateData.avatar_emoji = updates.avatarEmoji;
        }
        if (updates.status !== undefined) {
          updateData.status = updates.status;
        }
        if (updates.timezone !== undefined) {
          updateData.timezone = updates.timezone;
        }
        if (updates.language !== undefined) {
          updateData.language = updates.language;
        }

        updateData.updated_at = new Date().toISOString();

        const { data, error: updateError } = await supabase
          .from("chat_profiles")
          .update(updateData)
          .eq("id", profileId)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        if (data) {
          setProfile({
            id: data.id,
            userId: data.user_id,
            displayName: data.display_name,
            avatarEmoji: data.avatar_emoji,
            status: data.status || "online",
            timezone: data.timezone || "Asia/Seoul",
            language: data.language || "ko",
          });
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "프로필 업데이트 실패";
        setError(message);
        console.error("Error updating profile:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // 이름 변경 (편의 함수)
  const updateDisplayName = useCallback(
    async (profileId: string, name: string) => {
      await updateProfile(profileId, { displayName: name });
    },
    [updateProfile]
  );

  // 아바타 이모지 변경 (편의 함수)
  const updateAvatarEmoji = useCallback(
    async (profileId: string, emoji: string) => {
      await updateProfile(profileId, { avatarEmoji: emoji });
    },
    [updateProfile]
  );

  // 온라인 상태 변경 (편의 함수)
  const updateStatus = useCallback(
    async (profileId: string, status: string) => {
      await updateProfile(profileId, {
        status: status as "online" | "away" | "offline" | "busy"
      });
    },
    [updateProfile]
  );

  // 에러 제거
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    profile,
    loading,
    error,
    getProfile,
    updateProfile,
    updateDisplayName,
    updateAvatarEmoji,
    updateStatus,
    clearError,
  };
}
