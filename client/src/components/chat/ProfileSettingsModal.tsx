import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  useProfileSettings,
  TOP_40_EMOJIS,
  STATUS_OPTIONS,
} from "@/hooks/useProfileSettings";

interface ProfileSettingsModalProps {
  isOpen: boolean;
  profileId: string;
  onClose: () => void;
  onProfileUpdate?: () => void;
}

export default function ProfileSettingsModal({
  isOpen,
  profileId,
  onClose,
  onProfileUpdate,
}: ProfileSettingsModalProps) {
  const { profile, loading, error, getProfile, updateProfile, clearError } =
    useProfileSettings();

  const [displayName, setDisplayName] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<
    "online" | "away" | "offline" | "busy"
  >("online");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 모달 열릴 때 프로필 로드
  useEffect(() => {
    if (isOpen && profileId) {
      getProfile(profileId);
    }
  }, [isOpen, profileId, getProfile]);

  // 프로필 데이터가 로드되면 폼 초기화
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setSelectedEmoji(profile.avatarEmoji || "");
      setSelectedStatus(profile.status);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      setSaveMessage({ type: "error", text: "이름을 입력해주세요" });
      return;
    }

    try {
      setIsSaving(true);
      setSaveMessage(null);

      await updateProfile(profileId, {
        displayName: displayName.trim(),
        avatarEmoji: selectedEmoji,
        status: selectedStatus,
      });

      setSaveMessage({ type: "success", text: "프로필이 저장되었습니다!" });

      setTimeout(() => {
        onProfileUpdate?.();
        onClose();
      }, 1500);
    } catch {
      setSaveMessage({
        type: "error",
        text: error || "프로필 저장 실패",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  // 카테고리별로 이모지 그룹화
  const emojisByCategory = TOP_40_EMOJIS.reduce(
    (acc, emoji) => {
      if (!acc[emoji.category]) {
        acc[emoji.category] = [];
      }
      acc[emoji.category].push(emoji);
      return acc;
    },
    {} as Record<string, typeof TOP_40_EMOJIS>
  );

  const categoryOrder = [
    "가족",
    "동물",
    "판타지",
    "음식",
    "활동",
    "우주",
    "자연",
    "감정",
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card border border-card-border rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-card border-b border-card-border px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">프로필 설정</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="px-6 py-6 space-y-6">
          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={clearError}
                className="hover:opacity-70"
              >
                ✕
              </button>
            </div>
          )}

          {/* 저장 메시지 */}
          {saveMessage && (
            <div
              className={cn(
                "px-4 py-3 rounded-lg text-sm",
                saveMessage.type === "success"
                  ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-100"
                  : "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100"
              )}
            >
              {saveMessage.text}
            </div>
          )}

          {loading && !profile ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">프로필을 불러오는 중...</p>
            </div>
          ) : (
            <>
              {/* 아바타 미리보기 */}
              <div className="flex justify-center">
                <div className="text-6xl">{selectedEmoji || "👤"}</div>
              </div>

              {/* 이름 입력 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  이름
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="이름을 입력해주세요"
                  maxLength={50}
                  className="w-full px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* 아바타 선택 */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  아바타 선택
                </label>
                <div className="space-y-4">
                  {categoryOrder.map((category) => (
                    <div key={category}>
                      <p className="text-xs text-muted-foreground mb-2 font-medium">
                        {category}
                      </p>
                      <div className="grid grid-cols-5 gap-2">
                        {emojisByCategory[category]?.map((option) => (
                          <button
                            key={option.emoji}
                            onClick={() => setSelectedEmoji(option.emoji)}
                            className={cn(
                              "aspect-square text-2xl rounded-lg border-2 transition-all",
                              selectedEmoji === option.emoji
                                ? "border-primary bg-primary/10"
                                : "border-muted hover:border-muted-foreground"
                            )}
                            title={option.label}
                          >
                            {option.emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 온라인 상태 선택 */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  온라인 상태
                </label>
                <div className="space-y-2">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedStatus(option.value)}
                      className={cn(
                        "w-full px-4 py-3 rounded-lg border-2 text-left transition-all flex items-center gap-3",
                        selectedStatus === option.value
                          ? "border-primary bg-primary/10"
                          : "border-muted hover:border-muted-foreground"
                      )}
                    >
                      <span className="text-xl">{option.emoji}</span>
                      <div>
                        <p className="font-medium">{option.label}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="sticky bottom-0 bg-card border-t border-card-border px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2 rounded-lg border border-muted text-foreground hover:bg-muted disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || loading}
            className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
