import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { generateVerificationCode } from "@/lib/utils";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { 
          message: "User with this email already exists. Please login instead or use a different email address.",
          code: "EMAIL_EXISTS"
        },
        { status: 409 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "CUSTOMER",
      },
    });

    // Create loyalty points record for the user
    await db.loyaltyPoints.create({
      data: {
        userId: user.id,
        points: 0,
      },
    });

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Code valid for 24 hours

    // Store verification code in database
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
      console.log(`Verification email sent to ${email} with code: ${verificationCode}`);
    } else {
      console.error(`Failed to send verification email to ${email}`);
      // Still log the code for testing purposes
      console.log("Verification code:", verificationCode);
    }

    return NextResponse.json(
      { 
        message: "User registered successfully. Please check your email for the verification code." 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid input data", errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
} 