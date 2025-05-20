import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Get token from query parameters
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { message: "Token is required" },
        { status: 400 }
      );
    }

    // Find token in database
    const verificationToken = await db.verificationToken.findUnique({
      where: { token },
    });

    // Check if token exists and is not expired
    if (!verificationToken || new Date() > verificationToken.expires) {
      return NextResponse.json(
        { message: "Invalid or expired token" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      message: "Token is valid",
    });
  } catch (error) {
    console.error("Token verification error:", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
} 