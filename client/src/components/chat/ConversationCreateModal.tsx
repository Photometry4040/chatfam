import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConversationCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateConversation: (title: string) => Promise<void>;
  isLoading?: boolean;
}

function formatDateToKorean(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}월 ${day}일`;
}

function getDateDaysFromToday(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export default function ConversationCreateModal({
  isOpen,
  onClose,
  onCreateConversation,
  isLoading = false,
}: ConversationCreateModalProps) {
  const [customTitle, setCustomTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const today = new Date();
  const tomorrow = getDateDaysFromToday(1);
  const dayAfter = getDateDaysFromToday(2);

  const quickDateOptions = [
    { date: today, label: "오늘" },
    { date: tomorrow, label: "내일" },
    { date: dayAfter, label: "모레" },
  ];

  const handleCreateWithDate = async (date: Date) => {
    const title = formatDateToKorean(date);
    await handleCreate(title);
  };

  const handleCreateWithCustom = async () => {
    if (customTitle.trim()) {
      await handleCreate(customTitle);
    }
  };

  const handleCreate = async (title: string) => {
    try {
      setIsCreating(true);
      await onCreateConversation(title);
      setCustomTitle("");
      onClose();
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>새 대화 시작</DialogTitle>
          <DialogDescription>
            날짜를 선택하거나 직접 제목을 입력하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quick date options */}
          <div className="space-y-2">
            <p className="text-sm font-medium">빠른 선택</p>
            <div className="grid grid-cols-3 gap-2">
              {quickDateOptions.map(({ date, label }) => (
                <Button
                  key={label}
                  onClick={() => handleCreateWithDate(date)}
                  disabled={isLoading || isCreating}
                  variant="outline"
                  className="text-sm"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span>{label}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateToKorean(date)}
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Custom title input */}
          <div className="space-y-2">
            <p className="text-sm font-medium">또는 직접 입력</p>
            <Input
              placeholder="예: 주말 계획 회의"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateWithCustom();
                }
              }}
              disabled={isLoading || isCreating}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading || isCreating}
          >
            취소
          </Button>
          <Button
            onClick={handleCreateWithCustom}
            disabled={
              !customTitle.trim() || isLoading || isCreating
            }
          >
            {isCreating ? "생성 중..." : "생성"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
