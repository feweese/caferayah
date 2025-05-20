import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";

const reviewSchema = z.object({
  productId: z.string(),
  orderId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Log the user to help with debugging
    console.log("Review submission from user:", session.user.email);

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
      console.log("Review submission data:", body);
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    const validation = reviewSchema.safeParse(body);

    if (!validation.success) {
      console.error("Validation error:", validation.error.errors);
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { productId, orderId, rating, comment } = validation.data;

    // Check if order exists and belongs to user
    console.log(`Verifying order: ${orderId} for product: ${productId}`);
    try {
      const order = await db.order.findFirst({
        where: {
          id: orderId,
          userId: session.user.id,
          status: "COMPLETED",
        },
        include: {
          items: {
            where: {
              productId: productId,
            },
          },
        },
      });

      if (!order) {
        console.error(`Order not found or not completed: ${orderId}`);
        return NextResponse.json(
          { error: "Order not found or not completed" },
          { status: 404 }
        );
      }

      if (order.items.length === 0) {
        console.error(`Product ${productId} not found in order ${orderId}`);
        return NextResponse.json(
          { error: "Product not found in this order" },
          { status: 400 }
        );
      }

      console.log(`Order verification passed for order: ${orderId}`);
    } catch (orderError) {
      console.error("Error verifying order:", orderError);
      return NextResponse.json(
        { error: "Failed to verify order", details: orderError instanceof Error ? orderError.message : String(orderError) },
        { status: 500 }
      );
    }

    // Check if user has already reviewed this product for this order
    try {
      // First fetch all reviews by this user for this product
      const userReviewsForProduct = await db.review.findMany({
        where: {
          userId: session.user.id,
          productId,
        },
        select: {
          id: true,
          // We can't query orderId directly, but we can select it in the result
          // The field exists in the database, just not in the Prisma client
        },
      });
      
      console.log(`Found ${userReviewsForProduct.length} reviews by user for product ${productId}`);
      
      // Check if any of these reviews have the same orderId using JavaScript
      // We can't fetch this info directly from the database due to Prisma client limitations
      
      // To work around the Prisma limitation, we need to check orderId manually in code
      // For new reviews, get the raw data from the database
      if (userReviewsForProduct.length > 0) {
        // Directly query the database using raw SQL to check if any reviews match this order
        // This bypasses the Prisma client's type checking
        const rawQuery = await db.$queryRaw`
          SELECT COUNT(*) as count 
          FROM "Review" 
          WHERE "userId" = ${session.user.id} 
          AND "productId" = ${productId} 
          AND "orderId" = ${orderId}
        `;
        
        const count = Number((rawQuery as any)[0]?.count || 0);
        console.log(`Raw SQL query found ${count} reviews for this order`);
        
        if (count > 0) {
          console.log(`User already reviewed product ${productId} for order ${orderId}`);
          return NextResponse.json(
            { error: "You have already reviewed this product for this order" },
            { status: 400 }
          );
        }
      }
    } catch (reviewCheckError) {
      console.error("Error checking existing review:", reviewCheckError);
      return NextResponse.json(
        { error: "Failed to check existing reviews", details: reviewCheckError instanceof Error ? reviewCheckError.message : String(reviewCheckError) },
        { status: 500 }
      );
    }

    // Create a new review
    try {
      // Use raw SQL to create the review since Prisma client doesn't recognize orderId
      const now = new Date();
      const reviewId = `cid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      await db.$executeRaw`
        INSERT INTO "Review" ("id", "userId", "productId", "orderId", "rating", "comment", "approved", "rejected", "createdAt", "updatedAt")
        VALUES (
          ${reviewId},
          ${session.user.id},
          ${productId},
          ${orderId},
          ${rating},
          ${comment || null},
          false,
          false,
          ${now},
          ${now}
        )
      `;
      
      console.log(`Review created successfully for product ${productId}, order ${orderId}`);
      return NextResponse.json(
        {
          message: "Review submitted successfully and pending approval"
        },
        { status: 201 }
      );
    } catch (createError) {
      console.error("Error creating review:", createError);
      return NextResponse.json(
        { error: "Failed to create review", details: createError instanceof Error ? createError.message : String(createError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error in review submission:", error);
    return NextResponse.json(
      { error: "An error occurred while submitting your review", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Only get approved reviews
    const reviews = await db.review.findMany({
      where: {
        productId,
        approved: true,
      },
      include: {
        user: {
          select: {
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // For each review, get the order information separately
    const reviewsWithOrderInfo = await Promise.all(
      reviews.map(async (review) => {
        // Get the orderId from the raw database
        const rawReview = await db.$queryRaw`
          SELECT "orderId", "createdAt" 
          FROM "Review" 
          WHERE "id" = ${review.id}
        `;
        
        const orderId = (rawReview as any)[0]?.orderId;
        
        // If we have an orderId, get the order info
        let orderInfo = null;
        if (orderId) {
          const order = await db.order.findUnique({
            where: { id: orderId },
            select: { 
              id: true,
              createdAt: true 
            },
          });
          
          if (order) {
            orderInfo = order;
          }
        }
        
        return {
          ...review,
          orderId,
          order: orderInfo,
        };
      })
    );

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    return NextResponse.json({
      reviews: reviewsWithOrderInfo,
      averageRating,
      totalReviews: reviews.length,
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching reviews" },
      { status: 500 }
    );
  }
} 