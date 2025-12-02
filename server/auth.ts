import jwt from "jsonwebtoken";
import type { AuthToken, AuthUser } from "@shared/auth";

const JWT_SECRET = process.env.SESSION_SECRET || "family-chat-secret-key";

const FAMILY_ACCOUNTS = [
  { id: "user_mom", username: "mom", password: "mom123", name: "엄마" },
  { id: "user_dad", username: "dad", password: "dad123", name: "아빠" },
  { id: "user_brother1", username: "brother1", password: "brother1", name: "영신" },
  { id: "user_brother2", username: "brother2", password: "brother2", name: "영준" },
  { id: "user_sister", username: "sister", password: "sister123", name: "은지" },
];

export function authenticateUser(
  username: string,
  password: string
): AuthUser | null {
  const account = FAMILY_ACCOUNTS.find(
    (acc) => acc.username === username && acc.password === password
  );

  if (!account) return null;

  return {
    id: account.id,
    username: account.username,
    name: account.name,
  };
}

export function generateToken(user: AuthUser): string {
  const payload: AuthToken = {
    userId: user.id,
    username: user.username,
    name: user.name,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthToken;
    return decoded;
  } catch {
    return null;
  }
}

export function getFamilyAccounts() {
  return FAMILY_ACCOUNTS.map((acc) => ({
    username: acc.username,
    name: acc.name,
  }));
}
