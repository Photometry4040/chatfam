import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatInput from "@/components/chat/ChatInput";
import MessageList from "@/components/chat/MessageList";
import FamilySidebar from "@/components/chat/FamilySidebar";
import SearchMessages from "@/components/chat/SearchMessages";
import ConversationHeader from "@/components/chat/ConversationHeader";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { useUnreadBadgeTitle } from "@/hooks/usePageVisibility";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/lib/supabase";
import { initializeSupabase } from "@/lib/initializeSupabase";
import type { Message } from "@/components/chat/ChatMessage";
import type { FamilyMember } from "@/components/chat/FamilyMemberItem";

const FAMILY_GROUP_ID = "a0000000-0000-0000-0000-000000000001"; // Default family group UUID

// Type definition for Conversation
interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

// Fetch family member roles from chat_profiles
async function fetchFamilyMembers(familyGroupId: string): Promise<FamilyMember[]> {
  try {
    const { data, error } = await supabase
      .from("chat_profiles")
      .select(
        `
        id,
        display_name,
        avatar_emoji,
        status
        `
      )
      .eq("family_group_id", familyGroupId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch family members:", error);
      return [];
    }

    return (data || []).map((profile: any) => ({
      id: profile.id,
      name: profile.display_name || "Unknown",
      avatar: profile.avatar_emoji,
      isOnline: profile.status === "online",
    }));
  } catch (error) {
    console.error("Error fetching family members:", error);
    return [];
  }
}

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>("")
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastReadMessageId, setLastReadMessageId] = useState<Record<string, string>>({}); // Track last read message per conversation
  const [replyingToMessageId, setReplyingToMessageId] = useState<string | null>(null); // Current message being replied to
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null); // Preview of message being replied to
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({}); // Unread count per conversation
  const [totalUnreadCount, setTotalUnreadCount] = useState(0); // Total unread count across all conversations
  const [lastReadMessageIds, setLastReadMessageIds] = useState<Record<string, string>>({}); // Last read message ID per conversation

  // Use hooks for Page Visibility API and Notifications
  useUnreadBadgeTitle(totalUnreadCount);
  const { showNotification } = useNotifications({ enabled: true });

  // Get current user info and initialize selected member
  useEffect(() => {
    const getUser = async () => {
      const { data: user } = await supabase.auth.getUser();
      if (user?.user) {
        setCurrentUserId(user.user.id);
        console.log("🔐 Current logged-in user ID:", user.user.id);
      }
    };
    getUser();
  }, []);

  const { data: members = [] } = useQuery<FamilyMember[]>({
    queryKey: ["family-members", FAMILY_GROUP_ID],
    queryFn: () => fetchFamilyMembers(FAMILY_GROUP_ID),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Initialize Supabase data on mount
  useEffect(() => {
    initializeSupabase().catch((error) => {
      console.error("Failed to initialize Supabase:", error);
    });
  }, []);

  // Fetch conversations from database
  const fetchConversations = useCallback(async () => {
    try {
      setIsLoadingConversations(true);
      const { data } = await supabase
        .from("chat_conversations")
        .select("id, title, created_at")
        .eq("family_group_id", FAMILY_GROUP_ID)
        .order("created_at", { ascending: false });

      const conversationsData = data || [];
      setConversations(conversationsData);

      // Auto-select first conversation if not already selected
      if (conversationsData.length > 0 && !selectedConversationId) {
        setSelectedConversationId(conversationsData[0].id);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [selectedConversationId]);

  // Create a new conversation
  const createConversation = useCallback(async (title: string) => {
    try {
      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({
          family_group_id: FAMILY_GROUP_ID,
          title,
          created_by: currentUserId,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating conversation:", error);
        return;
      }

      if (data) {
        setConversations((prev) => [data, ...prev]);
        setSelectedConversationId(data.id);
      }
    } catch (error) {
      console.error("Error in createConversation:", error);
    }
  }, [currentUserId]);

  // Refresh current conversation messages
  const handleRefreshMessages = useCallback(async () => {
    if (!selectedConversationId) return;

    try {
      setIsRefreshing(true);
      const { data: messages } = await supabase
        .from("chat_messages")
        .select(
          `
          id,
          content,
          user_id,
          family_group_id,
          sender_profile_id,
          parent_message_id,
          is_edited,
          edited_at,
          created_at
        `
        )
        .eq("family_group_id", FAMILY_GROUP_ID)
        .eq("conversation_id", selectedConversationId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (messages) {
        const messagesWithNames: Message[] = [];
        for (const msg of messages) {
          const { data: profile } = await supabase
            .from("chat_profiles")
            .select("id, display_name, avatar_emoji")
            .eq("id", msg.sender_profile_id)
            .single();

          const isOwn = msg.sender_profile_id === selectedMemberId;

          // Find parent message if this is a reply
          let parentMessage: Message | undefined;
          if (msg.parent_message_id) {
            const parent = messages.find(m => m.id === msg.parent_message_id);
            if (parent) {
              const { data: parentProfile } = await supabase
                .from("chat_profiles")
                .select("id, display_name, avatar_emoji")
                .eq("id", parent.sender_profile_id)
                .single();

              parentMessage = {
                id: parent.id,
                content: parent.content,
                senderId: parent.user_id,
                senderName: parentProfile?.display_name || "Unknown",
                senderProfileId: parent.sender_profile_id,
                timestamp: new Date(parent.created_at),
                isOwn: parent.sender_profile_id === selectedMemberId,
              };
            }
          }

          messagesWithNames.push({
            id: msg.id,
            content: msg.content,
            senderId: msg.user_id,
            senderName: profile?.display_name || "Unknown",
            senderProfileId: msg.sender_profile_id,
            timestamp: new Date(msg.created_at),
            isOwn,
            parentMessageId: msg.parent_message_id,
            parentMessage,
          });
        }

        setMessages((prev) => ({
          ...prev,
          [selectedConversationId]: messagesWithNames,
        }));
      }
    } catch (error) {
      console.error("Error refreshing messages:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedConversationId, selectedMemberId]);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Set default selected member when members load
  useEffect(() => {
    if (members.length > 0 && !selectedMemberId) {
      setSelectedMemberId(members[0].id);
      setCurrentUserName(members[0].name);
    }
  }, [members, selectedMemberId]);

  // Fetch and update read status when conversation is selected
  useEffect(() => {
    if (selectedConversationId && currentUserId) {
      const fetchAndUpdateReadStatus = async () => {
        try {
          // Get the latest message ID in this conversation
          const { data: latestMessage } = await supabase
            .from("chat_messages")
            .select("id")
            .eq("conversation_id", selectedConversationId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (!latestMessage) return;

          // Fetch current read status
          const { data: readStatus } = await supabase
            .from("chat_conversation_read_status")
            .select("last_read_message_id")
            .eq("conversation_id", selectedConversationId)
            .eq("user_id", currentUserId)
            .single();

          // Update frontend state with current read status
          setLastReadMessageIds((prev) => ({
            ...prev,
            [selectedConversationId]: readStatus?.last_read_message_id || "",
          }));

          // Update frontend unread count to 0 (will be recalculated in handleRoomHistory)
          setUnreadCounts((prev) => ({
            ...prev,
            [selectedConversationId]: 0,
          }));

          // Update database: set last_read_message_id to latest message
          const { error } = await supabase
            .from("chat_conversation_read_status")
            .upsert(
              {
                conversation_id: selectedConversationId,
                user_id: currentUserId,
                last_read_message_id: latestMessage.id,
                last_read_at: new Date().toISOString(),
              },
              {
                onConflict: "conversation_id,user_id",
              }
            );

          if (error) {
            console.error("Error updating read status:", error);
          }
        } catch (err) {
          console.error("Failed to fetch/update read status:", err);
        }
      };

      fetchAndUpdateReadStatus();
    }
  }, [selectedConversationId, currentUserId]);

  // Calculate total unread count whenever unreadCounts changes
  useEffect(() => {
    const total = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
    setTotalUnreadCount(total);
  }, [unreadCounts]);

  const handleNewMessage = useCallback((serverMessage: any) => {
    const isOwn = serverMessage.senderProfileId === selectedMemberId;

    const message: Message = {
      id: serverMessage.id,
      content: serverMessage.content,
      senderId: serverMessage.senderId,
      senderName: serverMessage.senderName,
      senderAvatar: serverMessage.senderAvatar,
      senderProfileId: serverMessage.senderProfileId,
      timestamp: new Date(serverMessage.timestamp),
      isOwn,
      isRead: isOwn ? true : (serverMessage.isRead ?? false), // Own messages are marked as read, others depend on DB value
      parentMessageId: serverMessage.parentMessageId,
    };

    // Capture conversationKey before setState to ensure correct conversation is updated
    const conversationKey = selectedConversationId;

    setMessages((prev) => {
      const conversationMessages = prev[conversationKey] || [];
      const exists = conversationMessages.some((m) => m.id === message.id);
      if (exists) return prev;

      // Find parent message if this is a reply
      let parentMessage: Message | undefined;
      if (serverMessage.parentMessageId) {
        parentMessage = conversationMessages.find(m => m.id === serverMessage.parentMessageId);
      }

      return {
        ...prev,
        [conversationKey]: [...conversationMessages, { ...message, parentMessage }],
      };
    });

    // Update unread count if this is not the user's own message and after last read message
    if (!isOwn) {
      const lastReadMessageId = lastReadMessageIds[conversationKey];
      // Only increment if there's no read status yet or this message is newer than last read
      // (New messages are always unread since they haven't been read yet)
      setUnreadCounts((prev) => ({
        ...prev,
        [conversationKey]: (prev[conversationKey] || 0) + 1,
      }));

      // Show notification if tab is hidden and not user's own message
      if (document.hidden) {
        showNotification(`새로운 메시지: ${serverMessage.senderName}`, {
          body: serverMessage.content.substring(0, 100),
          tag: "chat-message",
        });
      }
    }
  }, [selectedMemberId, selectedConversationId, showNotification, lastReadMessageIds]);

  const handleRoomHistory = useCallback((conversationId: string, serverMessages: any[]) => {
    const formattedMessages: Message[] = serverMessages.map((m) => {
      const isOwn = m.senderProfileId === selectedMemberId;

      // Find parent message if this is a reply
      let parentMessage: Message | undefined;
      if (m.parentMessageId) {
        const parentMsg = serverMessages.find(msg => msg.id === m.parentMessageId);
        if (parentMsg) {
          parentMessage = {
            id: parentMsg.id,
            content: parentMsg.content,
            senderId: parentMsg.senderId,
            senderName: parentMsg.senderName,
            senderProfileId: parentMsg.senderProfileId,
            timestamp: new Date(parentMsg.timestamp),
            isOwn: parentMsg.senderProfileId === selectedMemberId,
          };
        }
      }

      return {
        id: m.id,
        content: m.content,
        senderId: m.senderId,
        senderName: m.senderName,
        senderAvatar: m.senderAvatar,
        senderProfileId: m.senderProfileId,
        timestamp: new Date(m.timestamp),
        isOwn,
        parentMessageId: m.parentMessageId,
        parentMessage,
        reactions: m.reactions,
      };
    });

    // console.log(`✅ Loaded ${formattedMessages.length} messages for conversation ${conversationId}`);
    setMessages((prev) => ({
      ...prev,
      [conversationId]: formattedMessages,
    }));

    // Calculate unread count for this conversation based on last_read_message_id
    const lastReadMessageId = lastReadMessageIds[conversationId];
    let unreadCount = 0;

    if (lastReadMessageId) {
      // Find the index of the last read message
      const lastReadIndex = formattedMessages.findIndex(m => m.id === lastReadMessageId);
      // Count unread messages after the last read message (not from current user)
      unreadCount = formattedMessages
        .slice(lastReadIndex + 1)
        .filter(m => !m.isOwn).length;
    } else {
      // If no read status exists, count all non-own messages
      unreadCount = formattedMessages.filter(m => !m.isOwn).length;
    }

    setUnreadCounts((prev) => ({
      ...prev,
      [conversationId]: unreadCount,
    }));
  }, [selectedMemberId, lastReadMessageIds]);

  // Helper function to transform reactions
  const transformReactions = (reactions: any[], userId: string) => {
    const reactionMap: Record<string, any> = {};
    for (const reaction of reactions) {
      if (!reactionMap[reaction.emoji]) {
        reactionMap[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          reactedByCurrentUser: false,
          userNames: [],
        };
      }
      reactionMap[reaction.emoji].count++;
      if (reaction.user_id === userId) {
        reactionMap[reaction.emoji].reactedByCurrentUser = true;
      }
      if (reaction.display_name && !reactionMap[reaction.emoji].userNames?.includes(reaction.display_name)) {
        reactionMap[reaction.emoji].userNames?.push(reaction.display_name);
      }
    }
    return reactionMap;
  };

  const { isConnected, sendMessage, sendTyping } = useSupabaseRealtime({
    familyGroupId: FAMILY_GROUP_ID,
    userId: currentUserId,
    userName: currentUserName,
    senderProfileId: selectedMemberId,
    conversationId: selectedConversationId,
    onMessage: handleNewMessage,
    onRoomHistory: handleRoomHistory,
    onTyping: (userId, userName) => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.add(userId);
        return newSet;
      });
      setTimeout(() => {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      }, 3000);
    },
    onReactionChange: (payload: any) => {
      // Handle reaction changes from realtime
      const messageId = payload.new?.message_id || payload.old?.message_id;
      if (!messageId) return;

      // Fetch updated reactions for this message
      supabase
        .from("chat_message_reactions")
        .select(`
          message_id,
          emoji,
          user_id,
          chat_profiles!sender_profile_id(display_name)
        `)
        .eq("message_id", messageId)
        .then(({ data: reactionsData }) => {
          const reactions: any[] = (reactionsData || []).map((r: any) => ({
            emoji: r.emoji,
            user_id: r.user_id,
            display_name: r.chat_profiles?.display_name,
          }));

          const reactionMap = transformReactions(reactions, currentUserId);

          setMessages((prev) => ({
            ...prev,
            [selectedConversationId]: prev[selectedConversationId].map((msg) =>
              msg.id === messageId ? { ...msg, reactions: reactionMap } : msg
            ),
          }));
        });
    },
  });

  // Auto-polling when Realtime connection fails
  useEffect(() => {
    if (isConnected || !selectedConversationId) return;

    console.log("Starting auto-polling due to connection loss...");
    const pollInterval = setInterval(async () => {
      try {
        await handleRefreshMessages();
      } catch (error) {
        console.error("Auto-polling error:", error);
      }
    }, 15000); // Poll every 15 seconds

    return () => clearInterval(pollInterval);
  }, [isConnected, selectedConversationId, handleRefreshMessages]);

  // Cancel reply mode
  const handleCancelReply = useCallback(() => {
    setReplyingToMessageId(null);
    setReplyingToMessage(null);
  }, []);

  // Show messages for selected conversation
  const currentMessages = messages[selectedConversationId] || [];
  const currentMember = members.find((m) => m.id === selectedMemberId);

  const filteredMessages = searchQuery.trim()
    ? currentMessages.filter((msg) =>
        msg.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentMessages;

  const handleSendMessage = useCallback(
    (content: string) => {
      sendMessage(content, replyingToMessageId || undefined);
      // Clear reply state after sending
      handleCancelReply();
    },
    [sendMessage, replyingToMessageId, handleCancelReply]
  );

  const handleSelectMember = useCallback((memberId: string) => {
    setSelectedMemberId(memberId);
    setSearchQuery("");
    setTypingUsers(new Set());
    // Update current user name when member is selected
    const member = members.find((m) => m.id === memberId);
    if (member) {
      setCurrentUserName(member.name);
    }
  }, [members]);

  // Track last visible message in the list
  const handleLastVisibleMessage = useCallback((messageId: string | null) => {
    if (messageId && selectedConversationId) {
      setLastReadMessageId((prev) => ({
        ...prev,
        [selectedConversationId]: messageId,
      }));
    }
  }, [selectedConversationId]);

  // Handle message editing
  const handleEditMessage = useCallback(async (messageId: string, newContent: string) => {
    try {
      // Check if message can still be edited (5-minute window)
      const message = currentMessages.find(m => m.id === messageId);
      if (!message) return;

      const now = new Date();
      const messageTime = new Date(message.timestamp);
      const diffMinutes = (now.getTime() - messageTime.getTime()) / 60000;

      if (diffMinutes > 5) {
        console.error("Message can only be edited within 5 minutes of sending");
        return;
      }

      // Update in Supabase
      const { error } = await supabase
        .from("chat_messages")
        .update({
          content: newContent,
          is_edited: true,
          edited_at: new Date().toISOString(),
        })
        .eq("id", messageId);

      if (error) {
        console.error("Error editing message:", error);
        return;
      }

      // Update local state
      setMessages((prev) => ({
        ...prev,
        [selectedConversationId]: prev[selectedConversationId].map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                content: newContent,
                isEdited: true,
                editedAt: new Date(),
              }
            : msg
        ),
      }));
    } catch (error) {
      console.error("Error in handleEditMessage:", error);
    }
  }, [currentMessages, selectedConversationId]);

  // Handle replying to a message
  const handleReplyTo = useCallback((messageId: string) => {
    const messageToReply = currentMessages.find(m => m.id === messageId);
    if (messageToReply) {
      setReplyingToMessageId(messageId);
      setReplyingToMessage(messageToReply);
    }
  }, [currentMessages]);

  // Handle adding a reaction
  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    try {
      // Optimistically update local state
      setMessages((prev) => ({
        ...prev,
        [selectedConversationId]: prev[selectedConversationId].map((msg) => {
          if (msg.id === messageId) {
            const reactions = msg.reactions ? { ...msg.reactions } : {};
            if (!reactions[emoji]) {
              reactions[emoji] = {
                emoji,
                count: 0,
                reactedByCurrentUser: false,
                userNames: [],
              };
            }
            reactions[emoji].count++;
            reactions[emoji].reactedByCurrentUser = true;
            if (currentUserName && reactions[emoji].userNames && !reactions[emoji].userNames.includes(currentUserName)) {
              reactions[emoji].userNames.push(currentUserName);
            }
            return { ...msg, reactions };
          }
          return msg;
        }),
      }));

      // Save to Supabase
      const { error } = await supabase
        .from("chat_message_reactions")
        .insert({
          message_id: messageId,
          user_id: currentUserId,
          sender_profile_id: selectedMemberId,
          emoji,
        });

      if (error) {
        console.error("Error adding reaction:", error);
        // Revert optimistic update if error
        setMessages((prev) => ({
          ...prev,
          [selectedConversationId]: prev[selectedConversationId].map((msg) => {
            if (msg.id === messageId && msg.reactions?.[emoji]) {
              const reactions = { ...msg.reactions };
              reactions[emoji].count--;
              reactions[emoji].reactedByCurrentUser = false;
              if (reactions[emoji].userNames) {
                reactions[emoji].userNames = reactions[emoji].userNames!.filter(n => n !== currentUserName);
              }
              if (reactions[emoji].count === 0) {
                delete reactions[emoji];
              }
              return { ...msg, reactions };
            }
            return msg;
          }),
        }));
      }
    } catch (error) {
      console.error("Error in handleReact:", error);
    }
  }, [selectedConversationId, currentUserId, selectedMemberId, currentUserName]);

  // Handle removing a reaction
  const handleRemoveReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      // Optimistically update local state
      setMessages((prev) => ({
        ...prev,
        [selectedConversationId]: prev[selectedConversationId].map((msg) => {
          if (msg.id === messageId && msg.reactions?.[emoji]) {
            const reactions = { ...msg.reactions };
            reactions[emoji].count--;
            reactions[emoji].reactedByCurrentUser = false;
            if (reactions[emoji].userNames) {
              reactions[emoji].userNames = reactions[emoji].userNames!.filter(n => n !== currentUserName);
            }
            if (reactions[emoji].count === 0) {
              delete reactions[emoji];
            }
            return { ...msg, reactions };
          }
          return msg;
        }),
      }));

      // Remove from Supabase
      const { error } = await supabase
        .from("chat_message_reactions")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", currentUserId)
        .eq("emoji", emoji);

      if (error) {
        console.error("Error removing reaction:", error);
        // Revert optimistic update if error
        const messageToFix = currentMessages.find(m => m.id === messageId);
        if (messageToFix?.reactions?.[emoji]) {
          setMessages((prev) => ({
            ...prev,
            [selectedConversationId]: prev[selectedConversationId].map((msg) => {
              if (msg.id === messageId) {
                const reactions = messageToFix.reactions ? { ...messageToFix.reactions } : {};
                return { ...msg, reactions };
              }
              return msg;
            }),
          }));
        }
      }
    } catch (error) {
      console.error("Error in handleRemoveReaction:", error);
    }
  }, [selectedConversationId, currentUserId, currentUserName, currentMessages]);

  const chatTitle = currentMember?.name || "채팅";
  const memberCount = selectedMemberId === "group" ? members.length - 1 : undefined;
  const typingNames = Array.from(typingUsers)
    .map((id) => members.find((m) => m.id === id)?.name)
    .filter(Boolean)

  return (
    <div className="flex h-screen bg-background" data-testid="chat-page">
      <FamilySidebar
        members={members}
        selectedMemberId={selectedMemberId}
        onSelectMember={handleSelectMember}
        familyName="우리 가족"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <ChatHeader
          title={chatTitle}
          memberCount={memberCount}
          onMenuClick={() => setSidebarOpen(true)}
          onRefresh={handleRefreshMessages}
          isRefreshing={isRefreshing}
          totalUnreadCount={totalUnreadCount}
        />

        <ConversationHeader
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
          onCreateConversation={createConversation}
          unreadCounts={unreadCounts}
        />

        <SearchMessages
          query={searchQuery}
          onQueryChange={setSearchQuery}
          resultCount={filteredMessages.length}
        />
        
        <MessageList
          messages={filteredMessages}
          typingUsers={Array.from(typingUsers)}
          typingNames={typingNames}
          lastReadMessageId={lastReadMessageId[selectedConversationId]}
          onLastVisibleMessage={handleLastVisibleMessage}
          onEdit={handleEditMessage}
          onReply={handleReplyTo}
          onReact={handleReact}
          onRemoveReaction={handleRemoveReaction}
        />

        <ChatInput
          onSendMessage={handleSendMessage}
          onInputChange={() => sendTyping()}
          replyingToMessage={replyingToMessage}
          onCancelReply={handleCancelReply}
        />
      </div>
    </div>
  );
}
