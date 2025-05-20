import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Get user notifications
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const notifications = await db.notification.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    
    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}

// Mark notification as read
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log("Unauthorized attempt to mark notification as read");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return NextResponse.json(
        { error: "Invalid request body - could not parse JSON" },
        { status: 400 }
      );
    }
    
    const { id } = body;
    
    console.log("Marking notification as read:", id, "for user:", session.user.id);
    
    if (!id) {
      console.log("Missing notification ID in request");
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }
    
    // Verify the notification belongs to the user
    try {
      const notification = await db.notification.findUnique({
        where: {
          id,
        },
      });
      
      if (!notification) {
        console.log("Notification not found:", id);
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 }
        );
      }
      
      if (notification.userId !== session.user.id) {
        console.log("Notification does not belong to user:", {
          notificationUserId: notification.userId,
          sessionUserId: session.user.id
        });
        return NextResponse.json(
          { error: "Notification does not belong to the current user" },
          { status: 403 }
        );
      }
      
      console.log("Updating notification:", id);
      
      // Mark notification as read
      const updatedNotification = await db.notification.update({
        where: {
          id,
        },
        data: {
          read: true,
        },
      });
      
      console.log("Notification marked as read successfully:", id);
      return NextResponse.json(updatedNotification || { success: true, id });
    } catch (dbError) {
      console.error("Database error updating notification:", dbError);
      return NextResponse.json(
        { error: "Database error when updating notification" },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 