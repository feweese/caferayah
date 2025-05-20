'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { OrderStatus } from "@/generated/prisma";
import { revalidatePath } from "next/cache";

export async function confirmOrderReceived(orderId: string) {
  try {
    console.log("Server action: confirmOrderReceived", { orderId });
    
    // Get current user from session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log("No authenticated user found");
      return { success: false, message: "You must be logged in" };
    }
    
    console.log("User authenticated:", session.user.id);
    
    // Find the order and check if it belongs to the user
    const order = await db.order.findUnique({
      where: {
        id: orderId,
        userId: session.user.id
      }
    });
    
    if (!order) {
      console.log("Order not found or doesn't belong to user");
      return { success: false, message: "Order not found" };
    }
    
    console.log("Found order:", order.id, "with status:", order.status);
    
    // Update the order status
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: { 
        status: "COMPLETED" as OrderStatus,
        completedAt: new Date()
      }
    });
    
    console.log("Order updated successfully");
    
    // Revalidate the orders page to reflect the changes
    revalidatePath('/orders');
    
    return { 
      success: true, 
      message: "Order marked as completed",
      order: updatedOrder
    };
  } catch (error) {
    console.error("Error in confirmOrderReceived:", error);
    return { 
      success: false, 
      message: "Failed to update order" 
    };
  }
}

export async function cancelOrder(orderId: string) {
  try {
    console.log("Server action: cancelOrder", { orderId });
    
    // Get current user from session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log("No authenticated user found");
      return { success: false, message: "You must be logged in" };
    }
    
    console.log("User authenticated:", session.user.id);
    
    // Find the order and check if it belongs to the user
    const order = await db.order.findUnique({
      where: {
        id: orderId,
        userId: session.user.id
      }
    });
    
    if (!order) {
      console.log("Order not found or doesn't belong to user");
      return { success: false, message: "Order not found" };
    }
    
    console.log("Found order:", order.id, "with status:", order.status);
    
    // Only allow cancellation for RECEIVED orders
    if (order.status !== "RECEIVED") {
      console.log("Cannot cancel order with status:", order.status);
      return { 
        success: false, 
        message: "Only orders in 'Received' status can be cancelled" 
      };
    }
    
    // Update the order status
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" as OrderStatus }
    });
    
    console.log("Order cancelled successfully");
    
    // Revalidate the orders page to reflect the changes
    revalidatePath('/orders');
    
    return { 
      success: true, 
      message: "Order cancelled successfully",
      order: updatedOrder
    };
  } catch (error) {
    console.error("Error in cancelOrder:", error);
    return { 
      success: false, 
      message: "Failed to cancel order" 
    };
  }
} 