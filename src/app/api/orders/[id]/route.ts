import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`[API] Order details request for ID: ${params.id}`);
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      console.log("[API] Order details: Unauthorized request");
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const orderId = params.id;
    const userId = session.user.id;
    const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
    
    console.log(`[API] Order details: User ${userId} (isAdmin: ${isAdmin}) requesting order ${orderId}`);
    
    // Find the order with user permission check
    const order = await db.order.findUnique({
      where: {
        id: orderId,
        ...(isAdmin ? {} : { userId }) // Only add userId filter for non-admins
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
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

    // Handle order not found
    if (!order) {
      console.log(`[API] Order details: Order ${orderId} not found or user has no permission`);
      return NextResponse.json(
        { error: "Order not found or you don't have permission to view it" },
        { status: 404 }
      );
    }

    console.log(`[API] Order details: Successfully found order ${orderId}`);
    
    // Create a safe response with default values for problematic fields
    try {
      const safeOrder = {
        ...order,
        items: order.items.map(item => {
          try {
            // Process addons safely
            let processedAddons = [];
            
            // First try the addons relation
            if (item.addons && Array.isArray(item.addons)) {
              processedAddons = item.addons;
            } 
            // Then try addonsJson if available
            else if (item.addonsJson) {
              try {
                const jsonString = typeof item.addonsJson === 'string' 
                  ? item.addonsJson 
                  : JSON.stringify(item.addonsJson);
                
                const cleanedString = jsonString.replace(/\\/g, '');
                const parsed = JSON.parse(cleanedString);
                processedAddons = Array.isArray(parsed) ? parsed : [parsed];
              } catch (e) {
                console.error(`[API] Error parsing addonsJson: ${e.message}`);
              }
            }
            // Lastly check string addon format as fallback
            else if (typeof item.addons === 'string' && item.addons) {
              try {
                const parsed = JSON.parse(item.addons.replace(/\\/g, ''));
                processedAddons = Array.isArray(parsed) ? parsed : [parsed];
              } catch (e) {
                // Try comma-separated format
                if (item.addons.includes(',')) {
                  const addonNames = item.addons.split(',').map(a => a.trim());
                  processedAddons = addonNames.map(name => ({ 
                    name, 
                    price: 15,
                    itemName: (item.product?.name || 'Product')
                  }));
                }
              }
            }
            
            return {
              ...item,
              processedAddons,
              // Make sure required fields have fallbacks
              price: item.price || 0,
              quantity: item.quantity || 1,
              size: item.size || 'SIXTEEN_OZ',
              temperature: item.temperature || 'ICED'
            };
          } catch (itemError) {
            console.error(`[API] Error processing order item ${item.id}: ${itemError.message}`);
            // Return a minimal safe item if processing fails
            return {
              id: item.id,
              product: item.product || { name: "Product", images: [] },
              price: item.price || 0,
              quantity: item.quantity || 1,
              size: item.size || 'SIXTEEN_OZ',
              temperature: item.temperature || 'ICED',
              processedAddons: []
            };
          }
        }),
        // Ensure statusHistory is always an array
        statusHistory: Array.isArray(order.statusHistory) ? order.statusHistory : [],
        // Ensure payment details are included
        paymentStatus: order.paymentStatus || 'PENDING',
        paymentProofUrl: order.paymentProofUrl || null,
        // Ensure other required fields have defaults
        total: order.total || 0,
        deliveryFee: order.deliveryFee || 0,
        pointsUsed: order.pointsUsed || 0,
        pointsEarned: order.pointsEarned || 0
      };
      
      console.log(`[API] Order details: Successfully processed order ${orderId}`);
      return NextResponse.json(safeOrder);
    } catch (processingError) {
      console.error(`[API] Error processing order data: ${processingError.message}`);
      
      // Return a minimal but valid response
      return NextResponse.json({
        id: order.id,
        status: order.status,
        total: order.total || 0,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus || 'PENDING',
        paymentProofUrl: order.paymentProofUrl || null,
        deliveryMethod: order.deliveryMethod,
        deliveryFee: order.deliveryFee || 0,
        pointsUsed: order.pointsUsed || 0,
        pointsEarned: order.pointsEarned || 0,
        items: order.items.map(item => ({
          id: item.id,
          price: item.price || 0,
          quantity: item.quantity || 1,
          size: item.size || "SIXTEEN_OZ",
          temperature: item.temperature || "ICED",
          product: item.product || { name: "Product", images: [] },
          processedAddons: []
        })),
        statusHistory: [],
        error: "Some order details couldn't be processed properly"
      });
    }
  } catch (error) {
    console.error(`[API] Critical error fetching order: ${error.message}`);
    console.error(error.stack);
    return NextResponse.json(
      { error: "An error occurred while fetching the order" },
      { status: 500 }
    );
  }
} 