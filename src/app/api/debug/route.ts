import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Debug endpoint to check notification data
export async function GET(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const orderId = url.searchParams.get('orderId');
  const notificationId = url.searchParams.get('notificationId');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check specific notification
    if (action === 'checkNotification' && notificationId) {
      const notification = await db.notification.findUnique({
        where: {
          id: notificationId,
          userId: session.user.id
        }
      });
      
      if (notification) {
        console.log("=== NOTIFICATION DEBUG INFO ===");
        console.log(`Notification ID: ${notification.id}`);
        console.log(`Type: ${notification.type}`);
        console.log(`Title: ${notification.title}`);
        console.log(`Message: ${notification.message}`);
        console.log(`Link: ${notification.link}`);
        console.log(`Created: ${notification.createdAt}`);
        
        // Try to extract order ID 
        if (notification.link && notification.link.includes('/orders/')) {
          const matches = notification.link.match(/\/orders\/([^\/\?]+)/);
          if (matches && matches[1]) {
            const extractedId = matches[1];
            console.log(`Extracted order ID: ${extractedId}`);
            
            // Check if this order exists
            const order = await db.order.findUnique({
              where: { id: extractedId }
            });
            
            console.log(`Order exists: ${!!order}`);
          } else {
            console.log("Could not extract order ID using regex");
            
            // Try alternate method
            const parts = notification.link.split('/orders/');
            if (parts.length >= 2) {
              console.log(`Split parts: ${parts.length}`);
              console.log(`Second part: "${parts[1]}"`);
            }
          }
        }
        
        console.log("==============================");
        
        return NextResponse.json({
          notification,
          debug: {
            hasLink: !!notification.link,
            isOrderLink: notification.link?.includes('/orders/') || false,
          }
        });
      } else {
        return NextResponse.json({ message: "Notification not found" }, { status: 404 });
      }
    }

    // Validate specific order ID
    if (action === 'validate' && orderId) {
      const order = await db.order.findUnique({
        where: {
          id: orderId,
          userId: session.user.id
        }
      });
      
      if (order) {
        console.log("Order exists:", orderId);
        return NextResponse.json({ 
          valid: true, 
          message: "Order exists", 
          order: { id: order.id } 
        });
      } else {
        console.log("Order not found:", orderId);
        return NextResponse.json({ 
          valid: false, 
          message: "Order not found" 
        }, { status: 404 });
      }
    }

    // Direct redirect to a test order if requested
    if (action === 'redirect') {
      // Get the most recent order
      const orders = await db.order.findMany({
        where: {
          userId: session.user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      });
      
      if (orders.length > 0) {
        const orderId = orders[0].id;
        console.log("Redirecting to order:", orderId);
        
        // Return redirect response
        return NextResponse.redirect(new URL(`/orders/${orderId}`, url.origin));
      } else {
        return NextResponse.json({ message: "No orders found to redirect to" });
      }
    }
    
    // Fetch last 5 notifications for debugging
    const notifications = await db.notification.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });
    
    // Print to console for server-side debugging
    console.log("Current notification data format:");
    notifications.forEach(notification => {
      console.log(`ID: ${notification.id}`);
      console.log(`Type: ${notification.type}`);
      console.log(`Title: ${notification.title}`);
      console.log(`Link: ${notification.link}`);
      console.log("-----");
    });
    
    // Get the most recent orders for creating a test notification
    const orders = await db.order.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 1,
    });
    
    let testNotification = null;
    if (orders.length > 0) {
      const orderId = orders[0].id;
      console.log("Creating test notification with order ID:", orderId);
      
      // Create a test notification with a valid order ID
      testNotification = await db.notification.create({
        data: {
          userId: session.user.id,
          type: "ORDER_STATUS",
          title: "Test Order Notification",
          message: `This is a test notification for order #${orderId.substring(0, 8)}`,
          read: false,
          link: `/orders/${orderId}`, // This should be a valid link
        },
      });
      
      console.log("Created test notification:", testNotification);
    }
    
    return NextResponse.json({
      message: "Debug data logged to server console",
      notifications,
      testNotification,
      orders: orders.length > 0 ? [{ id: orders[0].id }] : []
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { message: "Error accessing debug data" },
      { status: 500 }
    );
  }
} 