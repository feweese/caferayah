import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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
    const period = url.searchParams.get("period") || "month"; // day, week, month, year
    
    // Calculate date ranges based on period
    // Force create a fresh today object to avoid any stale date issues
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    const realToday = new Date();
    console.log("Current server time:", realToday.toISOString());
    console.log("Selected period:", period);
    
    let startDate = new Date(today); // Clone today
    let previousStartDate, previousEndDate;
    
    // Calculate the current period range
    switch (period) {
      case "day":
        // For "day" (Today), the start date is the beginning of today
        startDate.setHours(0, 0, 0, 0);
        break;
        
      case "week":
        // For "week", we want the last 7 days (today + 6 previous days)
        // Ensure we're using the current date as the end date
        console.log("Today before calculation:", today.toISOString());
        startDate = new Date(today); // Fresh today reference
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        console.log(`Week period: ${startDate.toISOString()} to ${today.toISOString()} (should include today and 6 previous days)`);
        break;
        
      case "month":
        // For "month", we want the last 30 days including today
        // If today is May 10, start date should be April 11
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 29); // This gives exactly 30 days
        startDate.setHours(0, 0, 0, 0);
        
        console.log("Confirmed month period start date:", startDate.toISOString());
        console.log("Confirmed month period end date:", today.toISOString());
        
        // Initialize map with all days in the month period (with zero revenue)
        const numDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        // Debug: Log the first few days we're going to generate
        const debugDays = [];
        for (let i = 0; i < Math.min(5, numDays); i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          debugDays.push(date.toISOString().split('T')[0]);
        }
        console.log("First few days in month period:", debugDays);
        break;
        
      case "year":
        // For "year", we want the last 365 days
        startDate.setDate(today.getDate() - 364); // Today + 364 days before = 365 days total
        startDate.setHours(0, 0, 0, 0);
        break;
        
      default:
        startDate.setMonth(today.getMonth() - 1); // Default to month
        startDate.setHours(0, 0, 0, 0);
    }
    
    // Calculate the previous period range (same duration, immediately before current period)
    const periodDuration = today.getTime() - startDate.getTime();
    
    previousEndDate = new Date(startDate);
    previousEndDate.setMilliseconds(previousEndDate.getMilliseconds() - 1);
    
    previousStartDate = new Date(previousEndDate);
    previousStartDate.setTime(previousStartDate.getTime() - periodDuration);
    
    console.log("Date ranges:", {
      currentPeriod: {
        start: startDate.toISOString(),
        end: today.toISOString(),
        durationDays: Math.round(periodDuration / (1000 * 60 * 60 * 24))
      },
      previousPeriod: {
        start: previousStartDate.toISOString(),
        end: previousEndDate.toISOString(),
        durationDays: Math.round((previousEndDate.getTime() - previousStartDate.getTime()) / (1000 * 60 * 60 * 24))
      }
    });
    
    // Get orders within the current date range
    const orders = await db.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: today,
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
    
    // Get orders from the previous period for comparison
    const previousPeriodOrders = await db.order.findMany({
      where: {
        createdAt: {
          gte: previousStartDate,
          lte: previousEndDate,
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
    
    // Calculate revenue by date for trend analysis
    const revenueTrend = new Map();
    const orderCountsByHour = new Array(24).fill(0);
    const revenueByCategory = new Map();
    const revenueByPaymentMethod = new Map();
    const productPerformance = new Map(); // Track sales by product
    
    // Prepare for revenue calculations
    let totalRevenue = 0;
    const totalOrders = orders.length;
    
    // Process orders
    orders.forEach((order) => {
      // Format date as string (YYYY-MM-DD)
      const dateKey = order.createdAt.toISOString().split('T')[0];
      
      // Count orders by hour for peak hour analysis
      const hour = order.createdAt.getHours();
      orderCountsByHour[hour]++;
      
      // Only include COMPLETED and DELIVERED orders in revenue calculations
      const isCompletedOrder = order.status === "COMPLETED" || order.status === "DELIVERED";
      
      if (isCompletedOrder) {
        // Calculate the correct total for the order
        const subtotal = order.items.reduce((sum, item) => {
          return sum + (item.price * item.quantity);
        }, 0);
        const deliveryFee = order.deliveryFee || 0;
        const pointsDiscount = order.pointsUsed || 0;
        const correctTotal = subtotal + deliveryFee - pointsDiscount;

        // Calculate revenue by date
        if (!revenueTrend.has(dateKey)) {
          revenueTrend.set(dateKey, 0);
        }
        revenueTrend.set(dateKey, revenueTrend.get(dateKey) + correctTotal);
        
        // Calculate revenue by payment method
        const paymentKey = order.paymentMethod;
        if (!revenueByPaymentMethod.has(paymentKey)) {
          revenueByPaymentMethod.set(paymentKey, 0);
        }
        revenueByPaymentMethod.set(paymentKey, revenueByPaymentMethod.get(paymentKey) + correctTotal);
        
        // Count product categories
        order.items.forEach((item) => {
          const category = item.product.category;
          if (!revenueByCategory.has(category)) {
            revenueByCategory.set(category, 0);
          }
          revenueByCategory.set(category, revenueByCategory.get(category) + item.price);
          
          // Track product performance (quantity and revenue)
          const productId = item.product.id;
          const productName = item.product.name;
          
          if (!productPerformance.has(productId)) {
            productPerformance.set(productId, {
              id: productId,
              name: productName,
              quantity: 0,
              revenue: 0,
              category: item.product.category
            });
          }
          
          const productData = productPerformance.get(productId);
          productData.quantity += item.quantity;
          productData.revenue += (item.price * item.quantity);
          productPerformance.set(productId, productData);
        });
        
        // Add to total revenue only if completed
        totalRevenue += correctTotal;
      }
    });
    
    // Count completed orders separately for average order value calculation
    const completedOrders = orders.filter(
      order => order.status === "COMPLETED" || order.status === "DELIVERED"
    ).length;
    
    // Format data for API response
    const formattedRevenueTrend = [];
    
    // Generate proper date points based on the period
    const datePoints = [];
    
    // Helper function to format date as YYYY-MM-DD
    const formatDateToString = (date) => {
      return date.toISOString().split('T')[0];
    };
    
    if (period === "day") {
      // For day, generate hourly data points (24 hours)
      const dayStart = new Date(startDate);
      
      // Override revenueTrend for hourly data
      const hourlyRevenue = new Map();
      
      // Initialize all hours with zero revenue
      for (let hour = 0; hour < 24; hour++) {
        const hourDate = new Date(dayStart);
        hourDate.setHours(hour, 0, 0, 0);
        const hourKey = hourDate.toISOString();
        hourlyRevenue.set(hourKey, 0);
      }
      
      // Process orders for the current day
      orders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        const orderHour = orderDate.getHours();
        
        // Only include completed orders
        if ((order.status === "COMPLETED" || order.status === "DELIVERED") && 
            orderDate >= startDate && orderDate <= today) {
          
          // Calculate revenue for this order
          const subtotal = order.items.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
          }, 0);
          const deliveryFee = order.deliveryFee || 0;
          const pointsDiscount = order.pointsUsed || 0;
          const orderTotal = subtotal + deliveryFee - pointsDiscount;
          
          // Add to the corresponding hour
          const hourDate = new Date(dayStart);
          hourDate.setHours(orderHour, 0, 0, 0);
          const hourKey = hourDate.toISOString();
          
          if (hourlyRevenue.has(hourKey)) {
            hourlyRevenue.set(hourKey, hourlyRevenue.get(hourKey) + orderTotal);
          }
        }
      });
      
      // Create formatted data points for hourly view
      for (const [hourKey, revenue] of hourlyRevenue.entries()) {
        const hourDate = new Date(hourKey);
        formattedRevenueTrend.push({
          date: hourDate.toISOString(),
          hour: hourDate.getHours(),
          revenue: revenue,
        });
      }
      
      // Sort by hour
      formattedRevenueTrend.sort((a, b) => a.hour - b.hour);
      
    } else if (period === "week") {
      // For week, ensure we have daily entries with proper data
      const dailyRevenue = new Map();
      
      // Fix: Use proper date range to include today
      // Calculate the actual date points needed (should include today)
      const endDateStr = today.toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
      console.log("Today's date (should be included):", endDateStr);
      
      // Initialize with today and the 6 days before
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - i)); // Count backwards from today (i=6 will be today)
        // Format as YYYY-MM-DD
        const dateKey = date.toISOString().split('T')[0];
        dailyRevenue.set(dateKey, 0);
        console.log(`Week data point ${i+1}: ${dateKey}`);
      }
      
      // Add actual revenue data from existing map
      for (const [dateStr, revenue] of revenueTrend.entries()) {
        // Only include dates within our week range
        if (dailyRevenue.has(dateStr)) {
          dailyRevenue.set(dateStr, revenue);
          console.log(`Added revenue ${revenue} for date: ${dateStr}`);
        }
      }
      
      // Create formatted data points for each day
      for (const [dateKey, revenue] of dailyRevenue.entries()) {
        formattedRevenueTrend.push({
          date: dateKey,
          revenue: revenue,
        });
      }
      
      // Sort chronologically
      formattedRevenueTrend.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      console.log("Week data points:", formattedRevenueTrend.map(item => item.date));
      
    } else if (period === "month") {
      // For month, ensure we have daily entries with proper data
      const dailyRevenue = new Map();
      
      // Re-calculate the start date to ensure consistency
      // For "month", we want the last 30 days including today
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 29); // This gives exactly 30 days
      startDate.setHours(0, 0, 0, 0);
      
      const startDateString = startDate.toISOString().split('T')[0];
      console.log("Confirmed month period start date string:", startDateString);
      
      // Initialize map with all days in the month period (with zero revenue)
      const numDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Debug: Log the first few days we're going to generate
      const debugDays = [];
      for (let i = 0; i < Math.min(5, numDays); i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        debugDays.push(date.toISOString().split('T')[0]);
      }
      console.log("First few days in month period:", debugDays);
      
      for (let i = 0; i < numDays; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        // Format as YYYY-MM-DD
        const dateKey = date.toISOString().split('T')[0];
        dailyRevenue.set(dateKey, 0);
      }
      
      // Add actual revenue data from existing map
      for (const [dateStr, revenue] of revenueTrend.entries()) {
        if (dailyRevenue.has(dateStr)) {
          dailyRevenue.set(dateStr, revenue);
        }
      }
      
      // Create formatted data points for each day
      for (const [dateKey, revenue] of dailyRevenue.entries()) {
        formattedRevenueTrend.push({
          date: dateKey,
          revenue: revenue,
        });
      }
      
      // Sort chronologically
      formattedRevenueTrend.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      // After sorting, double-check that the first date is the expected start date
      if (formattedRevenueTrend.length > 0 && period === 'month') {
        const firstDateInResponse = formattedRevenueTrend[0].date;
        const expectedStartDate = new Date(today);
        expectedStartDate.setDate(today.getDate() - 29);
        expectedStartDate.setHours(0, 0, 0, 0);
        const expectedStartDateString = expectedStartDate.toISOString().split('T')[0];
        
        console.log("First date in response:", firstDateInResponse);
        console.log("Expected start date:", expectedStartDateString);
        
        if (firstDateInResponse !== expectedStartDateString) {
          console.warn("⚠️ Date mismatch in response! Fixing the first date...");
          
          // If there's a mismatch, make sure we include the correct start date
          if (!formattedRevenueTrend.some(item => item.date === expectedStartDateString)) {
            formattedRevenueTrend.unshift({
              date: expectedStartDateString,
              revenue: 0
            });
            console.log("Added missing start date:", expectedStartDateString);
          }
          
          // Re-sort to ensure proper order
          formattedRevenueTrend.sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );
        }
      }
      
    } else if (period === "year") {
      // For year, create monthly data points and aggregate revenue by month
      const monthlyRevenue = new Map();
      
      // Initialize all months with zero - MODIFIED to include current month
      const yearStart = new Date(startDate);
      // Calculate how many months to include (12 complete months + current partial month)
      const currentDate = new Date(today);
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      
      // Create entries for each month in the 365-day period
      let months = 0;
      const tempDate = new Date(yearStart);
      
      // Keep adding months until we reach the current month/year
      while (
        tempDate.getFullYear() < currentYear || 
        (tempDate.getFullYear() === currentYear && tempDate.getMonth() <= currentMonth)
      ) {
        const monthKey = tempDate.toISOString().substring(0, 7); // YYYY-MM format
        monthlyRevenue.set(monthKey, 0);
        
        // Move to next month
        tempDate.setMonth(tempDate.getMonth() + 1);
        months++;
        
        // Safety check to prevent infinite loops (shouldn't happen, but just in case)
        if (months > 13) break;
      }
      
      // Aggregate revenue by month
      for (const [dateStr, revenue] of revenueTrend.entries()) {
        const monthKey = dateStr.substring(0, 7); // YYYY-MM format
        if (monthlyRevenue.has(monthKey)) {
          monthlyRevenue.set(monthKey, monthlyRevenue.get(monthKey) + revenue);
        }
      }
      
      console.log("Monthly revenue map for year view:", Array.from(monthlyRevenue.entries()));
      
      // Create formatted data points for each month
      for (const [monthKey, revenue] of monthlyRevenue.entries()) {
        formattedRevenueTrend.push({
          date: monthKey + "-01", // Use first day of month for consistent formatting
          revenue: revenue,
        });
      }
    } else {
      // For any other period types, just return the raw data
      for (const [dateKey, revenue] of revenueTrend.entries()) {
        formattedRevenueTrend.push({
          date: dateKey,
          revenue: revenue,
        });
      }
      
      // Sort chronologically
      formattedRevenueTrend.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }
    
    console.log(`Generated ${formattedRevenueTrend.length} data points for ${period} view`);
    console.log("First few data points:", formattedRevenueTrend.slice(0, 3));
    console.log("Last few data points:", formattedRevenueTrend.slice(-3));
    
    const formattedRevenueByCategory = Array.from(revenueByCategory.entries()).map(([category, amount]) => ({
      category,
      revenue: amount,
    }));
    
    const formattedRevenueByPaymentMethod = Array.from(revenueByPaymentMethod.entries()).map(([method, amount]) => ({
      method,
      revenue: amount,
    }));
    
    // Format top products data - sort by revenue and take top 10
    const topProducts = Array.from(productPerformance.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    
    // Format peak hours data
    const peakHoursData = orderCountsByHour.map((count, hour) => ({
      hour: `${hour}:00`,
      orders: count,
    }));
    
    // Calculate average order value based on completed orders
    const averageOrderValue = completedOrders > 0 ? (totalRevenue / completedOrders) : 0;
    
    // Process previous period orders
    let previousTotalRevenue = 0;
    const previousTotalOrders = previousPeriodOrders.length;
    
    // Process previous period orders for revenue
    previousPeriodOrders.forEach((order) => {
      // Only include COMPLETED and DELIVERED orders in revenue calculations
      const isCompletedOrder = order.status === "COMPLETED" || order.status === "DELIVERED";
      
      if (isCompletedOrder) {
        // Calculate the correct total for the order
        const subtotal = order.items.reduce((sum, item) => {
          return sum + (item.price * item.quantity);
        }, 0);
        const deliveryFee = order.deliveryFee || 0;
        const pointsDiscount = order.pointsUsed || 0;
        const correctTotal = subtotal + deliveryFee - pointsDiscount;
        
        // Add to previous total revenue only if completed
        previousTotalRevenue += correctTotal;
      }
    });

    // Count previous period completed orders
    const previousCompletedOrders = previousPeriodOrders.filter(
      order => order.status === "COMPLETED" || order.status === "DELIVERED"
    ).length;
    
    // Calculate previous average order value
    const previousAverageOrderValue = previousCompletedOrders > 0 
      ? (previousTotalRevenue / previousCompletedOrders) 
      : 0;
    
    // Calculate percentage changes
    const calculatePercentageChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };
    
    const revenueChange = calculatePercentageChange(totalRevenue, previousTotalRevenue);
    const ordersChange = calculatePercentageChange(totalOrders, previousTotalOrders);
    const completedOrdersChange = calculatePercentageChange(completedOrders, previousCompletedOrders);
    const averageOrderValueChange = calculatePercentageChange(averageOrderValue, previousAverageOrderValue);
    
    // Return analytics data with comparison metrics
    const analyticsData = {
      currentPeriod: {
        totalRevenue,
        totalOrders,
        completedOrders,
        averageOrderValue,
      },
      previousPeriod: {
        totalRevenue: previousTotalRevenue,
        totalOrders: previousTotalOrders,
        completedOrders: previousCompletedOrders,
        averageOrderValue: previousAverageOrderValue,
      },
      comparison: {
        revenueChange,
        ordersChange,
        completedOrdersChange,
        averageOrderValueChange,
      },
      revenueTrend: formattedRevenueTrend,
      peakHours: peakHoursData,
      revenueByCategory: formattedRevenueByCategory,
      revenueByPaymentMethod: formattedRevenueByPaymentMethod,
      topProducts
    };
    
    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error("Error fetching analytics data:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
} 