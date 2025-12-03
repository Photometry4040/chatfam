import { useEffect, useRef, useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Message, Reaction } from "@shared/schema";

// Helper function to transform reaction rows to Reaction format
function transformReactions(
  reactions: any[],
  currentUserId: string
): Record<string, Reaction> {
  const reactionMap: Record<string, Reaction> = {};

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

    if (reaction.user_id === currentUserId) {
      reactionMap[reaction.emoji].reactedByCurrentUser = true;
    }

    if (reaction.display_name && !reactionMap[reaction.emoji].userNames?.includes(reaction.display_name)) {
      reactionMap[reaction.emoji].userNames?.push(reaction.display_name);
    }
  }

  return reactionMap;
}

interface UseSupabaseRealtimeOptions {
  familyGroupId: string;
  userId: string;
  userName: string;
  senderProfileId: string;
  conversationId: string;
  onMessage: (message: Message) => void;
  onRoomHistory: (roomId: string, messages: Message[]) => void;
  onTyping?: (userId: string, userName: string) => void;
  onReactionChange?: (payload: any) => void;
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
  onReactionChange,
}: UseSupabaseRealtimeOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionsRef = useRef<any[]>([]);
  const callbacksRef = useRef({ onMessage, onRoomHistory, onTyping, onReactionChange });
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Keep callbacks updated
  useEffect(() => {
    callbacksRef.current = { onMessage, onRoomHistory, onTyping, onReactionChange };
  }, [onMessage, onRoomHistory, onTyping, onReactionChange]);

  // Setup Realtime subscriptions
  const setupSubscriptions = useCallback(async () => {
    if (!senderProfileId || !conversationId) return;

    try {
      // Clean up previous subscriptions before setting up new ones
      for (const subscription of subscriptionsRef.current) {
        await supabase.removeChannel(subscription);
      }
      subscriptionsRef.current = [];
      setIsConnected(false);

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
          parent_message_id,
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
      const messageIds = (messages || []).map(m => m.id);

      // Fetch all reactions for these messages
      const { data: reactionsData } = messageIds.length > 0
        ? await supabase
            .from("chat_message_reactions")
            .select(`
              message_id,
              emoji,
              user_id,
              chat_profiles!sender_profile_id(display_name)
            `)
            .in("message_id", messageIds)
        : { data: [] };

      // Group reactions by message_id
      const reactionsByMessageId: Record<string, any[]> = {};
      (reactionsData || []).forEach((reaction: any) => {
        if (!reactionsByMessageId[reaction.message_id]) {
          reactionsByMessageId[reaction.message_id] = [];
        }
        reactionsByMessageId[reaction.message_id].push({
          emoji: reaction.emoji,
          user_id: reaction.user_id,
          display_name: reaction.chat_profiles?.display_name,
        });
      });

      for (const msg of messages || []) {
        const { data: profile } = await supabase
          .from("chat_profiles")
          .select("id, display_name, avatar_emoji")
          .eq("id", msg.sender_profile_id)
          .single();

        const messageReactions = transformReactions(reactionsByMessageId[msg.id] || [], userId);

        messagesWithNames.push({
          id: msg.id,
          content: msg.content,
          senderId: msg.user_id,
          senderName: profile?.display_name || "Unknown",
          senderProfileId: msg.sender_profile_id,
          roomId: msg.family_group_id,
          timestamp: new Date(msg.created_at),
          isEdited: msg.is_edited,
          editedAt: msg.edited_at ? new Date(msg.edited_at) : undefined,
          isDeleted: false,
          parentMessageId: msg.parent_message_id,
          reactions: messageReactions,
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
          // console.log(`Messages subscription status: ${status}`);
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
          // console.log(`Typing subscription status: ${status}`);
        });

      // Subscribe to reaction changes
      const reactionsSubscription = supabase
        .channel(`reactions:${familyGroupId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "chat_message_reactions",
          },
          (payload: any) => {
            callbacksRef.current.onReactionChange?.(payload);
          }
        )
        .subscribe();

      subscriptionsRef.current = [messagesSubscription, typingSubscription, reactionsSubscription];
    } catch (error) {
      console.error("Error setting up subscriptions:", error);
      setIsConnected(false);
    }
  }, [familyGroupId, userId, senderProfileId, conversationId]);

  // Initialize subscriptions
  useEffect(() => {
    setupSubscriptions();

    return () => {
      // Clean up all active subscriptions
      subscriptionsRef.current.forEach((subscription) => {
        try {
          supabase.removeChannel(subscription);
        } catch (error) {
          // Already removed, ignore error
        }
      });
      subscriptionsRef.current = [];

      // Clear typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [setupSubscriptions]);

  const sendMessage = useCallback(
    async (content: string, parentMessageId?: string) => {
      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .insert({
            family_group_id: familyGroupId,
            user_id: userId,
            sender_profile_id: senderProfileId,
            conversation_id: conversationId,
            content,
            message_type: "text",
            parent_message_id: parentMessageId || null,
          })
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
          .single();

        if (error) {
          console.error("Error sending message:", error);
          return;
        }

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
            parentMessageId: data.parent_message_id,
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
