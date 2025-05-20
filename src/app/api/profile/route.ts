import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

const profileSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
});

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, phoneNumber, address } = profileSchema.parse(body);

    // Update user profile
    const updatedUser = await db.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        name,
        phoneNumber,
        address,
      },
    });

    return NextResponse.json(
      { 
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          image: updatedUser.image,
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Profile update error:", error);
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