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
      { id: "sister", name: "누나", isOnline: true, lastMessage: "" },
      { id: "brother", name: "형", isOnline: false, lastMessage: "" },
    ];

    defaultMembers.forEach(member => {
      this.familyMembers.set(member.id, member);
    });

    this.messages.set("group", []);
    this.messages.set("mom", []);
    this.messages.set("dad", []);
    this.messages.set("sister", []);
    this.messages.set("brother", []);
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
    const roomMessages = this.messages.get(roomId) || [];
    const message = roomMessages.find((m) => m.id === messageId);
    
    if (message) {
      if (!message.reactions) {
        message.reactions = {};
      }
      if (!message.reactions[emoji]) {
        message.reactions[emoji] = [];
      }
      if (!message.reactions[emoji].includes(userId)) {
        message.reactions[emoji].push(userId);
      }
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

export const storage = new MemStorage();
