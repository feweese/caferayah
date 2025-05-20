import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Mark a single notification as read
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Await params before accessing id property
    const unwrappedParams = await params;
    const id = unwrappedParams.id;
    console.log(`API: Marking notification ${id} as read`);
    
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log("API: Unauthorized attempt to mark notification as read");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    console.log(`API: User ${userId} attempting to mark notification ${id} as read`);
    
    // Verify notification exists and belongs to user
    const notification = await db.notification.findUnique({
      where: { id }
    });
    
    if (!notification) {
      console.log(`API: Notification ${id} not found`);
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }
    
    console.log(`API: Found notification with userId=${notification.userId}, session userId=${userId}`);
    
    // Normalize IDs for comparison to avoid case sensitivity issues
    const normalizedNotificationUserId = String(notification.userId).toLowerCase();
    const normalizedSessionUserId = String(userId).toLowerCase();
    
    // Allow access in development mode for testing
    const isDev = process.env.NODE_ENV === 'development';
    if (normalizedNotificationUserId !== normalizedSessionUserId) {
      if (isDev) {
        console.log(`API: [DEV MODE] Overriding user ownership check for testing`);
        // In development, allow the operation regardless of ownership
      } else {
        console.log(`API: Notification ${id} does not belong to user ${userId}`, {
          notificationUserId: notification.userId,
          sessionUserId: userId,
        });
        return NextResponse.json(
          { error: "Notification does not belong to this user" },
          { status: 403 }
        );
      }
    }
    
    // Update notification
    const updated = await db.notification.update({
      where: { id },
      data: { read: true }
    });
    
    console.log(`API: Successfully marked notification ${id} as read`);
    return NextResponse.json({
      success: true,
      id: updated.id,
      read: updated.read
    });
  } catch (error) {
    console.error("API: Error marking notification as read:", error);
    return NextResponse.json(
      { error: "Failed to mark notification as read", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 