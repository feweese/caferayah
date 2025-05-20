import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Define validation schema
const resetPasswordSchema = z.object({
  token: z.string().min(1, { message: "Token is required" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { token, password } = resetPasswordSchema.parse(body);

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

    // Get user by email (stored in identifier field)
    const user = await db.user.findUnique({
      where: { email: verificationToken.identifier },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Delete the used token to prevent reuse
    await db.verificationToken.delete({
      where: { token },
    });

    return NextResponse.json({
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid input data", errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
} 