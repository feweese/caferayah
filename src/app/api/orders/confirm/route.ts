import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { createOrderStatusNotification, createLoyaltyPointsNotification } from "@/lib/notifications";

const confirmOrderSchema = z.object({
  orderId: z.string(),
});

// Confirmation endpoint for orders marked as out_for_delivery
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "You must be logged in to confirm an order" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = confirmOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { orderId } = validation.data;

    // Find the order and verify ownership
    const order = await db.order.findUnique({
      where: {
        id: orderId,
        userId: session.user.id,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found or you don't have permission to update it" },
        { status: 404 }
      );
    }

    // Update order status to COMPLETED (assuming from PROCESSING)
    const updatedOrder = await db.order.update({
      where: {
        id: orderId,
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        statusHistory: {
          create: {
            status: "COMPLETED",
          }
        }
      },
    });

    // Create a notification for the user
    await db.notification.create({
      data: {
        userId: session.user.id,
        type: "ORDER_STATUS",
        title: "Order Completed",
        message: `Your order #${orderId.slice(0, 8)} has been marked as completed.`,
        link: `/orders/${orderId}`,
      },
    });

    // Award loyalty points if order is completed and points are to be earned
    if (order.pointsEarned > 0) {
      // Begin transaction to ensure data consistency
      await db.$transaction(async (tx) => {
        // Check if points were already awarded for this order
        const pointHistoryExists = await tx.pointsHistory.findFirst({
          where: {
            userId: session.user.id,
            orderId: orderId,
            action: "EARNED"
          }
        });

        // Only award points if not already awarded
        if (!pointHistoryExists) {
          // Update loyalty points
          await tx.loyaltyPoints.upsert({
            where: { userId: session.user.id },
            update: { points: { increment: order.pointsEarned } },
            create: { userId: session.user.id, points: order.pointsEarned },
          });
          
          // Record points earned in history
          await tx.pointsHistory.create({
            data: {
              userId: session.user.id,
              action: "EARNED",
              points: order.pointsEarned,
              orderId: orderId,
            },
          });

          // Create notification for the user about the earned points
          await createLoyaltyPointsNotification(
            session.user.id,
            order.pointsEarned,
            'earned',
            orderId
          );
        }
      });
    }

    return NextResponse.json({
      message: "Order confirmed successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Error confirming order:", error);
    return NextResponse.json(
      { error: "An error occurred while confirming your order" },
      { status: 500 }
    );
  }
} 