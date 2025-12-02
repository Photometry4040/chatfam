import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Message } from "@shared/schema";

interface UseSupabaseRealtimeOptions {
  familyGroupId: string;
  userId: string;
  userName: string;
  senderProfileId: string;
  conversationId: string;
  onMessage: (message: Message) => void;
  onRoomHistory: (roomId: string, messages: Message[]) => void;
  onTyping?: (userId: string, userName: string) => void;
}

export function useSupabaseRealtime({
  familyGroupId,
  userId,
  userName,
  senderProfileId,
  conversationId,
  onMessage,
  onRoomHistory,
  onTyping,
}: UseSupabaseRealtimeOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionsRef = useRef<any[]>([]);
  const callbacksRef = useRef({ onMessage, onRoomHistory, onTyping });
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Keep callbacks updated
  useEffect(() => {
    callbacksRef.current = { onMessage, onRoomHistory, onTyping };
  }, [onMessage, onRoomHistory, onTyping]);

  // Setup Realtime subscriptions
  const setupSubscriptions = useCallback(async () => {
    if (!senderProfileId || !conversationId) return;
    try {
      // Load initial message history
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
        .eq("family_group_id", familyGroupId)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(100);

      // Fetch messages and then get sender names from family group profiles
      const messagesWithNames: Message[] = [];
      for (const msg of messages || []) {
        const { data: profile } = await supabase
          .from("chat_profiles")
          .select("id, display_name, avatar_emoji")
          .eq("user_id", msg.user_id)
          .eq("family_group_id", msg.family_group_id)
          .order("created_at", { ascending: true })
          .limit(1)
          .single();

        messagesWithNames.push({
          id: msg.id,
          content: msg.content,
          senderId: msg.user_id,
          senderName: profile?.display_name || "Unknown",
          senderProfileId: msg.sender_profile_id || profile?.id,
          roomId: msg.family_group_id,
          timestamp: new Date(msg.created_at),
          isEdited: msg.is_edited,
          editedAt: msg.edited_at ? new Date(msg.edited_at) : undefined,
          isDeleted: false,
        });
      }
      const formattedMessages = messagesWithNames;

      // Use conversationId to group messages in the frontend
      // If no conversationId, messages won't display (filtered by conversation)
      callbacksRef.current.onRoomHistory(conversationId, formattedMessages);

      // Subscribe to new messages
      const messagesSubscription = supabase
        .channel(`messages:${familyGroupId}:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chat_messages",
            filter: `family_group_id=eq.${familyGroupId},conversation_id=eq.${conversationId}`,
          },
          async (payload: any) => {
            if (payload.eventType === "INSERT") {
              // Fetch the sender's display name from family group profiles
              const { data: profile } = await supabase
                .from("chat_profiles")
                .select("id, display_name")
                .eq("id", payload.new.sender_profile_id)
                .single();

              const newMessage: Message = {
                id: payload.new.id,
                content: payload.new.content,
                senderId: payload.new.user_id,
                senderName: profile?.display_name || "Unknown",
                senderProfileId: payload.new.sender_profile_id,
                roomId: payload.new.family_group_id,
                timestamp: new Date(payload.new.created_at),
                isEdited: payload.new.is_edited,
                isDeleted: false,
              };
              callbacksRef.current.onMessage(newMessage);
            }
          }
        )
        .subscribe((status) => {
          console.log(`Messages subscription status: ${status}`);
          if (status === "SUBSCRIBED") {
            setIsConnected(true);
          }
        });

      // Subscribe to typing indicators
      const typingSubscription = supabase
        .channel(`typing:${familyGroupId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chat_typing_indicators",
            filter: `family_group_id=eq.${familyGroupId}`,
          },
          (payload: any) => {
            if (payload.new.is_typing && payload.new.user_id !== userId) {
              // Get the user's display name
              supabase
                .from("chat_profiles")
                .select("display_name")
                .eq("user_id", payload.new.user_id)
                .single()
                .then(({ data }: { data: any }) => {
                  callbacksRef.current.onTyping?.(
                    payload.new.user_id,
                    data?.display_name || "Unknown"
                  );
                });
            }
          }
        )
        .subscribe((status) => {
          console.log(`Typing subscription status: ${status}`);
        });

      subscriptionsRef.current = [messagesSubscription, typingSubscription];
    } catch (error) {
      console.error("Error setting up subscriptions:", error);
      setIsConnected(false);
    }
  }, [familyGroupId, userId, senderProfileId, conversationId]);

  // Initialize subscriptions
  useEffect(() => {
    setupSubscriptions();

    return () => {
      subscriptionsRef.current.forEach((subscription) => {
        supabase.removeChannel(subscription);
      });
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [setupSubscriptions]);

  const sendMessage = useCallback(
    async (content: string) => {
      try {
        console.log("[sendMessage] Starting - conversationId:", conversationId, "senderProfileId:", senderProfileId);
        const { data, error } = await supabase
          .from("chat_messages")
          .insert({
            family_group_id: familyGroupId,
            user_id: userId,
            sender_profile_id: senderProfileId,
            conversation_id: conversationId,
            content,
            message_type: "text",
          })
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
          .single();

        if (error) {
          console.error("[sendMessage] Insert error:", error);
          return;
        }

        console.log("[sendMessage] Insert successful, data:", data);

        if (data) {
          const message: Message = {
            id: data.id,
            content: data.content,
            senderId: data.user_id,
            senderName: userName,
            senderProfileId: data.sender_profile_id || senderProfileId,
            roomId: data.family_group_id,
            timestamp: new Date(data.created_at),
            isEdited: data.is_edited,
            isDeleted: false,
          };
          console.log("[sendMessage] Calling onMessage with message:", message);
          callbacksRef.current.onMessage(message);
          console.log("[sendMessage] onMessage callback executed");
        } else {
          console.warn("[sendMessage] No data returned from insert");
        }

        // Clear typing indicator
        await supabase
          .from("chat_typing_indicators")
          .delete()
          .eq("family_group_id", familyGroupId)
          .eq("user_id", userId);
      } catch (error) {
        console.error("Error in sendMessage:", error);
      }
    },
    [familyGroupId, userId, userName, senderProfileId, conversationId]
  );

  const sendTyping = useCallback(async () => {
    try {
      // Upsert typing indicator (will update or insert)
      const { error } = await supabase.from("chat_typing_indicators").upsert(
        {
          family_group_id: familyGroupId,
          user_id: userId,
          is_typing: true,
          expires_at: new Date(Date.now() + 3000).toISOString(),
        },
        {
          onConflict: "family_group_id,user_id",
        }
      );

      if (error) {
        console.error("Error updating typing indicator:", error);
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Timeout to clear typing indicator after 3 seconds
      typingTimeoutRef.current = setTimeout(async () => {
        try {
          await supabase
            .from("chat_typing_indicators")
            .delete()
            .eq("family_group_id", familyGroupId)
            .eq("user_id", userId);
        } catch (error) {
          console.error("Error clearing typing indicator:", error);
        }
      }, 3000);
    } catch (error) {
      console.error("Error in sendTyping:", error);
    }
  }, [familyGroupId, userId]);

  return { isConnected, sendMessage, sendTyping };
}
