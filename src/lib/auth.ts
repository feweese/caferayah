import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login?error=EmailNotVerified",
    signOut: "/",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.picture,
          role: "CUSTOMER",
        };
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await db.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isCorrectPassword) {
          throw new Error("Invalid credentials");
        }

        if (!user.emailVerified) {
          throw new Error("EmailNotVerified");
        }

        return user;
      },
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
        session.user.image = token.image as string | null;
        session.user.phoneNumber = token.phoneNumber as string | null;
        session.user.address = token.address as string | null;
      }

      return session;
    },
    async jwt({ token, user, account, profile }) {
      // Initial sign in
      if (account && user) {
        // For OAuth (Google) sign in, we need to mark the email as verified
        if (account.provider === "google") {
          // Check if user already exists with this email
          const existingUser = await db.user.findUnique({
            where: { email: user.email as string },
          });
          
          if (existingUser) {
            // If user exists, make sure email is marked as verified
            if (!existingUser.emailVerified) {
              await db.user.update({
                where: { id: existingUser.id },
                data: { emailVerified: new Date() },
              });
            }
            
            // Update the user's image if they don't have one but Google provided one
            if (!existingUser.image && user.image) {
              await db.user.update({
                where: { id: existingUser.id },
                data: { image: user.image },
              });
            }
            
            // Set role and other info from existing user
            return {
              ...token,
              id: existingUser.id,
              name: existingUser.name,
              email: existingUser.email,
              role: existingUser.role,
              image: user.image || existingUser.image, // Prioritize new image from Google
              phoneNumber: existingUser.phoneNumber,
              address: existingUser.address,
            };
          } else {
            // Create new user for Google sign in
            const newUser = await db.user.create({
              data: {
                name: user.name as string,
                email: user.email as string,
                emailVerified: new Date(),
                image: user.image,
                role: "CUSTOMER",
              },
            });
            
            // Create loyalty points for the new user
            await db.loyaltyPoints.create({
              data: {
                userId: newUser.id,
                points: 0,
              },
            });
            
            console.log("Created new user with Google sign-in:", {
              id: newUser.id,
              name: newUser.name,
              email: newUser.email,
              image: newUser.image,
            });
            
            return {
              ...token,
              id: newUser.id,
              name: newUser.name,
              email: newUser.email,
              role: newUser.role,
              image: newUser.image,
              phoneNumber: newUser.phoneNumber,
              address: newUser.address,
            };
          }
        }
        
        return {
          ...token,
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        };
      }

      const existingUser = await db.user.findFirst({
        where: {
          email: token.email as string,
        },
      });

      if (!existingUser) {
        return token;
      }

      return {
        ...token,
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
        image: existingUser.image,
        phoneNumber: existingUser.phoneNumber,
        address: existingUser.address,
      };
    },
  },
}; 