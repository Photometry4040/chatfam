import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface Reaction {
  emoji: string;
  count: number;
  reactedByCurrentUser: boolean;
  userNames?: string[]; // Who reacted with this emoji
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderProfileId?: string;
  timestamp: Date;
  isOwn: boolean;
  isRead?: boolean;
  reactions?: Record<string, Reaction>; // emoji -> Reaction mapping
}

interface ChatMessageProps {
  message: Message;
  showSender?: boolean;
  onReact?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
}

function formatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  
  if (diffMins < 1) return "방금 전";
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) {
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const period = hours < 12 ? "오전" : "오후";
    const displayHours = hours % 12 || 12;
    return `${period} ${displayHours}:${minutes}`;
  }
  
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}월 ${day}일`;
}

const COMMON_EMOJIS = ["👍", "❤️", "😂", "🎉", "😮", "😢"];

export default function ChatMessage({
  message,
  showSender = true,
  onReact,
  onRemoveReaction
}: ChatMessageProps) {
  const [showReactionMenu, setShowReactionMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const messageRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = message.senderName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setShowReactionMenu(true);
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    const hasReacted = message.reactions?.[emoji]?.reactedByCurrentUser;
    if (hasReacted) {
      onRemoveReaction?.(message.id, emoji);
    } else {
      onReact?.(message.id, emoji);
    }
    setShowReactionMenu(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowReactionMenu(false);
      }
    };

    if (showReactionMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showReactionMenu]);

  return (
    <div
      className={cn(
        "flex gap-2",
        message.isOwn ? "flex-row-reverse" : "flex-row"
      )}
      data-testid={`message-${message.id}`}
      ref={messageRef}
    >
      {showSender && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarFallback className="text-xs font-semibold">
            {message.senderAvatar || initials}
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          "flex flex-col max-w-[70%] relative",
          message.isOwn ? "items-end" : "items-start"
        )}
      >
        {showSender && (
          <span className={cn(
            "text-sm font-medium mb-1",
            message.isOwn ? "text-right mr-1" : "text-muted-foreground ml-1"
          )}>
            {message.senderName}
          </span>
        )}

        <div
          className={cn(
            "px-4 py-3 rounded-2xl break-words group cursor-context-menu relative",
            message.isOwn
              ? "bg-primary text-primary-foreground rounded-tr-md"
              : "bg-card border border-card-border rounded-tl-md"
          )}
          onContextMenu={handleContextMenu}
        >
          <p className="text-base whitespace-pre-wrap">{message.content}</p>

          {/* Quick reaction buttons on hover */}
          <div className="absolute -right-16 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 pointer-events-none group-hover:pointer-events-auto">
            {COMMON_EMOJIS.slice(0, 3).map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiSelect(emoji)}
                className="p-1 rounded-full hover:bg-muted text-lg"
                title={`Add ${emoji} reaction`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Display reactions */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 mx-1">
            {Object.values(message.reactions).map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={() => handleEmojiSelect(reaction.emoji)}
                className={cn(
                  "px-2 py-1 rounded-full text-sm flex items-center gap-1",
                  reaction.reactedByCurrentUser
                    ? "bg-primary/20 border border-primary/50"
                    : "bg-muted border border-muted-foreground/20"
                )}
                title={reaction.userNames?.join(", ")}
              >
                <span>{reaction.emoji}</span>
                {reaction.count > 1 && <span className="text-xs">{reaction.count}</span>}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 mx-1 mt-1">
          <span className="text-xs text-muted-foreground">
            {formatTime(message.timestamp)}
          </span>
          {message.isOwn && (
            <span
              className={cn(
                "text-xs",
                message.isRead
                  ? "text-muted-foreground"
                  : "text-muted-foreground/60"
              )}
              title={message.isRead ? "읽음" : "읽지 않음"}
            >
              {message.isRead ? "✓✓" : "✓"}
            </span>
          )}
        </div>
      </div>

      {/* Reaction context menu */}
      {showReactionMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-card border border-card-border rounded-lg shadow-lg p-2 flex gap-1"
          style={{
            top: `${Math.min(menuPosition.y, window.innerHeight - 60)}px`,
            left: `${Math.min(menuPosition.x, window.innerWidth - 150)}px`,
          }}
        >
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiSelect(emoji)}
              className="text-2xl p-2 rounded-lg hover:bg-muted transition-colors"
              title={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
