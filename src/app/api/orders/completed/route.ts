import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { canReview: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get parameters from query
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const productId = url.searchParams.get("productId");
    const orderId = url.searchParams.get("orderId");
    
    console.log("Review eligibility check:", { productId, orderId, userId: session.user.id });

    if (!productId) {
      return NextResponse.json(
        { canReview: false, message: "Product ID is required" },
        { status: 400 }
      );
    }

    // Build the query based on whether orderId is provided
    const whereCondition: any = {
      userId: session.user.id,
      status: "COMPLETED", // Only completed orders
      items: {
        some: {
          productId: productId, // Must include the product being reviewed
        }
      }
    };

    // If orderId is provided, add it to the query
    if (orderId) {
      whereCondition.id = orderId;
    }
    
    console.log("Order query condition:", JSON.stringify(whereCondition));

    // Check if the user has completed orders with this product
    try {
      const completedOrders = await db.order.findMany({
        where: whereCondition
      });
      
      console.log(`Found ${completedOrders.length} completed orders matching criteria`);
      
      return NextResponse.json({
        canReview: completedOrders.length > 0,
        completedOrders: completedOrders.length,
        orderId: orderId || null
      });
    } catch (dbError) {
      console.error("Database error checking orders:", dbError);
      return NextResponse.json(
        { 
          canReview: false, 
          message: "Error querying orders", 
          error: dbError instanceof Error ? dbError.message : String(dbError) 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error checking completed orders:", error);
    return NextResponse.json(
      { 
        canReview: false, 
        message: "Error checking orders", 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
} 