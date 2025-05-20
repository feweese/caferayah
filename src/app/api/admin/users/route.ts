import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Schema for creating a new user
const userCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["CUSTOMER", "ADMIN"]),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
});

// Get all users (with role-based filtering)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only admins can access this endpoint
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    // Super admins can see all users, regular admins can only see customers
    const whereClause = session.user.role === "SUPER_ADMIN" 
      ? {} 
      : { role: "CUSTOMER" };

    const users = await db.user.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        points: true,
      },
    });

    // Filter sensitive data
    const safeUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      address: user.address,
      createdAt: user.createdAt,
      image: user.image,
      points: user.points?.points || 0,
    }));

    return NextResponse.json(safeUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { message: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// Create a new user
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only admins can create users
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();
    
    // Super admins can create any role, but regular admins can only create customers
    if (session.user.role !== "SUPER_ADMIN" && body.role !== "CUSTOMER") {
      body.role = "CUSTOMER"; // Force customer role for non-super admins
    }

    const { name, email, password, role, phoneNumber, address } = userCreateSchema.parse(body);

    // Check if user with email already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        phoneNumber,
        address,
      },
    });

    // Create loyalty points for the user
    await db.loyaltyPoints.create({
      data: {
        userId: user.id,
        points: 0,
      },
    });

    return NextResponse.json(
      { 
        message: "User created successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid input data", errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Failed to create user" },
      { status: 500 }
    );
  }
} 