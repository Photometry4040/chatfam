-- Migration: Add Message Delete and Pin Support
-- Date: 2025-12-03
-- Purpose: Add soft delete and pin functionality to messages

-- Add is_deleted column to track deleted messages
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Add deleted_at to track when message was deleted
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add is_pinned column to track pinned messages
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Add pinned_at to track when message was pinned
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP WITH TIME ZONE;

-- Add pinned_by_user_id to track who pinned the message
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS pinned_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index on is_deleted for efficient filtering
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_deleted
ON public.chat_messages(is_deleted)
WHERE is_deleted = false;

-- Create index on is_pinned for efficient filtering
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_pinned
ON public.chat_messages(is_pinned)
WHERE is_pinned = true;

-- Create composite index for conversation + pinned status
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_pinned
ON public.chat_messages(conversation_id, is_pinned, pinned_at DESC);

-- Create composite index for efficient filtering active messages in conversation
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_active
ON public.chat_messages(conversation_id, is_deleted, created_at DESC);

-- Create index on pinned_by_user_id
CREATE INDEX IF NOT EXISTS idx_chat_messages_pinned_by_user_id
ON public.chat_messages(pinned_by_user_id);

-- Drop existing UPDATE policy to replace it
DROP POLICY IF EXISTS "Users can update their own messages" ON public.chat_messages;

-- Create new UPDATE policy that allows:
-- 1. Users to update their own messages (content, is_edited)
-- 2. All users to pin/unpin messages (is_pinned, pinned_at)
CREATE POLICY "Users can update their own messages or pin/unpin messages"
  ON public.chat_messages FOR UPDATE
  USING (
    (auth.uid() = user_id) OR  -- Can update own messages
    (auth.uid() IN (
      SELECT user_id FROM public.chat_family_members
      WHERE family_group_id = chat_messages.family_group_id
    ))  -- Can pin/unpin messages in their family group
  )
  WITH CHECK (
    (auth.uid() = user_id) OR  -- Can update own messages
    (auth.uid() IN (
      SELECT user_id FROM public.chat_family_members
      WHERE family_group_id = chat_messages.family_group_id
    ))  -- Can pin/unpin messages in their family group
  );

-- Create DELETE policy to allow soft delete (setting is_deleted = true)
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.chat_messages;

CREATE POLICY "Users can delete their own messages"
  ON public.chat_messages FOR DELETE
  USING (auth.uid() = user_id);
