import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Endpoint to fix all order status notifications
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get all order-related notifications for this user
    const orderNotifications = await db.notification.findMany({
      where: {
        userId: session.user.id,
        type: "ORDER_STATUS"
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    
    console.log(`Found ${orderNotifications.length} order status notifications`);
    
    const resultsByStatus = {
      "Order Received": { checked: 0, fixed: 0, ok: 0, failed: 0 },
      "Order Being Prepared": { checked: 0, fixed: 0, ok: 0, failed: 0 },
      "Order Out for Delivery": { checked: 0, fixed: 0, ok: 0, failed: 0 },
      "Order Ready for Pickup": { checked: 0, fixed: 0, ok: 0, failed: 0 },
      "Order Delivered": { checked: 0, fixed: 0, ok: 0, failed: 0 },
      "Order Completed": { checked: 0, fixed: 0, ok: 0, failed: 0 },
      "Order Cancelled": { checked: 0, fixed: 0, ok: 0, failed: 0 },
      "Other": { checked: 0, fixed: 0, ok: 0, failed: 0 }
    };
    
    const detailedResults = [];
    
    // Get all orders for this user to reference
    const allOrders = await db.order.findMany({
      where: {
        userId: session.user.id
      }
    });
    
    console.log(`Found ${allOrders.length} orders for reference`);
    
    // Process each notification
    for (const notification of orderNotifications) {
      // Get status category or default to "Other"
      const statusCategory = resultsByStatus[notification.title] ? 
        notification.title : "Other";
      
      resultsByStatus[statusCategory].checked++;
      
      console.log(`\nProcessing ${statusCategory} notification: ${notification.id}`);
      console.log(`Message: ${notification.message}`);
      console.log(`Current link: ${notification.link}`);
      
      try {
        // Extract order ID short hash from message (format: order #XXXXXXXX)
        const shortIdMatch = notification.message.match(/#([a-z0-9]+)/i);
        if (!shortIdMatch || !shortIdMatch[1]) {
          console.log(`Could not extract short ID from message`);
          resultsByStatus[statusCategory].failed++;
          detailedResults.push({
            id: notification.id,
            title: notification.title,
            status: "failed",
            error: "Could not extract order ID from message"
          });
          continue;
        }
        
        const shortId = shortIdMatch[1];
        console.log(`Extracted short ID: ${shortId}`);
        
        // Try to find an order that matches this short ID
        const matchingOrder = allOrders.find(order => 
          order.id.startsWith(shortId)
        );
        
        if (!matchingOrder) {
          console.log(`Could not find any order matching short ID: ${shortId}`);
          resultsByStatus[statusCategory].failed++;
          detailedResults.push({
            id: notification.id,
            title: notification.title,
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
          resultsByStatus[statusCategory].ok++;
          detailedResults.push({
            id: notification.id,
            title: notification.title,
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
          resultsByStatus[statusCategory].fixed++;
          detailedResults.push({
            id: notification.id,
            title: notification.title,
            status: "fixed",
            oldLink: notification.link,
            newLink: correctLink
          });
        }
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
        resultsByStatus[statusCategory].failed++;
        detailedResults.push({
          id: notification.id,
          title: notification.title,
          status: "error",
          error: error.message
        });
      }
    }
    
    // Create test notifications for each status type
    const testNotifications = [];
    
    if (allOrders.length > 0) {
      const recentOrder = allOrders[0];
      const orderId = recentOrder.id;
      const orderIdShort = orderId.substring(0, 8);
      
      const statusTypes = [
        { title: "Order Received", message: `Your order #${orderIdShort} has been received and is being processed.` },
        { title: "Order Being Prepared", message: `Your order #${orderIdShort} is now being prepared.` },
        { title: "Order Out for Delivery", message: `Your order #${orderIdShort} is on its way to you!` },
        { title: "Order Ready for Pickup", message: `Your order #${orderIdShort} is ready for pickup.` },
        { title: "Order Delivered", message: `Your order #${orderIdShort} has been delivered. Enjoy!` },
        { title: "Order Completed", message: `Your order #${orderIdShort} has been completed. We hope you enjoyed it!` }
      ];
      
      for (const status of statusTypes) {
        try {
          const testNotification = await db.notification.create({
            data: {
              userId: session.user.id,
              type: "ORDER_STATUS",
              title: status.title + " (Test)",
              message: status.message + " (Test notification)",
              read: false,
              link: `/orders/${orderId}`
            }
          });
          
          testNotifications.push({
            id: testNotification.id,
            title: testNotification.title,
            link: testNotification.link
          });
          
          console.log(`Created test notification for ${status.title}`);
        } catch (err) {
          console.error(`Error creating test notification for ${status.title}:`, err);
        }
      }
    }
    
    // Calculate totals
    const totals = {
      checked: 0,
      fixed: 0,
      ok: 0,
      failed: 0
    };
    
    Object.values(resultsByStatus).forEach(stats => {
      totals.checked += stats.checked;
      totals.fixed += stats.fixed;
      totals.ok += stats.ok;
      totals.failed += stats.failed;
    });
    
    return NextResponse.json({
      message: "Order notifications fix completed",
      totals,
      resultsByStatus,
      details: detailedResults,
      testNotifications
    });
  } catch (error) {
    console.error("Error fixing notifications:", error);
    return NextResponse.json(
      { message: "Error fixing notifications", error: error.message },
      { status: 500 }
    );
  }
} 