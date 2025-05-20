import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { products: [], message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all completed orders for this user
    const completedOrders = await db.order.findMany({
      where: {
        userId: session.user.id,
        status: "COMPLETED",
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
                description: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc' // Get newest orders first
      }
    });
    
    // Log the count of completed orders
    console.log(`Found ${completedOrders.length} completed orders for user ${session.user.id}`);
    
    // Get all products the user has already reviewed
    const userReviews = await db.review.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        productId: true,
        orderId: true,
      }
    });
    
    console.log(`Found ${userReviews.length} existing reviews by user ${session.user.id}`);
    
    // Create a set of already reviewed product-order pairs for quick lookup
    const reviewedProductOrderPairs = new Set(
      userReviews.map(review => `${review.productId}-${review.orderId}`)
    );
    
    // Collect all unique products from completed orders that haven't been reviewed yet
    const reviewableProducts = [];
    
    completedOrders.forEach(order => {
      order.items.forEach(item => {
        // Skip items without a product or with null product id
        if (!item.product || !item.product.id) {
          return;
        }
        
        // Generate a unique key for this product-order combination
        const productOrderKey = `${item.product.id}-${order.id}`;
        
        // Only add if not already reviewed for this order
        if (!reviewedProductOrderPairs.has(productOrderKey)) {
          // Get the first image from images array if available
          const productImage = item.product.images && item.product.images.length > 0 
            ? item.product.images[0] 
            : null;
            
          reviewableProducts.push({
            id: item.product.id,
            name: item.product.name,
            image: productImage,
            orderId: order.id,
            orderDate: order.createdAt
          });
        }
      });
    });
    
    console.log(`Found ${reviewableProducts.length} reviewable products`);
    
    return NextResponse.json({
      products: reviewableProducts
    });
  } catch (error) {
    console.error("Error fetching reviewable products:", error);
    return NextResponse.json(
      { 
        products: [],
        message: "Error fetching reviewable products", 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
} 