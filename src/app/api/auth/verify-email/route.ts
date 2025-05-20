import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

// Define validation schema
const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = verifyEmailSchema.parse(body);

    // Find the verification token
    const verificationToken = await db.verificationToken.findFirst({
      where: {
        identifier: email,
        token: code,
      },
    });

    // Check if token exists and is not expired
    if (!verificationToken || verificationToken.expires < new Date()) {
      return NextResponse.json(
        { message: "Invalid verification code or code has expired", verified: false },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found", verified: false },
        { status: 400 }
      );
    }

    // Check if email is already verified
    if (user.emailVerified) {
      // Delete the token as it's no longer needed
      await db.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: email,
            token: code,
          }
        },
      });
      
      return NextResponse.json(
        { message: "Email already verified", verified: true },
        { status: 200 }
      );
    }

    // Verify email
    await db.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    // Delete the used token
    await db.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email,
          token: code,
        }
      },
    });

    return NextResponse.json(
      { message: "Email verified successfully", verified: true },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid email or verification code format", verified: false },
        { status: 400 }
      );
    }

    console.error("Error verifying email:", error);
    return NextResponse.json(
      { message: "Something went wrong during verification", verified: false },
      { status: 500 }
    );
  }
} 