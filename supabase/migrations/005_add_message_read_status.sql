-- Migration: Add Message Read Status Tracking
-- Date: 2025-12-03
-- Purpose: Track message read status for unread message count and notifications

-- Add is_read column to chat_messages table
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Add sender_profile_id column if it doesn't exist
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS sender_profile_id UUID REFERENCES public.chat_profiles(id) ON DELETE SET NULL;

-- Create index on is_read for efficient filtering of unread messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_read
ON public.chat_messages(is_read);

-- Create index on conversation and is_read for efficient unread count per conversation
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_unread
ON public.chat_messages(conversation_id, is_read);

-- Create index on sender_profile_id for quick lookups
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_profile_id
ON public.chat_messages(sender_profile_id);

-- Mark all existing messages as read (they are old messages)
UPDATE public.chat_messages
SET is_read = true
WHERE is_read IS NULL;

-- Ensure is_read column is NOT NULL
ALTER TABLE public.chat_messages
ALTER COLUMN is_read SET NOT NULL;
