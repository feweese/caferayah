import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const cancelSchema = z.object({
  orderId: z.string(),
});

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { orderId } = cancelSchema.parse(body);
    
    // Get the order to check if it can be cancelled and to get points info
    const order = await db.order.findUnique({
      where: {
        id: orderId,
      },
    });
    
    if (!order) {
      return NextResponse.json(
        { message: "Order not found" },
        { status: 404 }
      );
    }
    
    // Only allow cancellation if user owns the order (or is admin) and order is in RECEIVED status
    const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
    
    if (!isAdmin && order.userId !== session.user.id) {
      return NextResponse.json(
        { message: "You don't have permission to cancel this order" },
        { status: 403 }
      );
    }
    
    if (order.status !== "RECEIVED") {
      return NextResponse.json(
        { message: "Only orders in RECEIVED status can be cancelled" },
        { status: 400 }
      );
    }
    
    // Execute the cancellation with loyalty points handling as a transaction
    return await db.$transaction(async (tx) => {
      // 1. Update the order status to CANCELLED
      const updatedOrder = await tx.order.update({
        where: {
          id: orderId,
        },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          // Add a status history entry
          statusHistory: {
            create: {
              status: "CANCELLED",
            }
          }
        },
      });
      
      // 2. Handle loyalty points
      
      // A. Check if points were actually earned and awarded for this order
      if (order.pointsEarned > 0) {
        // First check if points were actually awarded by looking for an EARNED record
        const pointsEarnedRecord = await tx.pointsHistory.findFirst({
          where: {
            userId: order.userId,
            orderId: orderId,
            action: "EARNED"
          }
        });
        
        // Only deduct points if they were actually awarded
        if (pointsEarnedRecord) {
          // Get the loyalty points record
          const loyaltyPoints = await tx.loyaltyPoints.findUnique({
            where: {
              userId: order.userId,
            },
          });
          
          if (loyaltyPoints) {
            // Deduct the earned points (ensure we don't go below 0)
            await tx.loyaltyPoints.update({
              where: {
                userId: order.userId,
              },
              data: {
                points: {
                  decrement: Math.min(loyaltyPoints.points, order.pointsEarned),
                },
              },
            });
            
            // Record the refund in history
            await tx.pointsHistory.create({
              data: {
                userId: order.userId,
                action: "REFUNDED",
                points: order.pointsEarned,
                orderId: orderId,
              },
            });
          }
        }
      }
      
      // B. If points were used (redeemed) for this order, refund them
      if (order.pointsUsed > 0) {
        // Check if loyalty points record exists
        let loyaltyPoints = await tx.loyaltyPoints.findUnique({
          where: {
            userId: order.userId,
          },
        });
        
        if (loyaltyPoints) {
          // Return the points
          await tx.loyaltyPoints.update({
            where: {
              userId: order.userId,
            },
            data: {
              points: {
                increment: order.pointsUsed,
              },
            },
          });
        } else {
          // Create a loyalty points record if it doesn't exist
          loyaltyPoints = await tx.loyaltyPoints.create({
            data: {
              userId: order.userId,
              points: order.pointsUsed,
            },
          });
        }
        
        // Record the refund in history
        await tx.pointsHistory.create({
          data: {
            userId: order.userId,
            action: "REFUNDED",
            points: order.pointsUsed,
            orderId: orderId,
          },
        });
      }
      
      // 3. Create a notification for the user
      await tx.notification.create({
        data: {
          userId: order.userId,
          type: "ORDER_STATUS",
          title: "Order Cancelled",
          message: `Your order #${order.id.slice(-6)} has been cancelled.`,
          read: false,
          link: `/orders/${order.id}`,
        },
      });
      
      // If cancelled by admin, create admin notification
      if (isAdmin && order.userId !== session.user.id) {
        // Notify admins about the cancellation
        const admins = await tx.user.findMany({
          where: {
            OR: [
              { role: "ADMIN" },
              { role: "SUPER_ADMIN" },
            ],
          },
          select: {
            id: true,
          },
        });
        
        // Notify each admin except the one who cancelled
        for (const admin of admins) {
          if (admin.id !== session.user.id) {
            await tx.notification.create({
              data: {
                userId: admin.id,
                type: "ORDER_STATUS",
                title: "Order Cancelled by Admin",
                message: `Order #${order.id.slice(-6)} has been cancelled by ${session.user.name || "an admin"}.`,
                read: false,
                link: `/admin/orders/${order.id}`,
              },
            });
          }
        }
      }
      
      return NextResponse.json({
        success: true,
        message: "Order cancelled successfully",
        orderId: order.id,
        pointsRefunded: order.pointsUsed > 0 ? order.pointsUsed : null,
      });
    });
  } catch (error) {
    console.error("Order cancellation error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid input data", errors: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: "Failed to cancel order. Please try again." },
      { status: 500 }
    );
  }
} 