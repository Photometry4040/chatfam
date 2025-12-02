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
            .eq("user_id", msg.user_id)
            .eq("family_group_id", msg.family_group_id)
            .order("created_at", { ascending: true })
            .limit(1)
            .single();

          const isOwn = msg.sender_profile_id === selectedMemberId;
          console.log(`🔄 Refresh - Message: "${msg.content.substring(0, 20)}..." | sender_profile_id: ${msg.sender_profile_id} | selectedMemberId: ${selectedMemberId} | isOwn: ${isOwn}`);

          messagesWithNames.push({
            id: msg.id,
            content: msg.content,
            senderId: msg.user_id,
            senderName: profile?.display_name || "Unknown",
            senderProfileId: msg.sender_profile_id || profile?.id,
            timestamp: new Date(msg.created_at),
            isOwn,
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

  const handleNewMessage = useCallback((serverMessage: any) => {
    const isOwn = serverMessage.senderProfileId === selectedMemberId;
    console.log(`💬 New message: "${serverMessage.content.substring(0, 20)}..." | senderProfileId: ${serverMessage.senderProfileId} | selectedMemberId: ${selectedMemberId} | isOwn: ${isOwn}`);

    const message: Message = {
      id: serverMessage.id,
      content: serverMessage.content,
      senderId: serverMessage.senderId,
      senderName: serverMessage.senderName,
      senderAvatar: serverMessage.senderAvatar,
      senderProfileId: serverMessage.senderProfileId,
      timestamp: new Date(serverMessage.timestamp),
      isOwn,
    };

    // Capture conversationKey before setState to ensure correct conversation is updated
    const conversationKey = selectedConversationId;

    setMessages((prev) => {
      const conversationMessages = prev[conversationKey] || [];
      const exists = conversationMessages.some((m) => m.id === message.id);
      if (exists) return prev;

      return {
        ...prev,
        [conversationKey]: [...conversationMessages, message],
      };
    });
  }, [selectedMemberId, selectedConversationId]);

  const handleRoomHistory = useCallback((conversationId: string, serverMessages: any[]) => {
    const formattedMessages: Message[] = serverMessages.map((m) => {
      const isOwn = m.senderProfileId === selectedMemberId;
      console.log(`📨 Message: "${m.content.substring(0, 20)}..." | senderProfileId: ${m.senderProfileId} | selectedMemberId: ${selectedMemberId} | isOwn: ${isOwn}`);
      return {
        id: m.id,
        content: m.content,
        senderId: m.senderId,
        senderName: m.senderName,
        senderAvatar: m.senderAvatar,
        senderProfileId: m.senderProfileId,
        timestamp: new Date(m.timestamp),
        isOwn,
      };
    });

    // console.log(`✅ Loaded ${formattedMessages.length} messages for conversation ${conversationId}`);
    setMessages((prev) => ({
      ...prev,
      [conversationId]: formattedMessages,
    }));
  }, [selectedMemberId]);

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
      sendMessage(content);
    },
    [sendMessage]
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
        />

        <ConversationHeader
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
          onCreateConversation={createConversation}
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
        />
        
        <ChatInput
          onSendMessage={handleSendMessage}
          onInputChange={() => sendTyping()}
        />
      </div>
    </div>
  );
}
