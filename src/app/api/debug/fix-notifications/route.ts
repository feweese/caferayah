import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Endpoint to fix notification links in the database
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get all notifications for this user that are order-related
    const notifications = await db.notification.findMany({
      where: {
        userId: session.user.id,
        type: "ORDER_STATUS"
      }
    });
    
    console.log(`Found ${notifications.length} order notifications to process`);
    
    const results = {
      processed: 0,
      fixed: 0,
      alreadyCorrect: 0,
      failed: 0,
      details: []
    };
    
    // Process each notification
    for (const notification of notifications) {
      results.processed++;
      
      try {
        // Check if this notification has a link to an order
        if (notification.link && notification.link.includes('/orders/')) {
          // Try to extract order ID from message or title
          let orderId = null;
          
          // Look for order ID in the message (format: #orderId-short)
          const messageMatch = notification.message.match(/#([a-z0-9]+)/i);
          if (messageMatch && messageMatch[1]) {
            const shortId = messageMatch[1];
            
            // Find matching order with this short ID prefix
            const orders = await db.order.findMany({
              where: {
                userId: session.user.id
              }
            });
            
            // Find order that starts with this short ID
            const matchingOrder = orders.find(order => order.id.startsWith(shortId));
            if (matchingOrder) {
              orderId = matchingOrder.id;
              console.log(`Found matching order ${orderId} for short ID ${shortId}`);
            }
          }
          
          // If we found an order ID, fix the link
          if (orderId) {
            const correctLink = `/orders/${orderId}`;
            
            if (notification.link === correctLink) {
              console.log(`Notification ${notification.id} already has correct link`);
              results.alreadyCorrect++;
              results.details.push({
                id: notification.id,
                status: "already_correct",
                link: notification.link
              });
            } else {
              // Update the link
              await db.notification.update({
                where: { id: notification.id },
                data: { link: correctLink }
              });
              
              console.log(`Fixed notification ${notification.id} link to ${correctLink}`);
              results.fixed++;
              results.details.push({
                id: notification.id,
                status: "fixed",
                oldLink: notification.link,
                newLink: correctLink
              });
            }
          } else {
            console.log(`Could not find matching order for notification ${notification.id}`);
            results.failed++;
            results.details.push({
              id: notification.id,
              status: "failed",
              reason: "no_matching_order",
              message: notification.message
            });
          }
        } else {
          console.log(`Notification ${notification.id} has no order link`);
          results.failed++;
          results.details.push({
            id: notification.id,
            status: "failed",
            reason: "no_order_link",
            link: notification.link
          });
        }
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
        results.failed++;
        results.details.push({
          id: notification.id,
          status: "error",
          error: error.message
        });
      }
    }
    
    return NextResponse.json({
      message: "Notification fix process completed",
      results
    });
  } catch (error) {
    console.error("Error fixing notifications:", error);
    return NextResponse.json(
      { message: "Error fixing notifications", error: error.message },
      { status: 500 }
    );
  }
} 