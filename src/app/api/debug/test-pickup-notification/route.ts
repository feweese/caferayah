import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Endpoint to create a test ready-for-pickup notification
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Find a recent order for this user
    const recentOrder = await db.order.findFirst({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    
    if (!recentOrder) {
      return NextResponse.json(
        { message: "No orders found to create a test notification" },
        { status: 404 }
      );
    }
    
    const orderId = recentOrder.id;
    const orderIdShort = orderId.substring(0, 8);
    
    // Create a new test notification
    const notification = await db.notification.create({
      data: {
        userId: session.user.id,
        type: "ORDER_STATUS",
        title: "Order Ready for Pickup",
        message: `Your order #${orderIdShort} is ready for pickup.`,
        read: false,
        link: `/orders/${orderId}` // Explicitly use the full order ID
      }
    });
    
    console.log(`Created test ready-for-pickup notification:`);
    console.log(`- ID: ${notification.id}`);
    console.log(`- Link: ${notification.link}`);
    console.log(`- Message: ${notification.message}`);
    
    return NextResponse.json({
      message: "Test notification created successfully",
      notification,
      orderInfo: {
        id: recentOrder.id,
        shortId: orderIdShort,
        link: `/orders/${orderId}`
      }
    });
  } catch (error) {
    console.error("Error creating test notification:", error);
    return NextResponse.json(
      { message: "Error creating test notification", error: error.message },
      { status: 500 }
    );
  }
} 