import type { NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import NextAuth from "next-auth";
import bcryptjs from "bcryptjs";

import { prisma } from "./prisma";

const config = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          console.log("Authorizing user:", credentials.email);

          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          console.log("User found:", user ? "yes" : "no");

          if (!user || !user.password) {
            console.log("User not found or no password");
            return null;
          }

          const isPasswordValid = await bcryptjs.compare(
            credentials.password as string,
            user.password
          );

          console.log("Password valid:", isPasswordValid);

          if (!isPasswordValid) {
            console.log("Invalid password");
            return null;
          }

          console.log("Authorization successful for:", user.email);
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session?.user) {
        session.user.id = token.id;
      }
      return session;
    },
    async redirect({ url, baseUrl }: any) {
      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET || "expense-tracker-secret-key",
  trustHost: true,
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(config);
