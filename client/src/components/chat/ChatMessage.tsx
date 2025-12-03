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
  isEdited?: boolean;
  editedAt?: Date;
  isPinned?: boolean;
  pinnedAt?: Date;
  pinnedByUserId?: string;
  parentMessageId?: string; // ID of message being replied to
  parentMessage?: Message; // Preview of parent message
}

interface ChatMessageProps {
  message: Message;
  showSender?: boolean;
  onReact?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onReply?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onPin?: (messageId: string, shouldPin: boolean) => void;
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
  onRemoveReaction,
  onEdit,
  onReply,
  onDelete,
  onPin
}: ChatMessageProps) {
  const [showReactionMenu, setShowReactionMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const messageRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  const initials = message.senderName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Check if message can be edited (within 5 minutes and is own message)
  const canEdit = (): boolean => {
    if (!message.isOwn) return false;
    const now = new Date();
    const messageTime = new Date(message.timestamp);
    const diffMinutes = (now.getTime() - messageTime.getTime()) / 60000;
    return diffMinutes <= 5;
  };

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

  // Handle edit mode
  const handleEditStart = () => {
    setIsEditing(true);
    setEditContent(message.content);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const handleEditSave = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit?.(message.id, editContent.trim());
    }
    setIsEditing(false);
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
              : "bg-card border border-card-border rounded-tl-md",
            message.parentMessageId && "border-l-4 border-muted-foreground/50 pl-3"
          )}
          onContextMenu={handleContextMenu}
        >
          {/* Parent message preview */}
          {message.parentMessage && (
            <div className={cn(
              "text-xs mb-2 pb-2 border-b border-muted-foreground/20",
              message.isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
            )}>
              <div className="font-semibold opacity-80 mb-1">
                ↪️ {message.parentMessage.senderName}에게 답장
              </div>
              <div className="opacity-70 truncate">
                {message.parentMessage.content}
              </div>
            </div>
          )}

          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                ref={editInputRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className={cn(
                  "w-full resize-none rounded p-2 text-base",
                  message.isOwn
                    ? "bg-primary/80 text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) {
                    handleEditSave();
                  }
                  if (e.key === "Escape") {
                    handleEditCancel();
                  }
                }}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleEditCancel}
                  className="text-xs px-2 py-1 rounded opacity-70 hover:opacity-100"
                >
                  취소
                </button>
                <button
                  onClick={handleEditSave}
                  className="text-xs px-2 py-1 rounded bg-accent hover:bg-accent/80"
                >
                  저장
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <p className="text-base whitespace-pre-wrap flex-1">{message.content}</p>
                {message.isEdited && (
                  <span className="text-xs opacity-70">(수정됨)</span>
                )}
              </div>

              {/* Quick reaction buttons, edit button & reply button on hover */}
              <div className="absolute -right-20 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 pointer-events-none group-hover:pointer-events-auto">
                <button
                  onClick={() => onReply?.(message.id)}
                  className="p-1 rounded-full hover:bg-muted text-sm"
                  title="Reply to this message"
                >
                  ↩️
                </button>
                {canEdit() && (
                  <button
                    onClick={handleEditStart}
                    className="p-1 rounded-full hover:bg-muted text-sm"
                    title="Edit message (5 minutes left)"
                  >
                    ✏️
                  </button>
                )}
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
                {message.isOwn && (
                  <button
                    onClick={() => onDelete?.(message.id)}
                    className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900 text-sm"
                    title="Delete message"
                  >
                    🗑️
                  </button>
                )}
                <button
                  onClick={() => onPin?.(message.id, !message.isPinned)}
                  className={cn(
                    "p-1 rounded-full text-sm",
                    message.isPinned
                      ? "bg-yellow-100 dark:bg-yellow-900"
                      : "hover:bg-muted"
                  )}
                  title={message.isPinned ? "Unpin message" : "Pin message"}
                >
                  📌
                </button>
              </div>
            </>
          )}
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
