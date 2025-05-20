import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Get reviews for admin based on status
export async function GET(request: Request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    console.log("Admin reviews GET - session:", session?.user?.email);

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
    console.log("Admin reviews GET - user role:", user?.role);

    if (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "You do not have permission to access this resource" },
        { status: 403 }
      );
    }

    // Parse URL to get status parameter more safely
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    console.log("Admin reviews GET - status:", status);

    // Set where condition based on status
    // Only use fields that exist in the schema
    let whereCondition = {};
    
    if (status === "pending") {
      whereCondition = {
        approved: false,
        rejected: false,
      };
    } else if (status === "approved") {
      whereCondition = {
        approved: true,
      };
    } else if (status === "rejected") {
      whereCondition = {
        rejected: true,
      };
    }

    console.log("Fetching reviews with condition:", whereCondition);

    // Fetch reviews from database
    try {
      // Get all reviews for the given status
      const reviews = await db.review.findMany({
        where: whereCondition,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
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
        orderBy: {
          createdAt: "desc",
        },
      });
      
      console.log(`Found ${reviews.length} reviews`);
      
      // Get all orders for users with reviews
      const userIds = [...new Set(reviews.map(review => review.userId))];
      const orders = await db.order.findMany({
        where: {
          userId: {
            in: userIds,
          },
          status: "COMPLETED",
        },
        select: {
          id: true,
          userId: true,
          createdAt: true,
          status: true,
        },
      });
      
      // Create a map of userId to orders
      const userOrders = orders.reduce((acc, order) => {
        if (!acc[order.userId]) {
          acc[order.userId] = [];
        }
        acc[order.userId].push(order);
        return acc;
      }, {} as Record<string, any[]>);

      // Map the response with order info
      const mappedReviews = reviews.map(review => {
        // Try to find a user order
        const userOrdersList = userOrders[review.userId] || [];
        const anyOrder = userOrdersList.length > 0 ? userOrdersList[0] : null;
        
        return {
          ...review,
          orderId: review.orderId || (anyOrder ? anyOrder.id : "legacy"),
          order: anyOrder || { id: "legacy", createdAt: review.createdAt, status: "COMPLETED" },
          product: {
            ...review.product,
            image: review.product.images?.[0] || null
          }
        };
      });

      return NextResponse.json(mappedReviews);
    } catch (dbError) {
      console.error("Database query error:", dbError);
      return NextResponse.json(
        { error: "Database query failed", details: dbError instanceof Error ? dbError.message : String(dbError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[ADMIN_REVIEWS_GET] Detailed error:", error);
    return NextResponse.json(
      { error: "Something went wrong", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Schema for approving or rejecting reviews
const reviewActionSchema = z.object({
  reviewId: z.string(),
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
});

// Approve or reject a review
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { message: "Access denied" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { reviewId, action, reason } = reviewActionSchema.parse(body);

    if (!reviewId || !action) {
      return NextResponse.json(
        { message: "Review ID and action are required" },
        { status: 400 }
      );
    }

    // Find the review
    const review = await db.review.findUnique({
      where: { id: reviewId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          }
        },
        product: {
          select: {
            id: true,
            name: true,
          }
        }
      },
    });

    if (!review) {
      return NextResponse.json(
        { message: "Review not found" },
        { status: 404 }
      );
    }

    if (action === "approve") {
      // Approve the review
      const updatedReview = await db.review.update({
        where: { id: reviewId },
        data: { approved: true },
      });

      // Notify the user that their review was approved
      await db.notification.create({
        data: {
          userId: review.userId,
          type: "REVIEW_STATUS",
          title: "Review Approved",
          message: `Your review for ${review.product.name} has been approved`,
          link: `/products/${review.productId}`,
        },
      });

      return NextResponse.json(
        { message: "Review approved successfully", review: updatedReview },
        { status: 200 }
      );
    } else {
      // Reject the review
      const updatedReview = await db.review.update({
        where: { id: reviewId },
        data: { rejected: true, rejectionReason: reason || "Did not meet our guidelines" },
      });

      // Notify the user that their review was rejected
      await db.notification.create({
        data: {
          userId: review.userId,
          type: "REVIEW_STATUS",
          title: "Review Not Approved",
          message: `Your review for ${review.product.name} was not approved. ${reason || "It did not meet our community guidelines."}`,
          link: `/products/${review.productId}`,
        },
      });

      return NextResponse.json(
        { message: "Review rejected successfully", review: updatedReview },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error updating review:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid input data", errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Failed to update review" },
      { status: 500 }
    );
  }
}

// Delete a review (admin only)
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { message: "Access denied" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const reviewId = searchParams.get("id");

    console.log("Delete request for review:", reviewId);

    if (!reviewId) {
      return NextResponse.json(
        { message: "Review ID is required" },
        { status: 400 }
      );
    }

    // Check if review exists
    const review = await db.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return NextResponse.json(
        { message: "Review not found" },
        { status: 404 }
      );
    }

    // Delete the review
    await db.review.delete({
      where: { id: reviewId },
    });

    return NextResponse.json(
      { message: "Review deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting review:", error);
    return NextResponse.json(
      { message: "Failed to delete review", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 