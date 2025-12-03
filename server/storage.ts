import {
  type User,
  type InsertUser,
  type FamilyMember,
  type InsertFamilyMember,
  type Message,
  type InsertMessage,
  type FamilyGroup
} from "@shared/schema";
import { randomUUID } from "crypto";
import { supabase } from "./supabase";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getFamilyMembers(): Promise<FamilyMember[]>;
  getFamilyMember(id: string): Promise<FamilyMember | undefined>;
  createFamilyMember(member: InsertFamilyMember): Promise<FamilyMember>;
  updateFamilyMemberOnlineStatus(id: string, isOnline: boolean): Promise<void>;
  updateFamilyMemberLastMessage(id: string, lastMessage: string): Promise<void>;

  getMessages(roomId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(messageId: string, roomId: string, content: string): Promise<Message | undefined>;
  deleteMessage(messageId: string, roomId: string): Promise<void>;
  addReaction(messageId: string, roomId: string, emoji: string, userId: string): Promise<void>;
  pinMessage(messageId: string, roomId: string): Promise<void>;

  getGroups(): Promise<FamilyGroup[]>;
  createGroup(name: string, members: string[], createdBy: string): Promise<FamilyGroup>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private familyMembers: Map<string, FamilyMember>;
  private messages: Map<string, Message[]>;
  private groups: Map<string, FamilyGroup>;

  constructor() {
    this.users = new Map();
    this.familyMembers = new Map();
    this.messages = new Map();
    this.groups = new Map();

    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    const defaultMembers: FamilyMember[] = [
      { id: "group", name: "가족 단체방", isOnline: true, lastMessage: "" },
      { id: "mom", name: "엄마", isOnline: true, lastMessage: "" },
      { id: "dad", name: "아빠", isOnline: false, lastMessage: "" },
      { id: "brother1", name: "영신", isOnline: true, lastMessage: "" },
      { id: "brother2", name: "영준", isOnline: false, lastMessage: "" },
      { id: "sister", name: "은지", isOnline: true, lastMessage: "" },
    ];

    defaultMembers.forEach(member => {
      this.familyMembers.set(member.id, member);
    });

    this.messages.set("group", []);
    this.messages.set("mom", []);
    this.messages.set("dad", []);
    this.messages.set("brother1", []);
    this.messages.set("brother2", []);
    this.messages.set("sister", []);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getFamilyMembers(): Promise<FamilyMember[]> {
    return Array.from(this.familyMembers.values());
  }

  async getFamilyMember(id: string): Promise<FamilyMember | undefined> {
    return this.familyMembers.get(id);
  }

  async createFamilyMember(insertMember: InsertFamilyMember): Promise<FamilyMember> {
    const id = randomUUID();
    const member: FamilyMember = {
      ...insertMember,
      id,
      isOnline: false,
    };
    this.familyMembers.set(id, member);
    this.messages.set(id, []);
    return member;
  }

  async updateFamilyMemberOnlineStatus(id: string, isOnline: boolean): Promise<void> {
    const member = this.familyMembers.get(id);
    if (member) {
      member.isOnline = isOnline;
      this.familyMembers.set(id, member);
    }
  }

  async updateFamilyMemberLastMessage(id: string, lastMessage: string): Promise<void> {
    const member = this.familyMembers.get(id);
    if (member) {
      member.lastMessage = lastMessage;
      this.familyMembers.set(id, member);
    }
  }

  async getMessages(roomId: string): Promise<Message[]> {
    return this.messages.get(roomId) || [];
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      timestamp: new Date(),
    };

    const roomMessages = this.messages.get(insertMessage.roomId) || [];
    roomMessages.push(message);
    this.messages.set(insertMessage.roomId, roomMessages);

    await this.updateFamilyMemberLastMessage(insertMessage.roomId, insertMessage.content);

    return message;
  }

  async updateMessage(messageId: string, roomId: string, content: string): Promise<Message | undefined> {
    const roomMessages = this.messages.get(roomId) || [];
    const message = roomMessages.find((m) => m.id === messageId);

    if (message) {
      message.content = content;
      message.isEdited = true;
      message.editedAt = new Date();
    }

    return message;
  }

  async deleteMessage(messageId: string, roomId: string): Promise<void> {
    const roomMessages = this.messages.get(roomId) || [];
    const messageIndex = roomMessages.findIndex((m) => m.id === messageId);

    if (messageIndex > -1) {
      roomMessages[messageIndex].isDeleted = true;
      roomMessages[messageIndex].content = "[삭제된 메시지]";
    }
  }

  async addReaction(messageId: string, roomId: string, emoji: string, userId: string): Promise<void> {
    // Note: reactions are now stored in Supabase, not in memory
    // This method is kept for backward compatibility but not actively used
    const roomMessages = this.messages.get(roomId) || [];
    const message = roomMessages.find((m) => m.id === messageId);

    if (message && !message.reactions) {
      message.reactions = {};
    }
  }

  async pinMessage(messageId: string, roomId: string): Promise<void> {
    const roomMessages = this.messages.get(roomId) || [];
    const message = roomMessages.find((m) => m.id === messageId);

    if (message) {
      message.isPinned = !message.isPinned;
    }
  }

  async getGroups(): Promise<FamilyGroup[]> {
    return Array.from(this.groups.values());
  }

  async createGroup(name: string, members: string[], createdBy: string): Promise<FamilyGroup> {
    const id = randomUUID();
    const group: FamilyGroup = {
      id,
      name,
      members,
      createdBy,
      createdAt: new Date(),
    };

    this.groups.set(id, group);
    this.messages.set(id, []);

    return group;
  }
}

export class SupabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    // Supabase Auth handles user lookups
    return undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    // Supabase Auth handles username lookups
    return undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = randomUUID();
    await supabase.from("chat_profiles").insert({
      user_id: id,
      display_name: user.username,
    });
    return { id, username: user.username, password: user.password };
  }

  async getFamilyMembers(): Promise<FamilyMember[]> {
    const { data } = await supabase
      .from("chat_family_members")
      .select("*, chat_profiles(display_name)")
      .order("joined_at", { ascending: true });

    return (
      data?.map((member) => ({
        id: member.id,
        name: member.chat_profiles?.display_name || "Unknown",
        isOnline: true,
        lastMessage: "",
      })) || []
    );
  }

  async getFamilyMember(id: string): Promise<FamilyMember | undefined> {
    const { data } = await supabase
      .from("chat_family_members")
      .select("*, chat_profiles(display_name)")
      .eq("id", id)
      .single();

    if (!data) return undefined;

    return {
      id: data.id,
      name: data.chat_profiles?.display_name || "Unknown",
      isOnline: true,
      lastMessage: "",
    };
  }

  async createFamilyMember(member: InsertFamilyMember): Promise<FamilyMember> {
    const memberId = randomUUID();
    const { data } = await supabase
      .from("chat_family_members")
      .insert({
        id: memberId,
        user_id: memberId,
        family_group_id: "default-group",
        role: "member",
      })
      .select("*")
      .single();

    return {
      id: data.id,
      name: member.name,
      avatar: member.avatar,
      isOnline: false,
      lastMessage: "",
    };
  }

  async updateFamilyMemberOnlineStatus(id: string, isOnline: boolean): Promise<void> {
    // Update profile status
    const status = isOnline ? "online" : "offline";
    await supabase
      .from("chat_profiles")
      .update({ status })
      .eq("id", id);
  }

  async updateFamilyMemberLastMessage(id: string, lastMessage: string): Promise<void> {
    // This is handled by message creation in the chat_messages table
  }

  async getMessages(roomId: string): Promise<Message[]> {
    const { data } = await supabase
      .from("chat_messages")
      .select("*, chat_profiles(display_name)")
      .eq("family_group_id", roomId)
      .order("created_at", { ascending: true })
      .limit(100);

    return (
      data?.map((msg) => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.user_id,
        senderName: msg.chat_profiles?.display_name || "Unknown",
        roomId: msg.family_group_id,
        timestamp: new Date(msg.created_at),
        isEdited: msg.is_edited,
        editedAt: msg.edited_at ? new Date(msg.edited_at) : undefined,
        isDeleted: false,
      })) || []
    );
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const { data } = await supabase
      .from("chat_messages")
      .insert({
        family_group_id: message.roomId,
        user_id: message.senderId,
        content: message.content,
        message_type: "text",
      })
      .select("*")
      .single();

    return {
      id: data.id,
      content: data.content,
      senderId: data.user_id,
      senderName: message.senderName,
      roomId: data.family_group_id,
      timestamp: new Date(data.created_at),
      isEdited: false,
    };
  }

  async updateMessage(messageId: string, roomId: string, content: string): Promise<Message | undefined> {
    const { data } = await supabase
      .from("chat_messages")
      .update({ content, is_edited: true, edited_at: new Date() })
      .eq("id", messageId)
      .eq("family_group_id", roomId)
      .select("*")
      .single();

    if (!data) return undefined;

    return {
      id: data.id,
      content: data.content,
      senderId: data.user_id,
      senderName: "Unknown",
      roomId: data.family_group_id,
      timestamp: new Date(data.created_at),
      isEdited: true,
      editedAt: data.edited_at ? new Date(data.edited_at) : undefined,
    };
  }

  async deleteMessage(messageId: string, roomId: string): Promise<void> {
    await supabase
      .from("chat_messages")
      .update({ content: "[삭제된 메시지]" })
      .eq("id", messageId)
      .eq("family_group_id", roomId);
  }

  async addReaction(messageId: string, roomId: string, emoji: string, userId: string): Promise<void> {
    // Reaction feature for future implementation
  }

  async pinMessage(messageId: string, roomId: string): Promise<void> {
    // Pin feature for future implementation
  }

  async getGroups(): Promise<FamilyGroup[]> {
    const { data } = await supabase
      .from("chat_family_groups")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    return (
      data?.map((group) => ({
        id: group.id,
        name: group.name,
        members: [],
        createdBy: group.user_id,
        createdAt: new Date(group.created_at),
      })) || []
    );
  }

  async createGroup(name: string, members: string[], createdBy: string): Promise<FamilyGroup> {
    const { data } = await supabase
      .from("chat_family_groups")
      .insert({
        name,
        user_id: createdBy,
        is_active: true,
      })
      .select("*")
      .single();

    return {
      id: data.id,
      name: data.name,
      members,
      createdBy: data.user_id,
      createdAt: new Date(data.created_at),
    };
  }
}

// Use Supabase storage if credentials are available, otherwise use in-memory
export const storage = process.env.VITE_SUPABASE_URL
  ? new SupabaseStorage()
  : new MemStorage();
