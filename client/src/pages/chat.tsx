import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatInput from "@/components/chat/ChatInput";
import MessageList from "@/components/chat/MessageList";
import FamilySidebar from "@/components/chat/FamilySidebar";
import SearchMessages from "@/components/chat/SearchMessages";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { supabase } from "@/lib/supabase";
import { initializeSupabase } from "@/lib/initializeSupabase";
import type { Message } from "@/components/chat/ChatMessage";
import type { FamilyMember } from "@/components/chat/FamilyMemberItem";

const FAMILY_GROUP_ID = "a0000000-0000-0000-0000-000000000001"; // Default family group UUID

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

  // Get current user info and initialize selected member
  useEffect(() => {
    const getUser = async () => {
      const { data: user } = await supabase.auth.getUser();
      if (user?.user) {
        setCurrentUserId(user.user.id);
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

  // Set default selected member when members load
  useEffect(() => {
    if (members.length > 0 && !selectedMemberId) {
      setSelectedMemberId(members[0].id);
      setCurrentUserName(members[0].name);
    }
  }, [members, selectedMemberId]);

  const handleNewMessage = useCallback((serverMessage: any) => {
    const message: Message = {
      id: serverMessage.id,
      content: serverMessage.content,
      senderId: serverMessage.senderId,
      senderName: serverMessage.senderName,
      senderAvatar: serverMessage.senderAvatar,
      senderProfileId: serverMessage.senderProfileId,
      timestamp: new Date(serverMessage.timestamp),
      isOwn: serverMessage.senderProfileId === selectedMemberId,
    };

    setMessages((prev) => {
      const roomMessages = prev[serverMessage.roomId] || [];
      const exists = roomMessages.some((m) => m.id === message.id);
      if (exists) return prev;

      return {
        ...prev,
        [serverMessage.roomId]: [...roomMessages, message],
      };
    });
  }, [selectedMemberId]);

  const handleRoomHistory = useCallback((roomId: string, serverMessages: any[]) => {
    const formattedMessages: Message[] = serverMessages.map((m) => ({
      id: m.id,
      content: m.content,
      senderId: m.senderId,
      senderName: m.senderName,
      senderAvatar: m.senderAvatar,
      senderProfileId: m.senderProfileId,
      timestamp: new Date(m.timestamp),
      isOwn: m.senderProfileId === selectedMemberId,
    }));

    setMessages((prev) => ({
      ...prev,
      [roomId]: formattedMessages,
    }));
  }, [selectedMemberId]);

  const { isConnected, sendMessage, sendTyping } = useSupabaseRealtime({
    familyGroupId: FAMILY_GROUP_ID,
    userId: currentUserId,
    userName: currentUserName,
    senderProfileId: selectedMemberId,
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

  // Show all family group messages (not filtered by member)
  const currentMessages = messages[FAMILY_GROUP_ID] || [];
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
