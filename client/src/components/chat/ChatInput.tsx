import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, X } from "lucide-react";
import type { Message } from "./ChatMessage";

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  onInputChange?: () => void;
  replyingToMessage?: Message | null;
  onCancelReply?: () => void;
}

export default function ChatInput({
  onSendMessage,
  disabled = false,
  onInputChange,
  replyingToMessage,
  onCancelReply
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled && !isComposing) {
      onSendMessage(trimmed);
      setMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  return (
    <div className="border-t border-border bg-background">
      {replyingToMessage && (
        <div className="px-4 pt-3 pb-2 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-muted-foreground mb-1">
                ↪️ {replyingToMessage.senderName}에게 답장 중
              </div>
              <div className="text-sm text-foreground truncate">
                {replyingToMessage.content}
              </div>
            </div>
            <button
              onClick={onCancelReply}
              className="p-1 hover:bg-muted rounded-full flex-shrink-0"
              title="답장 취소"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <div className="p-4 flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              onInputChange?.();
            }}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder="메시지를 입력하세요..."
            disabled={disabled}
            rows={1}
            className="w-full resize-none rounded-full border border-input bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="input-message"
          />
        </div>
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!message.trim() || disabled}
          className="rounded-full flex-shrink-0"
          data-testid="button-send"
          aria-label="메시지 보내기"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
