-- Migration: Add Conversation Read Status Tracking
-- Date: 2025-12-03
-- Purpose: Track per-user read status for each conversation

-- Create chat_conversation_read_status table
-- This tracks which message each user has read up to in each conversation
CREATE TABLE IF NOT EXISTS public.chat_conversation_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_conversation_read_status_conversation_id
ON public.chat_conversation_read_status(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversation_read_status_user_id
ON public.chat_conversation_read_status(user_id);

CREATE INDEX IF NOT EXISTS idx_conversation_read_status_lookup
ON public.chat_conversation_read_status(conversation_id, user_id);

-- Enable RLS
ALTER TABLE public.chat_conversation_read_status ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
DROP POLICY IF EXISTS "Users can view their own read status" ON public.chat_conversation_read_status;
DROP POLICY IF EXISTS "Users can insert their own read status" ON public.chat_conversation_read_status;
DROP POLICY IF EXISTS "Users can update their own read status" ON public.chat_conversation_read_status;

CREATE POLICY "Users can view their own read status"
  ON public.chat_conversation_read_status FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own read status"
  ON public.chat_conversation_read_status FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own read status"
  ON public.chat_conversation_read_status FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_conversation_read_status_updated_at ON public.chat_conversation_read_status;

CREATE TRIGGER update_conversation_read_status_updated_at
  BEFORE UPDATE ON public.chat_conversation_read_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
