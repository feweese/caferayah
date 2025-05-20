import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only admins can access this endpoint
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    // Parse search params from URL
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId') || undefined;
    const status = url.searchParams.get('status') || undefined;
    
    // Pagination parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const skip = (page - 1) * pageSize;
    
    // Build where clause for filtering
    const whereClause: any = {};
    
    if (userId) {
      whereClause.userId = userId;
    }
    
    // Map URL status parameter to OrderStatus
    if (status && status !== "all") {
      // Convert to enum format: received -> RECEIVED, preparing -> PREPARING, etc.
      const statusMap: Record<string, string> = {
        'received': 'RECEIVED',
        'preparing': 'PREPARING',
        'out_for_delivery': 'OUT_FOR_DELIVERY',
        'ready_for_pickup': 'READY_FOR_PICKUP',
        'completed': 'COMPLETED',
        'cancelled': 'CANCELLED'
      };
      
      if (statusMap[status]) {
        whereClause.status = statusMap[status];
      }
    }

    // Get total count for pagination
    const totalCount = await db.order.count({
      where: whereClause
    });
    
    // Get total count of all orders regardless of status filter, but respecting userId filter
    const allOrdersCount = await db.order.count({
      where: userId ? { userId } : undefined
    });

    // Fetch orders with pagination and filters
    const orders = await db.order.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: pageSize,
    });

    // Get order count by status for summary cards
    const receivedCount = await db.order.count({ 
      where: { 
        ...whereClause, 
        status: "RECEIVED" 
      }
    });
    const preparingCount = await db.order.count({ 
      where: { 
        ...whereClause, 
        status: "PREPARING" 
      }
    });
    const outForDeliveryCount = await db.order.count({ 
      where: { 
        ...whereClause, 
        status: "OUT_FOR_DELIVERY" 
      }
    });
    const readyForPickupCount = await db.order.count({ 
      where: { 
        ...whereClause, 
        status: "READY_FOR_PICKUP" 
      }
    });
    const completedCount = await db.order.count({ 
      where: { 
        ...whereClause, 
        status: "COMPLETED" 
      }
    });
    const cancelledCount = await db.order.count({ 
      where: { 
        ...whereClause, 
        status: "CANCELLED" 
      }
    });
    
    // Calculate active orders (orders that need attention)
    const activeOrdersCount = receivedCount + preparingCount + outForDeliveryCount + readyForPickupCount;

    return NextResponse.json({
      orders,
      totalCount,
      allOrdersCount,
      totalPages: Math.ceil(totalCount / pageSize),
      currentPage: page,
      pageSize,
      counts: {
        received: receivedCount,
        preparing: preparingCount,
        outForDelivery: outForDeliveryCount,
        readyForPickup: readyForPickupCount,
        completed: completedCount,
        cancelled: cancelledCount,
        active: activeOrdersCount,
      }
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { message: "Failed to fetch orders" },
      { status: 500 }
    );
  }
} 