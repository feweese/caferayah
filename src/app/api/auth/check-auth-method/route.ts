import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if the user has a password (credential-based) or not (OAuth)
    const user = await db.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        password: true,
        accounts: {
          select: {
            provider: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Check if user has OAuth accounts
    const hasOAuthAccounts = user.accounts.length > 0;
    
    // Check if user has a password set (for credential-based auth)
    const hasPassword = !!user.password;

    return NextResponse.json({
      isOAuthUser: hasOAuthAccounts && !hasPassword,
      message: "Auth method checked successfully",
    });
  } catch (error) {
    console.error("Error checking auth method:", error);
    return NextResponse.json(
      { message: "Failed to check authentication method" },
      { status: 500 }
    );
  }
} 