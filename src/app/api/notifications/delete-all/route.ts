import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Delete all notifications for the current user
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Delete all notifications for this user
    const result = await db.notification.deleteMany({
      where: {
        userId: session.user.id,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: "All notifications deleted successfully",
      count: result.count
    });
  } catch (error) {
    console.error("Error deleting notifications:", error);
    return NextResponse.json(
      { error: "Failed to delete notifications" },
      { status: 500 }
    );
  }
} 