import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Delete existing admin user to avoid duplicate email errors
    await db.user.deleteMany({
      where: {
        email: "admin@caferayah.com",
      },
    });

    // Create admin user
    const hashedPassword = await bcrypt.hash("Admin123!", 10);
    const admin = await db.user.create({
      data: {
        name: "Admin User",
        email: "admin@caferayah.com",
        password: hashedPassword,
        role: "ADMIN",
        phoneNumber: "09123456789",
        address: "123 Admin Street, Admin City",
        image: null,
      },
    });

    return NextResponse.json({
      message: "Admin user created successfully",
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    return NextResponse.json(
      { message: "Failed to create admin user", error },
      { status: 500 }
    );
  }
} 