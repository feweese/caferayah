import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import { z } from "zod";
import { sendPasswordResetEmail } from "@/lib/email";

// Define validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email },
    });

    // For security, don't reveal if the email exists or not
    if (!user) {
      // Return success even if user doesn't exist (to prevent email enumeration)
      return NextResponse.json(
        { message: "If your email exists, you will receive instructions" },
        { status: 200 }
      );
    }

    // Generate a random token
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token valid for 1 hour

    // Store token in database (we'll use VerificationToken model for this)
    await db.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires: expiresAt,
      },
    });

    // Create reset URL (that the email would link to)
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    // Send the password reset email
    const emailSent = await sendPasswordResetEmail(email, resetUrl);

    // Log for debugging
    if (emailSent) {
      console.log(`Password reset email sent to ${email}`);
    } else {
      console.error(`Failed to send password reset email to ${email}`);
      // Still log the link for testing purposes
      console.log("Password reset link:", resetUrl);
    }

    return NextResponse.json({
      message: "Password reset instructions sent",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid email format" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
} 