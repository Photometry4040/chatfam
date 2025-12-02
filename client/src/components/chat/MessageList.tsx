import { useEffect, useRef } from "react";
import ChatMessage, { type Message } from "./ChatMessage";
import DateSeparator from "./DateSeparator";
import EmptyChat from "./EmptyChat";

interface MessageListProps {
  messages: Message[];
  typingUsers?: string[];
  typingNames?: (string | undefined)[];
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export default function MessageList({ messages, typingUsers = [], typingNames = [] }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return <EmptyChat />;
  }

  const groupedMessages: { date: Date; messages: Message[] }[] = [];
  let currentGroup: { date: Date; messages: Message[] } | null = null;

  for (const message of messages) {
    if (!currentGroup || !isSameDay(currentGroup.date, message.timestamp)) {
      currentGroup = { date: message.timestamp, messages: [] };
      groupedMessages.push(currentGroup);
    }
    currentGroup.messages.push(message);
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-2"
      data-testid="message-list"
    >
      {groupedMessages.map((group, groupIndex) => (
        <div key={groupIndex}>
          <DateSeparator date={group.date} />
          <div className="space-y-3">
            {group.messages.map((message, messageIndex) => {
              const prevMessage = messageIndex > 0 ? group.messages[messageIndex - 1] : null;
              const showSender = !prevMessage || prevMessage.senderId !== message.senderId;

              return (
                <ChatMessage
                  key={message.id}
                  message={message}
                  showSender={showSender}
                />
              );
            })}
          </div>
        </div>
      ))}
      
      {typingNames.length > 0 && (
        <div className="px-4 py-3 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {typingNames.filter(Boolean).join(", ")} 입력 중...
          </span>
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
          </div>
        </div>
      )}
      
      <div ref={bottomRef} />
    </div>
  );
}
