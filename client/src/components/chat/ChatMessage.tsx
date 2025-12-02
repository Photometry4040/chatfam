import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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
}

interface ChatMessageProps {
  message: Message;
  showSender?: boolean;
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

export default function ChatMessage({ message, showSender = true }: ChatMessageProps) {
  const initials = message.senderName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        "flex gap-2",
        message.isOwn ? "flex-row-reverse" : "flex-row"
      )}
      data-testid={`message-${message.id}`}
    >
      {!message.isOwn && showSender && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={message.senderAvatar} alt={message.senderName} />
          <AvatarFallback className="text-xs bg-muted">
            {initials}
          </AvatarFallback>
        </Avatar>
      )}
      
      {!message.isOwn && !showSender && <div className="w-8 flex-shrink-0" />}
      
      <div
        className={cn(
          "flex flex-col max-w-[70%]",
          message.isOwn ? "items-end" : "items-start"
        )}
      >
        {!message.isOwn && showSender && (
          <span className="text-sm font-medium text-muted-foreground mb-1 ml-1">
            {message.senderName}
          </span>
        )}
        
        <div
          className={cn(
            "px-4 py-3 rounded-2xl break-words",
            message.isOwn
              ? "bg-primary text-primary-foreground rounded-tr-md"
              : "bg-card border border-card-border rounded-tl-md"
          )}
        >
          <p className="text-base whitespace-pre-wrap">{message.content}</p>
        </div>
        
        <div className="flex items-center gap-1 mx-1">
          <span className="text-xs text-muted-foreground mt-1">
            {formatTime(message.timestamp)}
          </span>
          {message.isOwn && (
            <span 
              className={cn(
                "text-xs mt-1",
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
    </div>
  );
}
