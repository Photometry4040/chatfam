import { useState } from "react";
import { Button } from "@/components/ui/button";
import ConversationCreateModal from "./ConversationCreateModal";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

interface ConversationHeaderProps {
  conversations: Conversation[];
  selectedConversationId: string;
  onSelectConversation: (id: string) => void;
  onCreateConversation: (title: string) => Promise<void>;
  isLoading?: boolean;
  unreadCounts?: Record<string, number>;
}

export default function ConversationHeader({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onCreateConversation,
  isLoading = false,
  unreadCounts = {},
}: ConversationHeaderProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <>
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {conversations.map((conv) => {
            const unreadCount = unreadCounts[conv.id] ?? 0;
            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`relative px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedConversationId === conv.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground hover:bg-card/80"
                }`}
              >
                {conv.title}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="outline"
            size="sm"
            className="whitespace-nowrap"
            disabled={isLoading}
          >
            + 새 대화 시작
          </Button>
        </div>
      </div>

      <ConversationCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateConversation={async (title) => {
          await onCreateConversation(title);
          setShowCreateModal(false);
        }}
        isLoading={isLoading}
      />
    </>
  );
}
