import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { createNewOrderNotification, createOrderStatusNotification, createLoyaltyPointsNotification, createPaymentVerificationNotification } from "@/lib/notifications";
import { PaymentMethod, DeliveryMethod } from "@/types/types";

// Order item schema
const orderItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  name: z.string(),
  price: z.number(),
  quantity: z.number(),
  size: z.string(),
  temperature: z.string(),
  addons: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        price: z.number(),
      })
    )
    .default([]),
});

// Order schema
const orderSchema = z.object({
  items: z.array(orderItemSchema),
  totalPrice: z.number(),
  subtotal: z.number(),
  deliveryFee: z.number().optional(),
  paymentMethod: z.string(),
  deliveryMethod: z.string(),
  deliveryAddress: z.string().nullable().optional(),
  contactNumber: z.string().nullable().optional(),
  pointsToRedeem: z.number().optional().default(0),
  paymentProofUrl: z.string().nullable().optional(),
});

// Constants for points calculation
const POINTS_EARNED_PER_100_PESOS = 1; // 1 point for every ₱100 spent
const POINTS_REDEEM_VALUE = 1;         // 1 point = ₱1 discount

// Create a new order
export async function POST(req: Request) {
  try {
    // This try/catch block will handle ALL errors
    const session = await getServerSession(authOptions);
    let body;
    
    try {
      // Parse the request body
      body = await req.json();
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        { message: "Invalid request body", detail: "Could not parse JSON" },
        { status: 400 }
      );
    }
    
    // Log the incoming request body for debugging
    console.log("Order request body:", JSON.stringify(body, null, 2));
    
    try {
      // Validate the request body with zod
      var { 
        items, 
        totalPrice, 
        subtotal, 
        deliveryFee, 
        paymentMethod, 
        deliveryMethod,
        deliveryAddress, 
        contactNumber, 
        pointsToRedeem = 0,
        paymentProofUrl
      } = orderSchema.parse(body);
    } catch (validationError) {
      console.error("Validation error:", validationError);
      return NextResponse.json(
        { 
          message: "Invalid order data", 
          detail: validationError instanceof z.ZodError 
            ? JSON.stringify(validationError.errors) 
            : "Unknown validation error" 
        },
        { status: 400 }
      );
    }
    
    // Ensure user is logged in
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "You must be logged in to create an order" },
        { status: 401 }
      );
    }
    
    // Verify that GCash payments include a payment proof
    if (paymentMethod === PaymentMethod.GCASH && !paymentProofUrl) {
      return NextResponse.json(
        { message: "Payment proof is required for GCash payments" },
        { status: 400 }
      );
    }
    
    // Log detailed input data for debugging
    console.log("Full order details:", { 
      userId: session.user.id,
      total: totalPrice, 
      paymentMethod,
      deliveryMethod,
      deliveryFee,
      deliveryAddress,
      contactNumber,
      pointsToRedeem,
      itemCount: items.length,
      paymentProofUrl: paymentProofUrl ? "Provided" : "Not provided",
    });
    
    // Map payment and delivery method strings to enum values
    const dbPaymentMethod = 
      paymentMethod === PaymentMethod.CASH_ON_DELIVERY 
        ? "CASH_ON_DELIVERY" 
        : paymentMethod === PaymentMethod.GCASH 
          ? "GCASH" 
          : "IN_STORE";
    
    const dbDeliveryMethod = 
      deliveryMethod === DeliveryMethod.DELIVERY 
        ? "DELIVERY" 
        : "PICKUP";
    
    console.log("Creating order with:", { 
      userId: session.user.id,
      total: totalPrice, 
      paymentMethod: dbPaymentMethod,
      deliveryMethod: dbDeliveryMethod,
    });
    
    // Execute as a transaction to ensure data consistency
    return await db.$transaction(async (tx) => {
      // If user wants to redeem points, verify they have enough and apply discount
      let finalTotal = totalPrice;
      let appliedPoints = 0;
      
      if (pointsToRedeem > 0) {
        // Get user's loyalty points
        const loyaltyPoints = await tx.loyaltyPoints.findUnique({
          where: { userId: session.user.id },
        });
        
        if (!loyaltyPoints) {
          return NextResponse.json(
            { message: "Loyalty points record not found" },
            { status: 404 }
          );
        }
        
        // Verify user has enough points
        if (loyaltyPoints.points < pointsToRedeem) {
          return NextResponse.json(
            { message: "Insufficient points for redemption" },
            { status: 400 }
          );
        }
        
        // Don't apply discount again - the totalPrice from client already includes the discount
        // The following commented-out code was causing the double-discount:
        // const pointsDiscount = pointsToRedeem * POINTS_REDEEM_VALUE;
        // finalTotal = Math.max(0, totalPrice - pointsDiscount);
        
        // Just use the totalPrice directly and track points used
        finalTotal = totalPrice;
        appliedPoints = pointsToRedeem;
        
        // Update user's loyalty points
        await tx.loyaltyPoints.update({
          where: { userId: session.user.id },
          data: { points: { decrement: pointsToRedeem } },
        });
      }
      
      // Calculate points earned (₱100 = 1 point)
      const pointsEarned = Math.floor(finalTotal / 100) * POINTS_EARNED_PER_100_PESOS;
      
      // Set initial payment status based on payment method
      const initialPaymentStatus = paymentMethod === PaymentMethod.GCASH ? "PENDING" : "VERIFIED";
      
      // Create the order with points information
      const simpleOrder = await tx.order.create({
        data: {
          userId: session.user.id,
          status: "RECEIVED",
          total: finalTotal,
          deliveryMethod: dbDeliveryMethod,
          paymentMethod: dbPaymentMethod,
          paymentStatus: initialPaymentStatus,
          paymentProofUrl: paymentProofUrl || null,
          deliveryFee: deliveryFee || 0,
          deliveryAddress: deliveryAddress || null,
          contactNumber: contactNumber || null,
          pointsUsed: appliedPoints,
          pointsEarned: pointsEarned, // Store the calculated points but don't award them yet
        },
      });
      
      // Record initial status in history
      await tx.orderStatusHistory.create({
        data: {
          orderId: simpleOrder.id,
          status: "RECEIVED",
        },
      });
      
      // Record points redemption if points were used
      if (appliedPoints > 0) {
        await tx.pointsHistory.create({
          data: {
            userId: session.user.id,
            action: "REDEEMED",
            points: appliedPoints,
            orderId: simpleOrder.id,
          },
        });
        
        // Create notification for points redemption
        await createLoyaltyPointsNotification(
          session.user.id,
          appliedPoints,
          'redeemed',
          simpleOrder.id
        );
      }
      
      // Now create order items
      for (const item of items) {
        console.log("Creating order item:", {
          orderId: simpleOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          size: item.size,
          temperature: item.temperature,
          addons: item.addons,
        });
        
        try {
          // Map the string values to proper enum values
          const sizeValue = item.size === "16oz" || item.size === "SIXTEEN_OZ" ? "SIXTEEN_OZ" : "TWENTY_TWO_OZ";
          const tempValue = item.temperature === "hot" || item.temperature === "HOT" ? "HOT" : "ICED";
          
          // First create the order item without addons
          const orderItem = await tx.orderItem.create({
            data: {
              orderId: simpleOrder.id,
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              size: sizeValue,
              temperature: tempValue,
              // Store add-ons as a JSON string as backup
              addonsJson: item.addons && item.addons.length > 0 ? JSON.stringify(item.addons) : null,
            },
          });
          
          console.log("Order item created successfully:", orderItem.id);
          
          // Connect addons if they exist
          if (item.addons && item.addons.length > 0) {
            // Log the add-ons being processed
            console.log(`Processing ${item.addons.length} add-ons for item ${orderItem.id}:`, JSON.stringify(item.addons));
            
            for (const addon of item.addons) {
              try {
                // Connect the addon to the order item
                await tx.addon.update({
                  where: { id: addon.id },
                  data: {
                    orderItems: {
                      connect: { id: orderItem.id },
                    },
                  },
                });
                console.log(`Successfully connected addon ${addon.id} (${addon.name}) to order item ${orderItem.id}`);
              } catch (addonError) {
                console.error(`Error connecting addon ${addon.id} to order item:`, addonError);
              }
            }
          } else {
            console.log(`No add-ons to process for order item ${orderItem.id}`);
          }
        } catch (itemError) {
          console.error("Error creating order item:", itemError);
          // Continue to next item even if this one fails
        }
      }
      
      try {
        // Send new order notification to admins
        // Get all admin users
        const adminUsers = await tx.user.findMany({
          where: {
            OR: [
              { role: "ADMIN" },
              { role: "SUPER_ADMIN" },
            ],
          },
          select: { id: true },
        });
        
        // Create notifications for each admin
        for (const admin of adminUsers) {
          await createNewOrderNotification(admin.id, simpleOrder.id);
        }
        
        // Create order received notification for the customer
        await createOrderStatusNotification(
          session.user.id,
          simpleOrder.id,
          "RECEIVED"
        );
        
        // If GCash payment, create payment verification notification for admins
        if (paymentMethod === PaymentMethod.GCASH) {
          for (const admin of adminUsers) {
            await createPaymentVerificationNotification(
              admin.id,
              simpleOrder.id,
              "NEW_PAYMENT"
            );
          }
        }
      } catch (notificationError) {
        console.error("Error creating notifications:", notificationError);
        // Continue even if notification creation fails
      }
      
      return NextResponse.json({
        message: "Order created successfully",
        orderId: simpleOrder.id,
        pointsEarned: pointsEarned,
        pointsUsed: appliedPoints,
      }, { status: 201 });
    });
  } catch (error) {
    console.error("Unexpected error in order creation:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred", detail: (error as Error).message },
      { status: 500 }
    );
  }
}

// Get user orders
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const orders = await db.order.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                basePrice: true,
                images: true
              }
            },
            addons: true
          }
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    
    // Process order items to convert addons from JSON string to object
    const processedOrders = orders.map(order => ({
      ...order,
      items: order.items.map(item => ({
        ...item,
        // Make sure product name is always available
        product: item.product || { name: "Unnamed Product" },
      })),
    }));
    
    return NextResponse.json(processedOrders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
} 