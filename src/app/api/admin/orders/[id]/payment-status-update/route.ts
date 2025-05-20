import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createPaymentStatusNotification, createOrderStatusNotification } from "@/lib/notifications";

// Handle payment status update requests
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check if the user is authenticated and is an admin
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const orderId = params.id;
    const { status } = await req.json();

    // Validate status parameter
    if (!status || !["VERIFIED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { message: "Invalid payment status. Must be VERIFIED or REJECTED." },
        { status: 400 }
      );
    }

    // Get the order to verify it exists and is a GCash payment
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { id: true }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { message: "Order not found" },
        { status: 404 }
      );
    }

    if (order.paymentMethod !== "GCASH") {
      return NextResponse.json(
        { message: "This order is not a GCash payment" },
        { status: 400 }
      );
    }

    // Update the payment status in the database
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: { 
        paymentStatus: status 
      },
    });

    // Create a notification for the customer about payment status
    await createPaymentStatusNotification(
      order.userId,
      orderId,
      status as "VERIFIED" | "REJECTED"
    );

    // If payment is rejected, cancel the order
    if (status === "REJECTED") {
      // Get current date for cancellation timestamp
      const now = new Date();
      
      // Update order status to CANCELLED
      await db.order.update({
        where: { id: orderId },
        data: { 
          status: "CANCELLED",
          cancelledAt: now,
        },
      });

      // Add entry to status history
      await db.orderStatusHistory.create({
        data: {
          orderId,
          status: "CANCELLED",
          createdAt: now,
        }
      });

      // Create order cancellation notification
      await createOrderStatusNotification(
        order.userId, 
        orderId,
        "CANCELLED"
      );

      // Refund any loyalty points that were used
      if (order.pointsUsed > 0) {
        await db.user.update({
          where: { id: order.userId },
          data: {
            loyaltyPoints: {
              increment: order.pointsUsed
            }
          }
        });
      }
      
      // Return success response with cancellation info
      return NextResponse.json({ 
        message: "Payment rejected and order cancelled successfully", 
        order: {
          ...updatedOrder,
          status: "CANCELLED"
        }
      });
    }
    
    // If payment is verified and order is still in RECEIVED status, 
    // automatically move it to PREPARING
    if (status === "VERIFIED" && order.status === "RECEIVED") {
      const now = new Date();
      
      // Update order status to PREPARING
      await db.order.update({
        where: { id: orderId },
        data: { 
          status: "PREPARING",
        },
      });
      
      // Add entry to status history
      await db.orderStatusHistory.create({
        data: {
          orderId,
          status: "PREPARING",
          createdAt: now,
        }
      });
      
      // Create order status update notification
      await createOrderStatusNotification(
        order.userId, 
        orderId,
        "PREPARING"
      );
      
      // Return success response with updated status info
      return NextResponse.json({ 
        message: "Payment verified and order status updated to Preparing", 
        order: {
          ...updatedOrder,
          status: "PREPARING"
        }
      });
    }

    // Return success response for verification without status change
    return NextResponse.json({ 
      message: `Payment ${status.toLowerCase()} successfully`, 
      order: updatedOrder 
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    return NextResponse.json(
      { message: "Something went wrong", detail: (error as Error).message },
      { status: 500 }
    );
  }
} 