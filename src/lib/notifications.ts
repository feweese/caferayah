import { db } from "@/lib/db";
import { NotificationType, OrderStatus } from "@/generated/prisma";
import { emitNotificationToUser, emitNotificationToBulk } from "./socket-emitter";

/**
 * Creates an order status notification for a user
 */
export async function createOrderStatusNotification(
  userId: string,
  orderId: string,
  status: OrderStatus
) {
  try {
    // Get a small part of the order ID for display
    const orderIdShort = orderId.substring(0, 8);
    
    let title = "";
    let message = "";
    
    switch (status) {
      case "RECEIVED":
        title = "Order Received";
        message = `Your order #${orderIdShort} has been successfully received. We'll begin preparing it shortly.`;
        break;
      case "PREPARING":
        title = "Order Being Prepared";
        message = `Your order #${orderIdShort} is now being prepared.`;
        break;
      case "OUT_FOR_DELIVERY":
        title = "Order Out for Delivery";
        message = `Your order #${orderIdShort} is on its way to you!`;
        break;
      case "READY_FOR_PICKUP":
        title = "Order Ready for Pickup";
        message = `Your order #${orderIdShort} is ready for pickup.`;
        break;
      case "DELIVERED":
        title = "Order Delivered";
        message = `Your order #${orderIdShort} has been delivered. Enjoy!`;
        break;
      case "COMPLETED":
        title = "Order Completed";
        message = `Your order #${orderIdShort} has been completed. We hope you enjoyed it!`;
        break;
      case "CANCELLED":
        title = "Order Cancelled";
        message = `Your order #${orderIdShort} has been cancelled.`;
        break;
      default:
        title = "Order Update";
        message = `Your order #${orderIdShort} has been updated.`;
    }
    
    // For ready-for-pickup notifications, make sure the URL is correct
    const link = `/orders/${orderId}`;
    
    console.log(`Creating notification for ${status} order ${orderId} with link: ${link}`);
    
    // Create notification in database
    const notification = await db.notification.create({
      data: {
        userId,
        type: "ORDER_STATUS",
        title,
        message,
        read: false,
        link,
      },
    });
    
    // Emit real-time notification via WebSocket
    emitNotificationToUser(userId, notification);
    
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    // Don't throw error to avoid breaking main flow
    return null;
  }
}

/**
 * Creates a notification for an admin when a new order is received
 */
export async function createNewOrderNotification(
  adminId: string,
  orderId: string
) {
  try {
    // Get a small part of the order ID for display
    const orderIdShort = orderId.substring(0, 8);
    
    // Get order info to include customer name
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { name: true } } }
    });
    
    const customerName = order?.user?.name || "a customer";
    
    // Create notification for admin
    const notification = await db.notification.create({
      data: {
        userId: adminId,
        type: "NEW_ORDER",
        title: "New Order Received",
        message: `New order #${orderIdShort} received from ${customerName}.`,
        read: false,
        link: `/admin/orders/${orderId}`,
      },
    });
    
    // Emit real-time notification via WebSocket
    emitNotificationToUser(adminId, notification);
    
    return notification;
  } catch (error) {
    console.error("Error creating admin notification:", error);
    // Don't throw error to avoid breaking main flow
    return null;
  }
}

/**
 * Creates a notification for payment verification
 */
export async function createPaymentVerificationNotification(
  adminId: string,
  orderId: string,
  type: "NEW_PAYMENT" | "VERIFIED" | "REJECTED"
) {
  try {
    // Get a small part of the order ID for display
    const orderIdShort = orderId.substring(0, 8);
    
    // Get order info to include customer name
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { name: true } } }
    });
    
    const customerName = order?.user?.name || "a customer";
    
    let title = "";
    let message = "";
    
    switch (type) {
      case "NEW_PAYMENT":
        title = "GCash Payment Verification Needed";
        message = `New GCash payment from ${customerName} for order #${orderIdShort} needs verification.`;
        break;
      case "VERIFIED":
        title = "Payment Verified";
        message = `GCash payment for order #${orderIdShort} has been verified.`;
        break;
      case "REJECTED":
        title = "Payment Rejected";
        message = `GCash payment for order #${orderIdShort} has been rejected.`;
        break;
      default:
        title = "Payment Status Update";
        message = `Payment status updated for order #${orderIdShort}.`;
    }
    
    // Create notification in database
    const notification = await db.notification.create({
      data: {
        userId: adminId,
        type: "PAYMENT_VERIFICATION",
        title,
        message,
        read: false,
        link: `/admin/orders/${orderId}`,
      },
    });
    
    // Emit real-time notification via WebSocket
    emitNotificationToUser(adminId, notification);
    
    return notification;
  } catch (error) {
    console.error("Error creating payment verification notification:", error);
    // Don't throw error to avoid breaking main flow
    return null;
  }
}

/**
 * Creates a notification for customer about payment verification result
 */
export async function createPaymentStatusNotification(
  userId: string,
  orderId: string,
  status: "VERIFIED" | "REJECTED",
  rejectionReason?: string
) {
  try {
    // Get a small part of the order ID for display
    const orderIdShort = orderId.substring(0, 8);
    
    let title = "";
    let message = "";
    
    if (status === "VERIFIED") {
      title = "Payment Verified";
      message = `Your GCash payment for order #${orderIdShort} has been verified. Your order is now being processed.`;
    } else {
      title = "Payment Rejected";
      message = `Your GCash payment for order #${orderIdShort} has been rejected. ${rejectionReason || 'Please check your payment details and try again.'}`;
    }
    
    // Create notification in database
    const notification = await db.notification.create({
      data: {
        userId,
        type: "PAYMENT_VERIFICATION",
        title,
        message,
        read: false,
        link: `/orders/${orderId}`,
      },
    });
    
    // Emit real-time notification via WebSocket
    emitNotificationToUser(userId, notification);
    
    return notification;
  } catch (error) {
    console.error("Error creating payment status notification:", error);
    // Don't throw error to avoid breaking main flow
    return null;
  }
}

/**
 * Creates a notification for loyalty points events
 */
export async function createLoyaltyPointsNotification(
  userId: string,
  points: number,
  action: 'earned' | 'redeemed' | 'expired' | 'milestone' | 'refunded',
  orderId?: string,
  currentTotal?: number
) {
  try {
    let title = "";
    let message = "";
    let link = "/profile";
    
    switch (action) {
      case 'earned':
        title = "Points Earned";
        message = `You earned ${points} loyalty points${orderId ? ' from your order' : ''}.`;
        link = orderId ? `/orders/${orderId}` : "/profile";
        break;
        
      case 'redeemed':
        title = "Points Redeemed";
        message = `You redeemed ${points} loyalty points${orderId ? ' for your order' : ''}.`;
        link = orderId ? `/orders/${orderId}` : "/profile";
        break;
      
      case 'expired':
        title = "Points Expired";
        message = `${points} of your loyalty points have expired.`;
        break;
        
      case 'milestone':
        title = "Loyalty Milestone Reached";
        message = `Congratulations! You now have a total of ${currentTotal} loyalty points.`;
        break;
      
      case 'refunded':
        title = "Points Refunded";
        message = `${points} loyalty points have been refunded to your account due to order cancellation.`;
        link = orderId ? `/orders/${orderId}` : "/profile";
        break;
      
      default:
        title = "Loyalty Points Update";
        message = `Your loyalty points have been updated.`;
    }
    
    // Create notification in database
    const notification = await db.notification.create({
      data: {
        userId,
        type: "LOYALTY_POINTS",
        title,
        message,
        read: false,
        link,
      },
    });
    
    // Emit real-time notification via WebSocket
    emitNotificationToUser(userId, notification);
    
    return notification;
  } catch (error) {
    console.error("Error creating loyalty points notification:", error);
    // Don't throw error to avoid breaking main flow
    return null;
  }
} 