import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, format, isSameDay, subDays, subMonths, subYears } from "date-fns";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check authentication
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get query parameters for filtering
    const url = new URL(req.url);
    const reportType = url.searchParams.get("reportType") || "sales";
    
    // Custom date range parameters
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");
    
    // Period parameter for preset ranges (day, week, month, year)
    const period = url.searchParams.get("period") || "custom";
    
    // Comparison period (optional)
    const compare = url.searchParams.get("compare") === "true";
    
    // Calculate date ranges based on period or custom dates
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    let startDate = new Date();
    
    if (startDateParam && endDateParam && period === "custom") {
      startDate = new Date(startDateParam);
      endDate.setTime(new Date(endDateParam).getTime());
      endDate.setHours(23, 59, 59, 999);
    } else {
      switch (period) {
        case "day":
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          // For "week" (Last 7 days), start date should be 7 days ago from end date (today)
          startDate = subDays(endDate, 6); // Use 6 days back to make it inclusive of today (7 days total)
          startDate.setHours(0, 0, 0, 0); // Start at beginning of the day
          endDate.setHours(23, 59, 59, 999); // End at end of the day
          
          console.log("Week period calculation:", {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            durationDays: Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
          });
          break;
        case "month":
          startDate = subMonths(endDate, 1);
          break;
        case "year":
          startDate = subYears(endDate, 1);
          break;
        default:
          // Default to month if custom dates were not provided
          if (!startDateParam || !endDateParam) {
            startDate = subMonths(endDate, 1);
          }
      }
    }

    // Calculate comparison period based on the selected period type
    let comparisonStartDate;
    let comparisonEndDate;
    
    if (compare) {
      // For comparison period, calculate the same duration but for the previous period
      switch (period) {
        case "day":
          // For "day" (Today), comparison should be exactly yesterday
          comparisonEndDate = new Date(startDate);
          comparisonEndDate.setDate(comparisonEndDate.getDate() - 1);
          comparisonEndDate.setHours(23, 59, 59, 999);
          
          comparisonStartDate = new Date(comparisonEndDate);
          comparisonStartDate.setHours(0, 0, 0, 0);
          break;
          
        case "week":
          // For week, we need to ensure the comparison period is exactly 7 days before the current period
          // with no overlap and proper boundaries
          
          // Set comparison end date to the day before the current period's start date
          comparisonEndDate = new Date(startDate);
          comparisonEndDate.setDate(comparisonEndDate.getDate() - 1);
          comparisonEndDate.setHours(23, 59, 59, 999); // End of day
          
          // Set comparison start date to be 7 days before the comparison end date (inclusive)
          comparisonStartDate = new Date(comparisonEndDate);
          comparisonStartDate.setDate(comparisonStartDate.getDate() - 6); // -6 days for a 7 day period (inclusive)
          comparisonStartDate.setHours(0, 0, 0, 0); // Beginning of day
          
          // Enhanced logging for week comparison period
          console.log("Week comparison calculation:", {
            currentPeriod: {
              start: startDate.toISOString(),
              end: endDate.toISOString(),
              durationDays: Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
            },
            comparisonPeriod: {
              start: comparisonStartDate.toISOString(),
              end: comparisonEndDate.toISOString(),
              durationDays: Math.round((comparisonEndDate.getTime() - comparisonStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
            }
          });
          break;
          
        case "month":
          // For "month", comparison should be the previous 30 days or equivalent period
          // Calculate duration of current period in milliseconds
          const durationMs = endDate.getTime() - startDate.getTime();
          
          // End date is one day before start date
          comparisonEndDate = new Date(startDate);
          comparisonEndDate.setDate(comparisonEndDate.getDate() - 1);
          comparisonEndDate.setHours(23, 59, 59, 999);
          
          // Start date is the same duration before the comparison end date
          comparisonStartDate = new Date(comparisonEndDate.getTime() - durationMs + (24 * 60 * 60 * 1000)); // Add 1 day to make it inclusive
          comparisonStartDate.setHours(0, 0, 0, 0);
          break;
          
        case "year":
          // For "year", use same approach as month - calculate by duration
          const yearDurationMs = endDate.getTime() - startDate.getTime();
          
          // End date is one day before start date
          comparisonEndDate = new Date(startDate);
          comparisonEndDate.setDate(comparisonEndDate.getDate() - 1);
          comparisonEndDate.setHours(23, 59, 59, 999);
          
          // Start date is the same duration before the comparison end date
          comparisonStartDate = new Date(comparisonEndDate.getTime() - yearDurationMs + (24 * 60 * 60 * 1000)); // Add 1 day to make it inclusive
          comparisonStartDate.setHours(0, 0, 0, 0);
          break;
          
        case "custom":
        default:
          // For custom periods, use the same duration
          const customDurationMs = endDate.getTime() - startDate.getTime();
          
          // End date is one day before start date
          comparisonEndDate = new Date(startDate);
          comparisonEndDate.setDate(comparisonEndDate.getDate() - 1);
          comparisonEndDate.setHours(23, 59, 59, 999);
          
          // Start date is the same duration before the comparison end date
          comparisonStartDate = new Date(comparisonEndDate.getTime() - customDurationMs + (24 * 60 * 60 * 1000)); // Add 1 day to make it inclusive
          comparisonStartDate.setHours(0, 0, 0, 0);
          break;
      }
    }
    
    // Get orders within the current date range
    console.log("Fetching current period orders:", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    
    const orders = await db.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          notIn: ["CANCELLED"],
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    
    console.log(`Found ${orders.length} orders in current period`);
    
    // Get comparison orders if comparison is enabled
    let comparisonOrders = [];
    if (compare && comparisonStartDate && comparisonEndDate) {
      console.log("Fetching comparison period orders:", {
        startDate: comparisonStartDate.toISOString(),
        endDate: comparisonEndDate.toISOString()
      });
      
      comparisonOrders = await db.order.findMany({
        where: {
          createdAt: {
            gte: comparisonStartDate,
            lte: comparisonEndDate,
          },
          status: {
            notIn: ["CANCELLED"],
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });
      
      console.log(`Found ${comparisonOrders.length} orders in comparison period`);
      
      // Debug: Check if any orders are in both periods (should never happen)
      const currentOrderIds = new Set(orders.map(order => order.id));
      const sharedOrders = comparisonOrders.filter(order => currentOrderIds.has(order.id));
      if (sharedOrders.length > 0) {
        console.error("ERROR: Found orders that exist in both current and comparison periods:", 
          sharedOrders.map(order => ({ 
            id: order.id, 
            createdAt: order.createdAt 
          }))
        );
      }
    }
    
    // Initialize response data
    const responseData: any = {
      currentPeriod: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }
    };
    
    // Add comparison period dates if enabled
    if (compare && comparisonStartDate && comparisonEndDate) {
      responseData.comparisonPeriod = {
        startDate: comparisonStartDate.toISOString(),
        endDate: comparisonEndDate.toISOString(),
      };
    }
    
    // Process sales report data
    if (reportType === "sales") {
      // Current period calculations
      responseData.currentPeriod.totalOrders = orders.length;
      responseData.currentPeriod.totalRevenue = calculateTotalRevenue(orders);
      responseData.currentPeriod.completedOrders = countCompletedOrders(orders);
      responseData.currentPeriod.averageOrderValue = calculateAverageOrderValue(orders);
      responseData.currentPeriod.dailySales = calculateDailySales(orders, startDate, endDate);
      responseData.currentPeriod.salesByCategory = calculateSalesByCategory(orders);
      responseData.currentPeriod.salesByPaymentMethod = calculateSalesByPaymentMethod(orders);
      responseData.currentPeriod.productPerformance = calculateProductPerformance(orders);
      
      // Comparison period calculations if enabled
      if (compare && comparisonOrders.length > 0) {
        responseData.comparisonPeriod.totalOrders = comparisonOrders.length;
        responseData.comparisonPeriod.totalRevenue = calculateTotalRevenue(comparisonOrders);
        responseData.comparisonPeriod.completedOrders = countCompletedOrders(comparisonOrders);
        responseData.comparisonPeriod.averageOrderValue = calculateAverageOrderValue(comparisonOrders);
        responseData.comparisonPeriod.dailySales = calculateDailySales(comparisonOrders, comparisonStartDate, comparisonEndDate);
        responseData.comparisonPeriod.salesByCategory = calculateSalesByCategory(comparisonOrders);
        responseData.comparisonPeriod.salesByPaymentMethod = calculateSalesByPaymentMethod(comparisonOrders);
        responseData.comparisonPeriod.productPerformance = calculateProductPerformance(comparisonOrders);
        
        // Calculate period-over-period changes
        responseData.comparison = {
          totalOrdersChange: calculatePercentageChange(
            responseData.currentPeriod.totalOrders,
            responseData.comparisonPeriod.totalOrders
          ),
          totalRevenueChange: calculatePercentageChange(
            responseData.currentPeriod.totalRevenue,
            responseData.comparisonPeriod.totalRevenue
          ),
          completedOrdersChange: calculatePercentageChange(
            responseData.currentPeriod.completedOrders, 
            responseData.comparisonPeriod.completedOrders
          ),
          averageOrderValueChange: calculatePercentageChange(
            responseData.currentPeriod.averageOrderValue,
            responseData.comparisonPeriod.averageOrderValue
          ),
        };
      }
    }
    
    // Process customer report data
    if (reportType === "customers") {
      responseData.currentPeriod.topCustomers = calculateTopCustomers(orders);
      
      if (compare && comparisonOrders.length > 0) {
        responseData.comparisonPeriod.topCustomers = calculateTopCustomers(comparisonOrders);
      }
    }
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}

// Helper functions
function calculateTotalRevenue(orders: any[]) {
  return orders.reduce((total, order) => {
    // Only include completed and delivered orders in revenue
    if (order.status === "COMPLETED" || order.status === "DELIVERED") {
      // Calculate the correct total for each order
      const subtotal = order.items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);
      const deliveryFee = order.deliveryFee || 0;
      const pointsDiscount = order.pointsUsed || 0;
      const correctTotal = subtotal + deliveryFee - pointsDiscount;
      
      return total + correctTotal;
    }
    return total;
  }, 0);
}

function countCompletedOrders(orders: any[]) {
  return orders.filter(order => 
    order.status === "COMPLETED" || order.status === "DELIVERED"
  ).length;
}

function calculateAverageOrderValue(orders: any[]) {
  const completedOrders = orders.filter(order => 
    order.status === "COMPLETED" || order.status === "DELIVERED"
  );
  
  if (completedOrders.length === 0) return 0;
  
  // Calculate total revenue with correct formula
  const totalRevenue = completedOrders.reduce((sum, order) => {
    const subtotal = order.items.reduce((itemSum, item) => {
      return itemSum + (item.price * item.quantity);
    }, 0);
    const deliveryFee = order.deliveryFee || 0;
    const pointsDiscount = order.pointsUsed || 0;
    const correctTotal = subtotal + deliveryFee - pointsDiscount;
    
    return sum + correctTotal;
  }, 0);
  
  return totalRevenue / completedOrders.length;
}

function calculatePercentageChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function calculateDailySales(orders: any[], startDate: Date, endDate: Date) {
  const salesByDay = new Map();
  
  // Check if we're looking at a single day
  const isSingleDay = isSameDay(startDate, endDate);
  
  if (isSingleDay) {
    // For a single day, initialize all hours with zero sales
    for (let hour = 0; hour < 24; hour++) {
      const hourString = `${hour}:00`;
      salesByDay.set(hourString, {
        date: hourString,
        revenue: 0,
        orders: 0,
      });
    }
    
    // Add sales data by hour
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const hour = orderDate.getHours();
      const hourString = `${hour}:00`;
      
      if (salesByDay.has(hourString)) {
        const hourData = salesByDay.get(hourString);
        hourData.orders += 1;
        
        if (order.status === "COMPLETED" || order.status === "DELIVERED") {
          // Calculate the correct total
          const subtotal = order.items.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
          }, 0);
          const deliveryFee = order.deliveryFee || 0;
          const pointsDiscount = order.pointsUsed || 0;
          const correctTotal = subtotal + deliveryFee - pointsDiscount;
          
          hourData.revenue += correctTotal;
        }
        
        salesByDay.set(hourString, hourData);
      }
    });
  } else {
    // Initialize all dates in the range with zero sales
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateString = format(currentDate, "yyyy-MM-dd");
      salesByDay.set(dateString, {
        date: dateString,
        revenue: 0,
        orders: 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Add sales data by day
    orders.forEach(order => {
      const dateString = format(new Date(order.createdAt), "yyyy-MM-dd");
      if (salesByDay.has(dateString)) {
        const dayData = salesByDay.get(dateString);
        dayData.orders += 1;
        
        if (order.status === "COMPLETED" || order.status === "DELIVERED") {
          // Calculate the correct total
          const subtotal = order.items.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
          }, 0);
          const deliveryFee = order.deliveryFee || 0;
          const pointsDiscount = order.pointsUsed || 0;
          const correctTotal = subtotal + deliveryFee - pointsDiscount;
          
          dayData.revenue += correctTotal;
        }
        
        salesByDay.set(dateString, dayData);
      }
    });
  }
  
  return Array.from(salesByDay.values());
}

function calculateSalesByCategory(orders: any[]) {
  const salesByCategory = new Map();
  
  orders.forEach(order => {
    if (order.status !== "COMPLETED" && order.status !== "DELIVERED") {
      return;
    }
    
    order.items.forEach((item: any) => {
      const category = item.product.category;
      if (!salesByCategory.has(category)) {
        salesByCategory.set(category, {
          category,
          revenue: 0,
          quantity: 0,
        });
      }
      
      const categoryData = salesByCategory.get(category);
      categoryData.revenue += item.price * item.quantity;
      categoryData.quantity += item.quantity;
      salesByCategory.set(category, categoryData);
    });
  });
  
  return Array.from(salesByCategory.values());
}

function calculateSalesByPaymentMethod(orders: any[]) {
  const salesByMethod = new Map();
  
  orders.forEach(order => {
    if (order.status !== "COMPLETED" && order.status !== "DELIVERED") {
      return;
    }
    
    const method = order.paymentMethod;
    if (!salesByMethod.has(method)) {
      salesByMethod.set(method, {
        method,
        revenue: 0,
        orders: 0,
      });
    }
    
    // Calculate the correct total
    const subtotal = order.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    const deliveryFee = order.deliveryFee || 0;
    const pointsDiscount = order.pointsUsed || 0;
    const correctTotal = subtotal + deliveryFee - pointsDiscount;
    
    const methodData = salesByMethod.get(method);
    methodData.revenue += correctTotal;
    methodData.orders += 1;
    salesByMethod.set(method, methodData);
  });
  
  return Array.from(salesByMethod.values());
}

function calculateTopCustomers(orders: any[]) {
  const customerData = new Map();
  
  orders.forEach(order => {
    const userId = order.userId;
    const userName = order.user?.name || "Unknown";
    const userEmail = order.user?.email || "";
    
    if (!customerData.has(userId)) {
      customerData.set(userId, {
        id: userId,
        name: userName,
        email: userEmail,
        totalOrders: 0,
        totalSpent: 0,
        lastOrderDate: null,
      });
    }
    
    const userData = customerData.get(userId);
    userData.totalOrders += 1;
    
    if (order.status === "COMPLETED" || order.status === "DELIVERED") {
      // Calculate the correct total
      const subtotal = order.items.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);
      const deliveryFee = order.deliveryFee || 0;
      const pointsDiscount = order.pointsUsed || 0;
      const correctTotal = subtotal + deliveryFee - pointsDiscount;
      
      userData.totalSpent += correctTotal;
    }
    
    const orderDate = new Date(order.createdAt);
    if (!userData.lastOrderDate || orderDate > userData.lastOrderDate) {
      userData.lastOrderDate = orderDate;
    }
    
    customerData.set(userId, userData);
  });
  
  return Array.from(customerData.values())
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 10);
}

function calculateProductPerformance(orders: any[]) {
  // Track product performance metrics
  const productPerformance = new Map();
  
  // Filter for completed and delivered orders only
  const completedOrders = orders.filter(order => 
    order.status === "COMPLETED" || order.status === "DELIVERED"
  );
  
  // Process each order
  completedOrders.forEach(order => {
    order.items.forEach(item => {
      const product = item.product;
      const productId = product.id;
      
      if (!productPerformance.has(productId)) {
        productPerformance.set(productId, {
          id: productId,
          name: product.name,
          quantity: 0,
          revenue: 0,
          category: product.category || "UNCATEGORIZED",
          // Optional metrics - these would be calculated if you have the data
          // profitMargin: 0,
          // inventoryTurnover: 0,
          // returnRate: 0
        });
      }
      
      const metrics = productPerformance.get(productId);
      
      // Update basic metrics
      metrics.quantity += item.quantity;
      metrics.revenue += item.price * item.quantity;
      
      // If you have cost data, you could calculate profit margin
      if (product.cost) {
        const cost = product.cost * item.quantity;
        const revenue = item.price * item.quantity;
        const profit = revenue - cost;
        metrics.profitMargin = (profit / revenue) * 100; // as percentage
      }
      
      productPerformance.set(productId, metrics);
    });
  });
  
  // Convert map to array and sort by revenue (highest first)
  return Array.from(productPerformance.values())
    .sort((a, b) => b.revenue - a.revenue);
} 