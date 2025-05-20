import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Schema for review actions
const reviewActionSchema = z.object({
  action: z.enum(["approve", "reject", "delete"]),
  reason: z.string().optional(),
});

// Update review status (approve or reject)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "You must be logged in to access this endpoint" },
        { status: 401 }
      );
    }

    // Check if user has permission by fetching from DB
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "You do not have permission to access this resource" },
        { status: 403 }
      );
    }

    // Get review ID from params - await params to fix NextJS warning
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Review ID is required" },
        { status: 400 }
      );
    }

    // Parse request body to get action and reason
    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error("Error parsing request body:", e);
      return NextResponse.json(
        { error: "Invalid request body format" },
        { status: 400 }
      );
    }
    
    const validatedBody = reviewActionSchema.safeParse(body);
    
    if (!validatedBody.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validatedBody.error.format() },
        { status: 400 }
      );
    }
    
    const { action } = validatedBody.data;

    // Find the review
    const review = await db.review.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            images: true,
          },
        },
      },
    });

    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    if (action === "approve") {
      try {
        // Approve review
        const updatedReview = await db.review.update({
          where: { id },
          data: {
            approved: true,
            rejected: false,
          },
        });
        
        // Create notification for user - wrapped in try/catch
        const notification = await db.notification.create({
          data: {
            userId: review.userId,
            type: "REVIEW_STATUS",
            title: "Review Approved",
            message: `Your review for ${review.product.name} has been approved`,
            read: false,
          },
        });

        // Emit real-time notification
        try {
          const { emitNotificationToUser } = await import('@/lib/socket-emitter');
          emitNotificationToUser(review.userId, notification);
        } catch (socketError) {
          console.error("Error emitting real-time notification:", socketError);
          // Continue even if real-time notification fails
        }
  
        return NextResponse.json({
          message: "Review approved successfully",
          success: true
        });
      } catch (approveError) {
        console.error("Error approving review:", approveError);
        return NextResponse.json(
          { error: "Failed to approve review" },
          { status: 500 }
        );
      }
    } else if (action === "reject") {
      try {
        // Update review to mark it as rejected
        const updatedReview = await db.review.update({
          where: { id },
          data: {
            approved: false,
            rejected: true,
          },
        });
  
        try {
          // Create notification for user with a standard rejection message
          await db.notification.create({
            data: {
              userId: review.userId,
              type: "REVIEW_STATUS",
              title: "Review Rejected",
              message: `Your review for ${review.product.name} has been rejected as it did not meet our community guidelines.`,
              read: false,
            },
          });
        } catch (notifError) {
          console.error("Error creating notification:", notifError);
          // Continue even if notification fails
        }
  
        return NextResponse.json({
          message: "Review rejected successfully",
          success: true
        });
      } catch (rejectError) {
        console.error("Error rejecting review:", rejectError);
        return NextResponse.json(
          { error: "Failed to reject review" },
          { status: 500 }
        );
      }
    } else if (action === "delete") {
      try {
        // Delete review
        await db.review.delete({
          where: { id },
        });
  
        return NextResponse.json({
          message: "Review deleted successfully",
          success: true
        });
      } catch (deleteError) {
        console.error("Error deleting review:", deleteError);
        return NextResponse.json(
          { error: "Failed to delete review" },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[ADMIN_REVIEW_PATCH]", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

// Delete a review
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "You must be logged in to access this endpoint" },
        { status: 401 }
      );
    }

    // Check if user has permission by fetching from DB
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "You do not have permission to access this resource" },
        { status: 403 }
      );
    }

    // Get review ID from params - await params to fix NextJS warning
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Review ID is required" },
        { status: 400 }
      );
    }

    // Check if review exists
    const review = await db.review.findUnique({
      where: { id },
    });

    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    // Delete the review
    await db.review.delete({
      where: { id },
    });

    return NextResponse.json({ 
      message: "Review deleted successfully" 
    });
  } catch (error) {
    console.error("[ADMIN_REVIEW_DELETE]", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
} 