import { useEffect, useRef, useCallback } from "react";
import ChatMessage, { type Message } from "./ChatMessage";
import DateSeparator from "./DateSeparator";
import EmptyChat from "./EmptyChat";

interface MessageListProps {
  messages: Message[];
  typingUsers?: string[];
  typingNames?: (string | undefined)[];
  lastReadMessageId?: string;
  onLastVisibleMessage?: (messageId: string | null) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onReply?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
  onDelete?: (messageId: string) => void;
  onPin?: (messageId: string, shouldPin: boolean) => void;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export default function MessageList({
  messages,
  typingUsers = [],
  typingNames = [],
  lastReadMessageId,
  onLastVisibleMessage,
  onEdit,
  onReply,
  onReact,
  onRemoveReaction,
  onDelete,
  onPin
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const messageRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

  // Setup IntersectionObserver for tracking visible messages
  useEffect(() => {
    if (!containerRef.current || !onLastVisibleMessage) return;

    const observerOptions: IntersectionObserverInit = {
      root: containerRef.current,
      rootMargin: "0px",
      threshold: [0, 0.25, 0.5, 0.75, 1],
    };

    let lastVisibleMessageId: string | null = null;

    observerRef.current = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        // Find the last visible entry (bottom-most message)
        let bottomMostMessageId: string | null = null;
        let bottomMostPosition = -Infinity;

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLDivElement;
            const messageId = element.getAttribute("data-message-id");

            // Track the message that's at the bottom of the view
            if (messageId && entry.boundingClientRect.bottom > bottomMostPosition) {
              bottomMostPosition = entry.boundingClientRect.bottom;
              bottomMostMessageId = messageId;
            }
          }
        });

        if (bottomMostMessageId && bottomMostMessageId !== lastVisibleMessageId) {
          lastVisibleMessageId = bottomMostMessageId;
          onLastVisibleMessage(bottomMostMessageId);
        }
      },
      observerOptions
    );

    // Observe all message refs
    messageRefsMap.current.forEach((ref) => {
      if (observerRef.current) {
        observerRef.current.observe(ref);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [onLastVisibleMessage, messages.length]);

  const registerMessageRef = useCallback((messageId: string, element: HTMLDivElement | null) => {
    if (element) {
      messageRefsMap.current.set(messageId, element);
      if (observerRef.current) {
        observerRef.current.observe(element);
      }
    } else {
      const ref = messageRefsMap.current.get(messageId);
      if (ref && observerRef.current) {
        observerRef.current.unobserve(ref);
      }
      messageRefsMap.current.delete(messageId);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return <EmptyChat />;
  }

  // Separate pinned and regular messages
  const pinnedMessages = messages
    .filter((msg) => msg.isPinned)
    .sort((a, b) => {
      const aTime = a.pinnedAt?.getTime() || 0;
      const bTime = b.pinnedAt?.getTime() || 0;
      return bTime - aTime; // Most recent pinned first
    });

  const regularMessages = messages.filter((msg) => !msg.isPinned);

  const groupedMessages: { date: Date; messages: Message[] }[] = [];
  let currentGroup: { date: Date; messages: Message[] } | null = null;

  for (const message of regularMessages) {
    if (!currentGroup || !isSameDay(currentGroup.date, message.timestamp)) {
      currentGroup = { date: message.timestamp, messages: [] };
      groupedMessages.push(currentGroup);
    }
    currentGroup.messages.push(message);
  }

  const renderMessage = (message: Message) => {
    const isRead = lastReadMessageId ? message.id <= lastReadMessageId : false;
    return (
      <div
        key={message.id}
        ref={(el) => registerMessageRef(message.id, el)}
        data-message-id={message.id}
      >
        <ChatMessage
          message={{ ...message, isRead }}
          showSender={true}
          onEdit={onEdit}
          onReply={onReply}
          onReact={onReact}
          onRemoveReaction={onRemoveReaction}
          onDelete={onDelete}
          onPin={onPin}
        />
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-2"
      data-testid="message-list"
    >
      {/* Pinned Messages Section */}
      {pinnedMessages.length > 0 && (
        <div className="mb-4 pb-4 border-b border-muted-foreground/20">
          <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-muted-foreground">
            <span>📌</span>
            <span>고정된 메시지</span>
          </div>
          <div className="space-y-2 rounded-lg bg-muted/30 p-3">
            {pinnedMessages.map((message) => (
              <div key={message.id} className="border-l-2 border-yellow-500/50 pl-3">
                <div className="text-xs text-muted-foreground mb-1">
                  {message.senderName}
                </div>
                <div className="text-sm text-foreground">
                  {message.content}
                </div>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => onReply?.(message.id)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                    title="Reply to this message"
                  >
                    답장
                  </button>
                  <button
                    onClick={() => onPin?.(message.id, false)}
                    className="text-xs text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300"
                    title="Unpin message"
                  >
                    고정 해제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Messages Timeline */}
      {groupedMessages.map((group, groupIndex) => (
        <div key={groupIndex}>
          <DateSeparator date={group.date} />
          <div className="space-y-3">
            {group.messages.map((message, messageIndex) => {
              const prevMessage = messageIndex > 0 ? group.messages[messageIndex - 1] : null;
              const showSender = !prevMessage || prevMessage.senderProfileId !== message.senderProfileId;

              // Determine if message has been read
              const isRead = lastReadMessageId ? message.id <= lastReadMessageId : false;

              return (
                <div
                  key={message.id}
                  ref={(el) => registerMessageRef(message.id, el)}
                  data-message-id={message.id}
                >
                  <ChatMessage
                    message={{ ...message, isRead }}
                    showSender={showSender}
                    onEdit={onEdit}
                    onReply={onReply}
                    onReact={onReact}
                    onRemoveReaction={onRemoveReaction}
                    onDelete={onDelete}
                    onPin={onPin}
                  />
                </div>
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
