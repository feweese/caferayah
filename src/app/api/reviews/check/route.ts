import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { hasReviewed: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get productId and orderId from query parameters
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const productId = searchParams.get("productId");
    const orderId = searchParams.get("orderId");
    
    console.log("Review check request:", { productId, orderId, userId: session.user.id });

    if (!productId) {
      return NextResponse.json(
        { hasReviewed: false, message: "Product ID is required" },
        { status: 400 }
      );
    }

    // For backward compatibility, allow checking without orderId (only check by product)
    const whereCondition: any = {
      productId,
      userId: session.user.id,
    };
    
    // Check if the user has already reviewed this product (for this order if specified)
    try {
      if (orderId) {
        console.log(`Checking review for specific order: ${orderId}`);
        
        // Use raw SQL to check for reviews with the specific orderId
        const rawQuery = await db.$queryRaw`
          SELECT id, "approved", "rejected"
          FROM "Review" 
          WHERE "userId" = ${session.user.id} 
          AND "productId" = ${productId} 
          AND "orderId" = ${orderId}
          LIMIT 1
        `;
        
        const existingOrderReview = (rawQuery as any)[0];
        
        console.log(`Review check result: hasReviewed=${!!existingOrderReview}`);
        
        // Return whether the user has already reviewed this product/order
        return NextResponse.json({
          hasReviewed: !!existingOrderReview,
          reviewStatus: existingOrderReview ? 
            (existingOrderReview.approved ? "APPROVED" : 
             existingOrderReview.rejected ? "REJECTED" : "PENDING") : null,
          reviewId: existingOrderReview ? existingOrderReview.id : null
        });
      } else {
        console.log("No orderId provided, checking any review for this product");
        
        // For backward compatibility, use Prisma to check any review for this product
        const existingReview = await db.review.findFirst({
          where: whereCondition,
          select: {
            id: true,
            approved: true,
            rejected: true
          }
        });
        
        const hasReviewed = !!existingReview;
        console.log(`Review check result: hasReviewed=${hasReviewed}`);
        
        // Return whether the user has already reviewed this product
        return NextResponse.json({
          hasReviewed,
          reviewStatus: existingReview ? 
            (existingReview.approved ? "APPROVED" : 
             existingReview.rejected ? "REJECTED" : "PENDING") : null,
          reviewId: existingReview ? existingReview.id : null
        });
      }
    } catch (dbError) {
      console.error("Database error checking review:", dbError);
      return NextResponse.json(
        { 
          hasReviewed: false, 
          message: "Error checking review status", 
          error: dbError instanceof Error ? dbError.message : String(dbError)
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error checking review status:", error);
    return NextResponse.json(
      { 
        hasReviewed: false, 
        message: "Error checking review status", 
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 