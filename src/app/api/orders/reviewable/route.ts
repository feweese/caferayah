import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { orders: [], message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get productId from query parameter
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { orders: [], message: "Product ID is required" },
        { status: 400 }
      );
    }

    // Find all completed orders containing this product
    const orders = await db.order.findMany({
      where: {
        userId: session.user.id,
        status: "COMPLETED",
        items: {
          some: {
            productId: productId,
          },
        },
      },
      select: {
        id: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // For each order, check if it already has a review for this product using raw SQL
    const reviewPromises = orders.map(async (order) => {
      // Use raw SQL to check if a review exists for this order and product
      const rawQuery = await db.$queryRaw`
        SELECT COUNT(*) as count 
        FROM "Review" 
        WHERE "userId" = ${session.user.id} 
        AND "productId" = ${productId}
        AND "orderId" = ${order.id}
      `;
      
      const count = Number((rawQuery as any)[0]?.count || 0);
      
      return {
        ...order,
        hasReview: count > 0,
      };
    });

    const ordersWithReviewStatus = await Promise.all(reviewPromises);
    
    // Filter out orders that already have reviews
    const reviewableOrders = ordersWithReviewStatus
      .filter(order => !order.hasReview)
      .map(({ id, createdAt }) => ({ id, createdAt }));

    return NextResponse.json({
      orders: reviewableOrders,
    });
  } catch (error) {
    console.error("Error fetching reviewable orders:", error);
    return NextResponse.json(
      { 
        orders: [], 
        message: "Error fetching reviewable orders", 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
} 