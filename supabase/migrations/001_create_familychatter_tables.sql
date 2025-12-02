-- Migration: Create FamilyChatter Tables
-- Date: 2025-12-02
-- Purpose: Initialize chat tables with RLS policies

-- Create chat_family_groups table
CREATE TABLE IF NOT EXISTS public.chat_family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  description TEXT,
  avatar_emoji TEXT,
  theme TEXT DEFAULT 'blue',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_profiles table
CREATE TABLE IF NOT EXISTS public.chat_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(display_name) >= 1 AND char_length(display_name) <= 100),
  avatar_emoji TEXT,
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'away', 'offline')),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  timezone TEXT DEFAULT 'Asia/Seoul',
  language TEXT DEFAULT 'ko',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_family_members table
CREATE TABLE IF NOT EXISTS public.chat_family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id UUID NOT NULL REFERENCES public.chat_family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(family_group_id, user_id)
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id UUID NOT NULL REFERENCES public.chat_family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 2000),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'emoji', 'system')),
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_typing_indicators table
CREATE TABLE IF NOT EXISTS public.chat_typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id UUID NOT NULL REFERENCES public.chat_family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '3 seconds'),
  UNIQUE(family_group_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_profiles_user_id ON public.chat_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_family_members_family_group_id ON public.chat_family_members(family_group_id);
CREATE INDEX IF NOT EXISTS idx_chat_family_members_user_id ON public.chat_family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_family_group_id ON public.chat_messages(family_group_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_typing_indicators_family_group_id ON public.chat_typing_indicators(family_group_id);
CREATE INDEX IF NOT EXISTS idx_chat_typing_indicators_expires_at ON public.chat_typing_indicators(expires_at);

-- Enable RLS
ALTER TABLE public.chat_family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_typing_indicators ENABLE ROW LEVEL SECURITY;

-- Drop existing RLS Policies (if any)
DROP POLICY IF EXISTS "Users can view their own family groups" ON public.chat_family_groups;
DROP POLICY IF EXISTS "Users can create family groups" ON public.chat_family_groups;
DROP POLICY IF EXISTS "Users can update their own family groups" ON public.chat_family_groups;

DROP POLICY IF EXISTS "Anyone can view profiles" ON public.chat_profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.chat_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.chat_profiles;

DROP POLICY IF EXISTS "Users can view family members of their groups" ON public.chat_family_members;
DROP POLICY IF EXISTS "Family owners can add members" ON public.chat_family_members;
DROP POLICY IF EXISTS "Family owners can update members" ON public.chat_family_members;

DROP POLICY IF EXISTS "Users can view messages in their family groups" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their family groups" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.chat_messages;

DROP POLICY IF EXISTS "Users can view typing indicators in their groups" ON public.chat_typing_indicators;
DROP POLICY IF EXISTS "Users can update their typing status" ON public.chat_typing_indicators;
DROP POLICY IF EXISTS "Users can update their typing indicator" ON public.chat_typing_indicators;

-- Create RLS Policies for chat_family_groups
CREATE POLICY "Users can view their own family groups"
  ON public.chat_family_groups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create family groups"
  ON public.chat_family_groups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own family groups"
  ON public.chat_family_groups FOR UPDATE
  USING (auth.uid() = user_id);

-- Create RLS Policies for chat_profiles
CREATE POLICY "Anyone can view profiles"
  ON public.chat_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own profile"
  ON public.chat_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.chat_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Create RLS Policies for chat_family_members
CREATE POLICY "Users can view family members of their groups"
  ON public.chat_family_members FOR SELECT
  USING (
    family_group_id IN (
      SELECT id FROM public.chat_family_groups
      WHERE auth.uid() = user_id
    )
  );

CREATE POLICY "Family owners can add members"
  ON public.chat_family_members FOR INSERT
  WITH CHECK (
    family_group_id IN (
      SELECT id FROM public.chat_family_groups
      WHERE auth.uid() = user_id
    )
  );

CREATE POLICY "Family owners can update members"
  ON public.chat_family_members FOR UPDATE
  USING (
    family_group_id IN (
      SELECT id FROM public.chat_family_groups
      WHERE auth.uid() = user_id
    )
  );

-- Create RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their family groups"
  ON public.chat_messages FOR SELECT
  USING (
    family_group_id IN (
      SELECT family_group_id FROM public.chat_family_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their family groups"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    family_group_id IN (
      SELECT family_group_id FROM public.chat_family_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages"
  ON public.chat_messages FOR UPDATE
  USING (auth.uid() = user_id);

-- Create RLS Policies for chat_typing_indicators
CREATE POLICY "Users can view typing indicators in their groups"
  ON public.chat_typing_indicators FOR SELECT
  USING (
    family_group_id IN (
      SELECT family_group_id FROM public.chat_family_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their typing status"
  ON public.chat_typing_indicators FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their typing indicator"
  ON public.chat_typing_indicators FOR UPDATE
  USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers (if any)
DROP TRIGGER IF EXISTS update_chat_family_groups_updated_at ON public.chat_family_groups;
DROP TRIGGER IF EXISTS update_chat_profiles_updated_at ON public.chat_profiles;
DROP TRIGGER IF EXISTS update_chat_family_members_updated_at ON public.chat_family_members;
DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON public.chat_messages;
DROP TRIGGER IF EXISTS update_chat_typing_indicators_updated_at ON public.chat_typing_indicators;

-- Create triggers
CREATE TRIGGER update_chat_family_groups_updated_at
  BEFORE UPDATE ON public.chat_family_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_profiles_updated_at
  BEFORE UPDATE ON public.chat_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_family_members_updated_at
  BEFORE UPDATE ON public.chat_family_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_typing_indicators_updated_at
  BEFORE UPDATE ON public.chat_typing_indicators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
