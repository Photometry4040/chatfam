-- Migration: Add Reply Support
-- Date: 2025-12-03
-- Purpose: Add parent_message_id column to support message replies

-- Add parent_message_id column to chat_messages (nullable for existing messages)
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL;

-- Create index on parent_message_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_messages_parent_message_id
ON public.chat_messages(parent_message_id);

-- Create index on both conversation_id and parent_message_id for efficient thread queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_parent
ON public.chat_messages(conversation_id, parent_message_id);
