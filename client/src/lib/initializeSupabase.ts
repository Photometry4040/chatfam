import { supabase } from "./supabase";

const FAMILY_GROUP_ID = "a0000000-0000-0000-0000-000000000001";

interface InitializeResult {
  familyGroupId: string;
  success: boolean;
  message: string;
}

export async function initializeSupabase(): Promise<InitializeResult> {
  try {
    // Get current authenticated user
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      return {
        familyGroupId: FAMILY_GROUP_ID,
        success: false,
        message: "User not authenticated",
      };
    }

    const userId = user.user.id;

    // 1. Check if family group exists
    const { data: existingGroup } = await supabase
      .from("chat_family_groups")
      .select("id")
      .eq("id", FAMILY_GROUP_ID)
      .single();

    if (!existingGroup) {
      // Create family group
      await supabase.from("chat_family_groups").insert({
        id: FAMILY_GROUP_ID,
        user_id: userId,
        name: "우리 가족",
        avatar_emoji: "👨‍👩‍👧‍👦",
        theme: "blue",
        is_active: true,
      });
    }

    // 2. Create family member profiles (multiple roles)
    // Each family member gets a unique mock user_id to distinguish messages
    const familyMembers = [
      { display_name: "은지", avatar_emoji: "😊", userId: "00000000-0000-0000-0000-000000000001" },
      { display_name: "엄마", avatar_emoji: "👩", userId: "00000000-0000-0000-0000-000000000002" },
      { display_name: "아빠", avatar_emoji: "👨", userId: "00000000-0000-0000-0000-000000000003" },
      { display_name: "영신", avatar_emoji: "👧", userId: "00000000-0000-0000-0000-000000000004" },
      { display_name: "영준", avatar_emoji: "👦", userId: "00000000-0000-0000-0000-000000000005" },
    ];

    for (const member of familyMembers) {
      const { data: existingProfile } = await supabase
        .from("chat_profiles")
        .select("id, user_id")
        .eq("family_group_id", FAMILY_GROUP_ID)
        .eq("display_name", member.display_name)
        .single();

      if (!existingProfile) {
        // Create new profile with unique user_id
        await supabase.from("chat_profiles").insert({
          family_group_id: FAMILY_GROUP_ID,
          user_id: member.userId,
          display_name: member.display_name,
          avatar_emoji: member.avatar_emoji,
          status: "online",
          timezone: "Asia/Seoul",
          language: "ko",
        });
      }
      // Profile already exists, no update needed
    }

    // 3. Check if family member exists
    const { data: existingMember } = await supabase
      .from("chat_family_members")
      .select("id")
      .eq("family_group_id", FAMILY_GROUP_ID)
      .eq("user_id", userId)
      .single();

    if (!existingMember) {
      // Add user as family member
      await supabase.from("chat_family_members").insert({
        family_group_id: FAMILY_GROUP_ID,
        user_id: userId,
        role: "owner",
      });
    }

    // 4. Check if any messages exist
    const { data: existingMessages, count } = await supabase
      .from("chat_messages")
      .select("id", { count: "exact" })
      .eq("family_group_id", FAMILY_GROUP_ID)
      .limit(1);

    if (!existingMessages || existingMessages.length === 0) {
      // Add welcome messages
      await supabase.from("chat_messages").insert([
        {
          family_group_id: FAMILY_GROUP_ID,
          user_id: userId,
          content: "안녕! 이제 메시지를 보낼 수 있어!",
          message_type: "text",
        },
        {
          family_group_id: FAMILY_GROUP_ID,
          user_id: userId,
          content: "가족 채팅 시작합니다 🎉",
          message_type: "text",
        },
      ]);
    }

    return {
      familyGroupId: FAMILY_GROUP_ID,
      success: true,
      message: "Initialization complete",
    };
  } catch (error) {
    console.error("Initialization error:", error);
    return {
      familyGroupId: FAMILY_GROUP_ID,
      success: false,
      message: String(error),
    };
  }
}
