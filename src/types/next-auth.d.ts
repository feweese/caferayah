import NextAuth from "next-auth";
import { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    image?: string | null;
  }

  interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    image?: string | null;
  }
} 