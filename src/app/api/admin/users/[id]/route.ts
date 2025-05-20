import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Schema for updating a user
const userUpdateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().optional(),
  role: z.enum(["CUSTOMER", "ADMIN", "SUPER_ADMIN"]),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
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

    // Await params to fix the warnings
    const resolvedParams = await params;
    const userId = resolvedParams.id;
    
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        points: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Regular admins can only view customers
    if (session.user.role === "ADMIN" && user.role !== "CUSTOMER") {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    // Filter sensitive data
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      address: user.address,
      createdAt: user.createdAt,
      image: user.image,
      points: user.points?.points || 0,
    };

    return NextResponse.json(safeUser);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { message: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only admins can modify users
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    // Await params to fix the warnings
    const resolvedParams = await params;
    const userId = resolvedParams.id;
    
    // Check if user exists and get current role
    const existingUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Regular admins can only modify customers
    if (session.user.role === "ADMIN" && existingUser.role !== "CUSTOMER") {
      return NextResponse.json(
        { message: "Forbidden - You can only manage customer accounts" },
        { status: 403 }
      );
    }

    const body = await req.json();
    
    // Parse and validate input data
    const { name, email, password, role, phoneNumber, address } = userUpdateSchema.parse(body);

    // Regular admins cannot change role from CUSTOMER
    if (session.user.role === "ADMIN" && role !== "CUSTOMER") {
      return NextResponse.json(
        { message: "You cannot change a user's role" },
        { status: 403 }
      );
    }

    // Prevent SUPER_ADMIN accounts from being downgraded, even by other SUPER_ADMINs
    if (existingUser.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { message: "Super Admin accounts cannot be downgraded" },
        { status: 403 }
      );
    }

    // Prevent any user from being upgraded to SUPER_ADMIN
    if (existingUser.role !== "SUPER_ADMIN" && role === "SUPER_ADMIN") {
      return NextResponse.json(
        { message: "Users cannot be upgraded to Super Admin" },
        { status: 403 }
      );
    }

    // If email is changing, check if new email is already in use
    if (email !== existingUser.email) {
      const emailExists = await db.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        return NextResponse.json(
          { message: "Email already in use" },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      name,
      email,
      role: session.user.role === "SUPER_ADMIN" ? role : "CUSTOMER", // Ensure regular admins can't change role
      phoneNumber,
      address,
    };

    // Only update password if a new one is provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({
      message: "User updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid input data", errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only admins can delete users
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    // Await params to fix the warnings
    const resolvedParams = await params;
    const userId = resolvedParams.id;
    
    // Check if user exists and get current role
    const existingUser = await db.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Regular admins can only delete customers
    if (session.user.role === "ADMIN" && existingUser.role !== "CUSTOMER") {
      return NextResponse.json(
        { message: "Forbidden - You can only manage customer accounts" },
        { status: 403 }
      );
    }

    // Super admins can delete admins but not other super admins
    if (session.user.role === "SUPER_ADMIN" && existingUser.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { message: "Super Admin accounts cannot be deleted" },
        { status: 403 }
      );
    }

    // Don't allow deleting yourself
    if (existingUser.email === session.user.email) {
      return NextResponse.json(
        { message: "You cannot delete your own account" },
        { status: 403 }
      );
    }

    // Check if user has orders
    const userOrders = await db.order.findMany({
      where: { userId },
      select: { id: true },
    });

    // Prevent deletion of any user (admin or customer) with orders due to foreign key constraints
    if (userOrders.length > 0) {
      return NextResponse.json(
        { 
          message: "Cannot delete user with existing orders", 
          error: `This user has ${userOrders.length} order(s) associated with their account. Please archive or reassign these orders before deleting the user.` 
        },
        { status: 400 }
      );
    }

    // Use a transaction to ensure all related records are deleted properly
    await db.$transaction(async (tx) => {
      // Delete related records in the correct order to avoid foreign key constraint issues
      
      // 1. Delete points history entries
      await tx.pointsHistory.deleteMany({
        where: { userId },
      });
      
      // 2. Delete loyalty points
      await tx.loyaltyPoints.deleteMany({
        where: { userId },
      });
      
      // 3. Delete reviews by the user
      await tx.review.deleteMany({
        where: { userId },
      });
      
      // 4. Delete any notifications for the user
      await tx.notification.deleteMany({
        where: { userId },
      });
      
      // 5. Delete sessions
      await tx.session.deleteMany({
        where: { userId },
      });
      
      // 6. Delete accounts
      await tx.account.deleteMany({
        where: { userId },
      });
      
      // 7. Finally, delete the user
      await tx.user.delete({
        where: { id: userId },
      });
    });

    return NextResponse.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { message: "Failed to delete user", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 