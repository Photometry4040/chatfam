-- Migration: Add Emoji Reactions with Database Persistence
-- Date: 2025-12-03
-- Purpose: Add chat_message_reactions table for persistent, real-time emoji reactions

-- Create chat_message_reactions table
CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_profile_id UUID NOT NULL REFERENCES public.chat_profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (char_length(emoji) >= 1 AND char_length(emoji) <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  PRIMARY KEY (message_id, user_id, emoji)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_reactions_message_id
ON public.chat_message_reactions(message_id);

CREATE INDEX IF NOT EXISTS idx_reactions_user_id
ON public.chat_message_reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_reactions_sender_profile_id
ON public.chat_message_reactions(sender_profile_id);

CREATE INDEX IF NOT EXISTS idx_reactions_emoji
ON public.chat_message_reactions(emoji);

-- Enable RLS
ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view reactions in their family groups" ON public.chat_message_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON public.chat_message_reactions;
DROP POLICY IF EXISTS "Users can remove their own reactions" ON public.chat_message_reactions;

-- Create RLS Policies
CREATE POLICY "Users can view reactions in their family groups"
  ON public.chat_message_reactions FOR SELECT
  USING (
    message_id IN (
      SELECT id FROM public.chat_messages cm
      WHERE cm.family_group_id IN (
        SELECT family_group_id FROM public.chat_family_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can add reactions"
  ON public.chat_message_reactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    message_id IN (
      SELECT id FROM public.chat_messages cm
      WHERE cm.family_group_id IN (
        SELECT family_group_id FROM public.chat_family_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can remove their own reactions"
  ON public.chat_message_reactions FOR DELETE
  USING (auth.uid() = user_id);
