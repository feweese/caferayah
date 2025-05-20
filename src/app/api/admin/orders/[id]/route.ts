import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { OrderStatus } from "@/generated/prisma";
import { createOrderStatusNotification, createLoyaltyPointsNotification } from "@/lib/notifications";

// Validate the request body
const updateOrderSchema = z.object({
  status: z.enum([
    "RECEIVED",
    "PREPARING",
    "OUT_FOR_DELIVERY",
    "READY_FOR_PICKUP",
    "COMPLETED",
    "CANCELLED",
  ]),
});

// Define valid statuses for each delivery method
const validStatusesByDeliveryMethod = {
  DELIVERY: ["RECEIVED", "PREPARING", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"],
  PICKUP: ["RECEIVED", "PREPARING", "READY_FOR_PICKUP", "COMPLETED", "CANCELLED"],
};

// Define valid status transitions to enforce sequential workflow
const validStatusTransitions = {
  RECEIVED: ["PREPARING", "CANCELLED"],
  PREPARING: ["OUT_FOR_DELIVERY", "READY_FOR_PICKUP", "CANCELLED"],
  OUT_FOR_DELIVERY: ["COMPLETED", "CANCELLED"],
  READY_FOR_PICKUP: ["COMPLETED", "CANCELLED"],
  COMPLETED: [], // Cannot transition from completed
  CANCELLED: [], // Cannot transition from cancelled
};

// Get a single order by ID
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Safely access params
    const unwrappedParams = await params;
    const orderId = unwrappedParams.id;

    const order = await db.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            address: true,
          },
        },
        items: {
          include: {
            product: true,
            addons: true,
          },
        },
        statusHistory: {
          select: {
            status: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { message: "Order not found" },
        { status: 404 }
      );
    }

    // For GET requests, include valid next statuses to help the frontend
    const validNextStatuses = validStatusTransitions[order.status as keyof typeof validStatusTransitions] || [];
    
    // Filter valid next statuses by delivery method
    const validDeliveryStatuses = validStatusesByDeliveryMethod[order.deliveryMethod] || [];
    const allowedNextStatuses = validNextStatuses.filter(status => 
      validDeliveryStatuses.includes(status)
    );

    return NextResponse.json({
      ...order,
      _validNextStatuses: allowedNextStatuses
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}

// Update order status
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Safely access params
    const unwrappedParams = await params;
    const orderId = unwrappedParams.id;

    const body = await req.json();
    const { status } = updateOrderSchema.parse(body);

    // Check if order exists
    const existingOrder = await db.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        user: true,
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { message: "Order not found" },
        { status: 404 }
      );
    }

    // Prevent updating orders that are already in terminal states
    if (existingOrder.status === "COMPLETED" || existingOrder.status === "CANCELLED") {
      return NextResponse.json(
        { message: "Cannot update orders that are already completed or cancelled" },
        { status: 400 }
      );
    }

    // Check if the status is valid for the delivery method
    const validStatuses = validStatusesByDeliveryMethod[existingOrder.deliveryMethod] || [];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { 
          message: `Cannot set status to "${status}" for ${existingOrder.deliveryMethod.toLowerCase()} orders`,
          deliveryMethod: existingOrder.deliveryMethod,
          validStatuses 
        },
        { status: 400 }
      );
    }

    // NEW: Check if the status transition is valid
    const validNextStatuses = validStatusTransitions[existingOrder.status as keyof typeof validStatusTransitions] || [];
    if (!validNextStatuses.includes(status)) {
      return NextResponse.json(
        { 
          message: `Invalid status transition from "${existingOrder.status}" to "${status}". Valid next statuses are: ${validNextStatuses.join(", ")}`,
          currentStatus: existingOrder.status,
          validNextStatuses 
        },
        { status: 400 }
      );
    }

    // Update the order
    const updatedOrder = await db.order.update({
      where: {
        id: orderId,
      },
      data: {
        status: status as OrderStatus,
        // Record timestamp for COMPLETED status
        ...(status === "COMPLETED" && {
          completedAt: new Date(),
        }),
        // Record timestamp for CANCELLED status
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

    // Create notification for the user if status changed
    if (existingOrder.status !== status && existingOrder.userId) {
      await createOrderStatusNotification(
        existingOrder.userId,
        orderId,
        status as OrderStatus
      );
    }

    // Handle additional logic based on status
    if (status === "COMPLETED") {
      // Award loyalty points if order is completed and points are to be earned
      if (existingOrder.pointsEarned > 0) {
        // Begin transaction to ensure data consistency
        await db.$transaction(async (tx) => {
          // Check if points were already awarded for this order
          const pointHistoryExists = await tx.pointsHistory.findFirst({
            where: {
              userId: existingOrder.userId,
              orderId: orderId,
              action: "EARNED"
            }
          });

          // Only award points if not already awarded
          if (!pointHistoryExists) {
            // Get user's loyalty points record
            let loyaltyPoints = await tx.loyaltyPoints.findUnique({
              where: {
                userId: existingOrder.userId,
              },
            });

            // Create loyalty points record if it doesn't exist
            if (!loyaltyPoints) {
              loyaltyPoints = await tx.loyaltyPoints.create({
                data: {
                  userId: existingOrder.userId,
                  points: 0,
                },
              });
            }

            // Calculate expiration date (1 year from now)
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);

            // Update loyalty points
            await tx.loyaltyPoints.update({
              where: {
                userId: existingOrder.userId,
              },
              data: {
                points: {
                  increment: existingOrder.pointsEarned,
                },
              },
            });

            // Create points history record
            await tx.pointsHistory.create({
              data: {
                userId: existingOrder.userId,
                action: "EARNED",
                points: existingOrder.pointsEarned,
                orderId: orderId,
                expiresAt,
              },
            });

            // Create notification for the user
            await createLoyaltyPointsNotification(
              existingOrder.userId,
              existingOrder.pointsEarned,
              "EARNED"
            );
          }
        });
      }
    } else if (status === "CANCELLED") {
      // You could add refund logic here if needed
      // You could also update inventory or other related data
    }

    return NextResponse.json({
      order: updatedOrder,
      message: "Order status updated successfully",
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to update order status" },
      { status: 500 }
    );
  }
}

// Delete an order (Admin only)
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { message: "Unauthorized - Only SUPER_ADMIN can delete orders" },
        { status: 401 }
      );
    }

    // Safely access params
    const unwrappedParams = await params;
    const orderId = unwrappedParams.id;

    // First check if order exists
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

    // Delete the order and all related data (this will cascade to order items and status history)
    await db.order.delete({
      where: {
        id: orderId,
      },
    });

    return NextResponse.json({
      message: "Order deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { message: "Failed to delete order" },
      { status: 500 }
    );
  }
} 