import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Endpoint to specifically fix "Ready for pickup" notifications
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get ready-for-pickup notifications for this user
    const readyNotifications = await db.notification.findMany({
      where: {
        userId: session.user.id,
        title: "Order Ready for Pickup"
      }
    });
    
    console.log(`Found ${readyNotifications.length} "Ready for pickup" notifications`);
    
    const fixResults = [];
    
    // Process each notification
    for (const notification of readyNotifications) {
      console.log(`\nProcessing notification: ${notification.id}`);
      console.log(`Message: ${notification.message}`);
      console.log(`Current link: ${notification.link}`);
      
      // Extract order ID short hash from message (format: Your order #XXXXXXXX is ready for pickup)
      const shortIdMatch = notification.message.match(/#([a-z0-9]+)/i);
      if (!shortIdMatch || !shortIdMatch[1]) {
        console.log(`Could not extract short ID from message`);
        fixResults.push({
          id: notification.id,
          status: "error",
          error: "Could not extract order ID from message"
        });
        continue;
      }
      
      const shortId = shortIdMatch[1];
      console.log(`Extracted short ID: ${shortId}`);
      
      // Find all orders for this user
      const orders = await db.order.findMany({
        where: {
          userId: session.user.id,
          status: "READY_FOR_PICKUP" // Try to find orders with this status first
        }
      });
      
      // Try to find an order that matches this short ID
      let matchingOrder = orders.find(order => order.id.startsWith(shortId));
      
      if (!matchingOrder) {
        // If not found with READY_FOR_PICKUP status, try with any status
        const allOrders = await db.order.findMany({
          where: {
            userId: session.user.id
          }
        });
        
        matchingOrder = allOrders.find(order => order.id.startsWith(shortId));
      }
      
      if (!matchingOrder) {
        console.log(`Could not find any order matching short ID: ${shortId}`);
        fixResults.push({
          id: notification.id,
          status: "failed",
          error: `No matching order for ${shortId}`
        });
        continue;
      }
      
      console.log(`Found matching order: ${matchingOrder.id}`);
      
      // Create correct link
      const correctLink = `/orders/${matchingOrder.id}`;
      
      // Check if link needs updating
      if (notification.link === correctLink) {
        console.log(`Link is already correct`);
        fixResults.push({
          id: notification.id,
          status: "ok",
          message: "Link already correct"
        });
      } else {
        // Update the link
        await db.notification.update({
          where: { id: notification.id },
          data: { link: correctLink }
        });
        
        console.log(`Updated link from "${notification.link}" to "${correctLink}"`);
        fixResults.push({
          id: notification.id,
          status: "fixed",
          oldLink: notification.link,
          newLink: correctLink
        });
      }
    }
    
    // Create a test notification for immediate testing
    let testNotification = null;
    try {
      // Find the most recent READY_FOR_PICKUP order
      const recentOrder = await db.order.findFirst({
        where: {
          userId: session.user.id,
          status: "READY_FOR_PICKUP"
        },
        orderBy: {
          createdAt: "desc"
        }
      });
      
      if (recentOrder) {
        // Create a test notification with the correct link
        testNotification = await db.notification.create({
          data: {
            userId: session.user.id,
            type: "ORDER_STATUS",
            title: "Test Ready for Pickup",
            message: `Your order #${recentOrder.id.substring(0, 8)} is ready for pickup (test).`,
            read: false,
            link: `/orders/${recentOrder.id}`  // Use full order ID in link
          }
        });
        
        console.log(`Created test notification with correct link: /orders/${recentOrder.id}`);
      }
    } catch (err) {
      console.error("Error creating test notification:", err);
    }
    
    return NextResponse.json({
      message: "Ready for pickup notifications fix completed",
      processed: readyNotifications.length,
      results: fixResults,
      testNotification
    });
  } catch (error) {
    console.error("Error fixing ready-for-pickup notifications:", error);
    return NextResponse.json(
      { message: "Error fixing notifications", error: error.message },
      { status: 500 }
    );
  }
} 