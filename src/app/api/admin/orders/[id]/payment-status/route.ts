import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createPaymentStatusNotification } from "@/lib/notifications";

// Handle payment status update requests
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check if the user is authenticated and is an admin
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const orderId = params.id;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    // Validate status parameter
    if (!status || !["VERIFIED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { message: "Invalid payment status. Must be VERIFIED or REJECTED." },
        { status: 400 }
      );
    }

    // Get the order to verify it exists and is a GCash payment
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { id: true }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { message: "Order not found" },
        { status: 404 }
      );
    }

    if (order.paymentMethod !== "GCASH") {
      return NextResponse.json(
        { message: "This order is not a GCash payment" },
        { status: 400 }
      );
    }

    // Update the payment status in the database
    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: { paymentStatus: status },
    });

    // Create a notification for the customer
    await createPaymentStatusNotification(
      order.userId,
      orderId,
      status as "VERIFIED" | "REJECTED"
    );

    // Redirect back to the order detail page
    const redirectUrl = `/admin/orders/${orderId}`;
    
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl,
      },
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    return NextResponse.json(
      { message: "Something went wrong", detail: (error as Error).message },
      { status: 500 }
    );
  }
} 