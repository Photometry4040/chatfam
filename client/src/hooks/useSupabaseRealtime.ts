import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Message } from "@shared/schema";

interface UseSupabaseRealtimeOptions {
  familyGroupId: string;
  userId: string;
  userName: string;
  onMessage: (message: Message) => void;
  onRoomHistory: (roomId: string, messages: Message[]) => void;
  onTyping?: (userId: string, userName: string) => void;
}

export function useSupabaseRealtime({
  familyGroupId,
  userId,
  userName,
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
          is_edited,
          edited_at,
          created_at,
          chat_profiles!user_id(display_name)
        `
        )
        .eq("family_group_id", familyGroupId)
        .order("created_at", { ascending: true })
        .limit(100);

      const formattedMessages: Message[] = (messages || []).map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.user_id,
        senderName: msg.chat_profiles?.display_name || "Unknown",
        roomId: msg.family_group_id,
        timestamp: new Date(msg.created_at),
        isEdited: msg.is_edited,
        editedAt: msg.edited_at ? new Date(msg.edited_at) : undefined,
        isDeleted: false,
      }));

      callbacksRef.current.onRoomHistory(familyGroupId, formattedMessages);

      // Subscribe to new messages
      const messagesSubscription = supabase
        .channel(`messages:${familyGroupId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chat_messages",
            filter: `family_group_id=eq.${familyGroupId}`,
          },
          (payload: any) => {
            if (payload.eventType === "INSERT") {
              const newMessage: Message = {
                id: payload.new.id,
                content: payload.new.content,
                senderId: payload.new.user_id,
                senderName: payload.new.senderName || "Unknown",
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
  }, [familyGroupId, userId]);

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
        const { data, error } = await supabase
          .from("chat_messages")
          .insert({
            family_group_id: familyGroupId,
            user_id: userId,
            content,
            message_type: "text",
          })
          .select(
            `
            id,
            content,
            user_id,
            family_group_id,
            is_edited,
            edited_at,
            created_at,
            chat_profiles!user_id(display_name)
          `
          )
          .single();

        if (error) {
          console.error("Error sending message:", error);
          return;
        }

        if (data) {
          const displayName = Array.isArray(data.chat_profiles)
            ? data.chat_profiles[0]?.display_name
            : (data.chat_profiles as any)?.display_name;

          const message: Message = {
            id: (data as any).id,
            content: (data as any).content,
            senderId: (data as any).user_id,
            senderName: displayName || userName,
            roomId: (data as any).family_group_id,
            timestamp: new Date((data as any).created_at),
            isEdited: false,
            isDeleted: false,
          };
          callbacksRef.current.onMessage(message);
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
    [familyGroupId, userId, userName]
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
