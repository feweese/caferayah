import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { sendVerificationEmail } from "@/lib/email";
import { generateVerificationCode } from "@/lib/utils";

// Define validation schema
const resendVerificationSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { email } = resendVerificationSchema.parse(body);

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email },
    });

    // For security, don't reveal if the email exists or not
    if (!user) {
      // Return success even if user doesn't exist (to prevent email enumeration)
      return NextResponse.json(
        { message: "If your email exists, you will receive a verification email" },
        { status: 200 }
      );
    }

    // If user is already verified, no need to send another email
    if (user.emailVerified) {
      return NextResponse.json(
        { message: "Your email is already verified. You can log in." },
        { status: 200 }
      );
    }

    // Delete any existing verification tokens for this email
    await db.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // Generate a new verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Code valid for 24 hours

    // Store code in database
    await db.verificationToken.create({
      data: {
        identifier: email,
        token: verificationCode,
        expires: expiresAt,
      },
    });

    // Send verification email
    const emailSent = await sendVerificationEmail(email, verificationCode);

    // Log for debugging
    if (emailSent) {
      console.log(`Verification email resent to ${email} with code: ${verificationCode}`);
    } else {
      console.error(`Failed to resend verification email to ${email}`);
      // Still log the code for testing purposes
      console.log("Verification code:", verificationCode);
    }

    return NextResponse.json({
      message: "Verification email has been sent. Please check your inbox for the verification code.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
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