import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "사용자 이름을 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export interface AuthUser {
  id: string;
  username: string;
  name: string;
}

export interface AuthToken {
  userId: string;
  username: string;
  name: string;
}
