import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { OrderStatus } from "@/generated/prisma";
import { createOrderStatusNotification, createLoyaltyPointsNotification } from "@/lib/notifications";

// Update order status by customer
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the order ID from URL params
    const orderId = params.id;
    
    // Parse request body
    const body = await req.json();
    const { status } = body;
    
    if (!status || (status !== "CANCELLED" && status !== "COMPLETED")) {
      return NextResponse.json(
        { message: "Invalid status. Must be CANCELLED or COMPLETED" },
        { status: 400 }
      );
    }

    // Check if order exists and belongs to user
    const existingOrder = await db.order.findUnique({
      where: {
        id: orderId,
        userId: session.user.id, // Ensure the order belongs to this user
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { message: "Order not found or you don't have permission to update it" },
        { status: 404 }
      );
    }

    // Update order status
    const updatedOrder = await db.order.update({
      where: {
        id: orderId,
      },
      data: {
        status: status as OrderStatus,
        // If updating to completed status, store the timestamp
        ...(status === "COMPLETED" && {
          completedAt: new Date(),
        }),
        // If updating to cancelled status, store the timestamp
        ...(status === "CANCELLED" && {
          cancelledAt: new Date(),
        }),
        // Create a status history entry
        statusHistory: {
          create: {
            status: status as OrderStatus,
          }
        }
      },
    });

    // If marking as completed, award loyalty points
    if (status === "COMPLETED" && existingOrder.pointsEarned > 0) {
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
            update: { points: { increment: existingOrder.pointsEarned } },
            create: { userId: session.user.id, points: existingOrder.pointsEarned },
          });
          
          // Record points earned in history
          await tx.pointsHistory.create({
            data: {
              userId: session.user.id,
              action: "EARNED",
              points: existingOrder.pointsEarned,
              orderId: orderId,
            },
          });

          // Create notification for the user about the earned points
          await createLoyaltyPointsNotification(
            session.user.id,
            existingOrder.pointsEarned,
            'earned',
            orderId
          );
        }
      });
    }

    return NextResponse.json({
      message: `Order ${status === "CANCELLED" ? "cancelled" : "marked as completed"} successfully`,
      order: updatedOrder
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { message: "Failed to update order status" },
      { status: 500 }
    );
  }
} 