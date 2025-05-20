import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Handle batch operations for notifications (mark as read, delete)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const { action, notificationIds } = await req.json();
    
    // Validate input
    if (!action || !notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid request. Action and notification IDs are required." },
        { status: 400 }
      );
    }
    
    // Make sure user can only modify their own notifications
    const whereClause = {
      id: { in: notificationIds },
      userId: session.user.id
    };
    
    let result;
    
    if (action === "markAsRead") {
      // Mark notifications as read
      result = await db.notification.updateMany({
        where: whereClause,
        data: { read: true }
      });
      
      return NextResponse.json({
        success: true,
        message: `${result.count} notifications marked as read`,
        count: result.count
      });
    } 
    else if (action === "delete") {
      // Delete selected notifications
      result = await db.notification.deleteMany({
        where: whereClause
      });
      
      return NextResponse.json({
        success: true,
        message: `${result.count} notifications deleted`,
        count: result.count
      });
    }
    else {
      return NextResponse.json(
        { error: "Invalid action. Supported actions: markAsRead, delete" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error performing batch action on notifications:", error);
    return NextResponse.json(
      { error: "Failed to perform batch action" },
      { status: 500 }
    );
  }
} 