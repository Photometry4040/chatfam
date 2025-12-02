-- Migration: Add Conversations Support
-- Date: 2025-12-02
-- Purpose: Add chat_conversations table and link messages to conversations

-- Create chat_conversations table
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id UUID NOT NULL REFERENCES public.chat_family_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 100),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add conversation_id to chat_messages (nullable initially for migration)
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE;

-- Create default conversation for each existing family group
INSERT INTO public.chat_conversations (family_group_id, title, created_by)
SELECT DISTINCT 
  fg.id, 
  '기본 대화', 
  fg.user_id 
FROM public.chat_family_groups fg
WHERE NOT EXISTS (
  SELECT 1 FROM public.chat_conversations c 
  WHERE c.family_group_id = fg.id AND c.title = '기본 대화'
);

-- Update existing messages to use default conversation
UPDATE public.chat_messages m
SET conversation_id = (
  SELECT c.id 
  FROM public.chat_conversations c 
  WHERE c.family_group_id = m.family_group_id 
  AND c.title = '기본 대화'
  LIMIT 1
)
WHERE conversation_id IS NULL;

-- Make conversation_id NOT NULL after data migration
ALTER TABLE public.chat_messages 
ALTER COLUMN conversation_id SET NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversations_family_group_id 
ON public.chat_conversations(family_group_id);

CREATE INDEX IF NOT EXISTS idx_conversations_created_at 
ON public.chat_conversations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
ON public.chat_messages(conversation_id);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view conversations in their family groups" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can create conversations in their family groups" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can update conversations in their family groups" ON public.chat_conversations;

-- Create RLS Policies for chat_conversations
CREATE POLICY "Users can view conversations in their family groups"
  ON public.chat_conversations FOR SELECT
  USING (
    family_group_id IN (
      SELECT family_group_id FROM public.chat_family_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations in their family groups"
  ON public.chat_conversations FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    family_group_id IN (
      SELECT family_group_id FROM public.chat_family_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update conversations in their family groups"
  ON public.chat_conversations FOR UPDATE
  USING (
    family_group_id IN (
      SELECT family_group_id FROM public.chat_family_members
      WHERE user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_chat_conversations_updated_at ON public.chat_conversations;

CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
