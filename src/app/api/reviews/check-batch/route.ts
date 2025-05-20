import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Get the user session
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    // Extract all productId query parameters
    const url = new URL(request.url);
    const productIds = url.searchParams.getAll('productId');
    
    // Check if we need to filter by orderId as well
    const orderId = url.searchParams.get('orderId');
    console.log(`Batch review check request for ${productIds.length} products${orderId ? ` in order ${orderId}` : ''}`);
    
    if (!productIds.length) {
      return NextResponse.json(
        { error: "At least one productId query parameter is required" },
        { status: 400 }
      );
    }
    
    // Find the user by email
    const user = await db.user.findUnique({
      where: {
        email: session.user.email as string,
      },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    // Build the query where clause
    const whereClause: any = {
      userId: user.id,
      productId: {
        in: productIds,
      },
    };
    
    // Find all reviews by the user for these products
    let reviews = [];

    if (orderId) {
      console.log(`Fetching reviews with raw query for orderId: ${orderId}`);
      
      // Use raw SQL to get reviews with the specific orderId
      reviews = await db.$queryRaw`
        SELECT "productId", "orderId" 
        FROM "Review" 
        WHERE "userId" = ${user.id} 
        AND "productId" IN (${productIds.join(',')})
        AND "orderId" = ${orderId}
      `;
    } else {
      // Use Prisma query when we don't need to filter by orderId
      reviews = await db.review.findMany({
        where: whereClause,
        select: {
          productId: true,
        },
      });
      
      // Then use raw SQL to get the orderIds separately
      const reviewsWithOrderIds = await Promise.all(
        reviews.map(async (review) => {
          const rawReview = await db.$queryRaw`
            SELECT "orderId" 
            FROM "Review" 
            WHERE "userId" = ${user.id} 
            AND "productId" = ${review.productId}
          `;
          
          return {
            ...review,
            orderId: (rawReview as any)[0]?.orderId || null
          };
        })
      );
      
      reviews = reviewsWithOrderIds;
    }
    
    console.log(`Found ${reviews.length} existing reviews matching criteria`);
    
    // Create a map of product IDs to review status
    const reviewStatusMap: Record<string, boolean> = {};
    
    // Initialize all requested product IDs to false (not reviewed)
    productIds.forEach(id => {
      reviewStatusMap[id] = false;
    });
    
    // Set to true for products that have been reviewed
    reviews.forEach(review => {
      if (review.productId) {
        reviewStatusMap[review.productId] = true;
      }
    });
    
    return NextResponse.json({ 
      reviewStatusMap,
      orderId: orderId || null,
      reviewCount: reviews.length
    });
  } catch (error) {
    console.error("Error checking batch review status:", error);
    return NextResponse.json(
      { error: "Failed to check review status", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 