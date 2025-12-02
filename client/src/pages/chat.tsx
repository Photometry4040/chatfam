import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatInput from "@/components/chat/ChatInput";
import MessageList from "@/components/chat/MessageList";
import FamilySidebar from "@/components/chat/FamilySidebar";
import SearchMessages from "@/components/chat/SearchMessages";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { supabase } from "@/lib/supabase";
import type { Message } from "@/components/chat/ChatMessage";
import type { FamilyMember } from "@/components/chat/FamilyMemberItem";

const CURRENT_USER_ID = "me";
const CURRENT_USER_NAME = "나";
const FAMILY_GROUP_ID = "family-main"; // Default family group

// Fetch family members from Supabase
async function fetchFamilyMembers(): Promise<FamilyMember[]> {
  const { data, error } = await supabase
    .from("chat_family_members")
    .select("id, name:display_name, avatar:profile_image, is_online:online_status")
    .eq("family_group_id", FAMILY_GROUP_ID)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch family members:", error);
    return [];
  }

  return (data || []).map(member => ({
    id: member.id,
    name: member.name || "Unknown",
    avatar: member.avatar,
    isOnline: member.is_online,
  }));
}

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("group");
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  const { data: members = [] } = useQuery<FamilyMember[]>({
    queryKey: ["family-members", FAMILY_GROUP_ID],
    queryFn: fetchFamilyMembers,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleNewMessage = useCallback((serverMessage: any) => {
    const message: Message = {
      id: serverMessage.id,
      content: serverMessage.content,
      senderId: serverMessage.senderId,
      senderName: serverMessage.senderName,
      senderAvatar: serverMessage.senderAvatar,
      timestamp: new Date(serverMessage.timestamp),
      isOwn: serverMessage.senderId === CURRENT_USER_ID,
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
  }, []);

  const handleRoomHistory = useCallback((roomId: string, serverMessages: any[]) => {
    const formattedMessages: Message[] = serverMessages.map((m) => ({
      id: m.id,
      content: m.content,
      senderId: m.senderId,
      senderName: m.senderName,
      senderAvatar: m.senderAvatar,
      timestamp: new Date(m.timestamp),
      isOwn: m.senderId === CURRENT_USER_ID,
    }));

    setMessages((prev) => ({
      ...prev,
      [roomId]: formattedMessages,
    }));
  }, []);

  const { isConnected, sendMessage, sendTyping } = useSupabaseRealtime({
    familyGroupId: FAMILY_GROUP_ID,
    userId: CURRENT_USER_ID,
    userName: CURRENT_USER_NAME,
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

  const currentMessages = messages[selectedMemberId] || [];
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
  }, []);

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
          disabled={!isConnected}
          onInputChange={() => sendTyping()}
        />
      </div>
    </div>
  );
}
