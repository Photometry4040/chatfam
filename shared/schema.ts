import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export interface FamilyMember {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
  lastMessage?: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderProfileId?: string;
  roomId: string;
  timestamp: Date;
  isEdited?: boolean;
  editedAt?: Date;
  isDeleted?: boolean;
  reactions?: Record<string, string[]>;
  isPinned?: boolean;
  parentMessageId?: string;
  parentMessage?: Message;
  isRead?: boolean;
  isOwn?: boolean;
}

export interface FamilyGroup {
  id: string;
  name: string;
  members: string[];
  createdBy: string;
  createdAt: Date;
}

export const insertFamilyMemberSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요"),
  avatar: z.string().optional(),
});

export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;

export const insertMessageSchema = z.object({
  content: z.string().min(1, "메시지를 입력해주세요"),
  senderId: z.string(),
  senderName: z.string(),
  senderAvatar: z.string().optional(),
  roomId: z.string(),
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
