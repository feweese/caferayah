"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Icons } from "@/components/icons";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { Loader2, ArrowUpIcon, ArrowDownIcon, ArrowRightIcon } from "lucide-react";

// Colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d"];

// Define standard chart text styling to use across all charts
const CHART_TEXT_STYLE = {
  fill: "#71717a", // A neutral slate color that works in both light/dark modes
  fontSize: 12,
  fontWeight: "500"
};

// Custom tooltip component for consistent styling across all charts
const CustomTooltip = ({ active, payload, label, labelFormatter }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  // Check if this is a pie chart tooltip
  const isPieChart = payload[0]?.name === "value" || 
                     payload[0]?.dataKey === "value" || 
                     payload[0]?.value !== undefined && !payload[0]?.name;
  
  if (isPieChart) {
    // Access data from pie chart
    const item = payload[0];
    const payloadData = item.payload || {};
    
    // Get name from payload
    const name = payloadData.name || payloadData.category || payloadData.method || "Unknown";
    const value = item.value;
    
    // Get the index from payload to determine color
    const index = payloadData.colorIndex || 0;
    const color = COLORS[index % COLORS.length];
    
    // Determine title
    const title = payloadData._tooltipTitle || "Category";
    
    return (
      <div className="custom-tooltip bg-background border border-border p-3 rounded-md shadow-md">
        <p className="font-medium text-sm mb-2">{title}</p>
        <div className="flex items-center mb-1">
          <div 
            className="w-3 h-3 mr-2" 
            style={{ backgroundColor: color }}
          />
          <span className="text-sm">
            <span className="font-medium">₱{value.toLocaleString()}</span>
            <span className="text-muted-foreground ml-2">{name}</span>
          </span>
        </div>
      </div>
    );
  }
  
  // For custom label formatting, prefer the passed formatter or get from payload
  let formattedLabel = label;
  
  // Use tooltipDate for consistent display
  if (payload[0]?.payload?.tooltipDate) {
    // Check if this is time data (from day view)
    if (payload[0]?.payload?.isTimeData) {
      formattedLabel = `Time: ${payload[0].payload.tooltipDate}`;
    } else {
      formattedLabel = `Date: ${payload[0].payload.tooltipDate}`;
    }
  } else if (labelFormatter) {
    formattedLabel = labelFormatter(label, payload);
  }
  
  return (
    <div className="custom-tooltip bg-background border border-border p-3 rounded-md shadow-md">
      <p className="font-medium text-sm mb-2">{formattedLabel}</p>
      {payload.map((entry: any, index: number) => {
        // Get color from the entry or fallback to a default
        const color = entry.color || entry.stroke || entry.fill || "#0088FE";
        const name = entry.name;
        const value = entry.value;
        
        // Format the value (handle currency if needed)
        let formattedValue = value;
        if (
          name?.toLowerCase()?.includes("revenue") || 
          typeof value === "number" && name?.toLowerCase() !== "orders" && 
          name?.toLowerCase() !== "quantity"
        ) {
          formattedValue = typeof value === "number" 
            ? `₱${value.toLocaleString()}`
            : value;
        }
        
        return (
          <div key={`tooltip-item-${index}`} className="flex items-center mb-1 last:mb-0">
            <div 
              className="w-3 h-3 mr-2" 
              style={{ backgroundColor: color }}
            />
            <span className="text-sm">
              <span className="font-medium">{formattedValue}</span>
              <span className="text-muted-foreground ml-2">{name}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
};

// Type definitions for analytics data
interface AnalyticsData {
  currentPeriod: {
    totalRevenue: number;
    totalOrders: number;
    completedOrders: number;
    averageOrderValue: number;
  };
  previousPeriod: {
    totalRevenue: number;
    totalOrders: number;
    completedOrders: number;
    averageOrderValue: number;
  };
  comparison: {
    revenueChange: number;
    ordersChange: number;
    completedOrdersChange: number;
    averageOrderValueChange: number;
  };
  revenueTrend: { date: string; revenue: number }[];
  peakHours: { hour: string; orders: number }[];
  revenueByCategory: { category: string; revenue: number }[];
  revenueByPaymentMethod: { method: string; revenue: number }[];
  topProducts: { id: string; name: string; quantity: number; revenue: number; category: string }[];
}

// Add a helper function to render percentage change indicators
const PercentageChange = ({ value }: { value: number }) => {
  const formattedValue = Math.abs(value).toFixed(1);
  if (value > 0) {
    return (
      <div className="flex items-center text-green-600 text-sm font-medium">
        <ArrowUpIcon className="h-4 w-4 mr-1" />
        {formattedValue}%
      </div>
    );
  } else if (value < 0) {
    return (
      <div className="flex items-center text-red-600 text-sm font-medium">
        <ArrowDownIcon className="h-4 w-4 mr-1" />
        {formattedValue}%
      </div>
    );
  } else {
    return (
      <div className="flex items-center text-gray-500 text-sm font-medium">
        <ArrowRightIcon className="h-4 w-4 mr-1" />
        0%
      </div>
    );
  }
};

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("month");

  // Add logging for debugging the data formats
  useEffect(() => {
    if (analyticsData && !isLoading) {
      console.log('Category data:', formatCategoryData());
      console.log('Payment method data:', formatPaymentMethodData());
    }
  }, [analyticsData, isLoading]);

  // Apply custom styles for tooltips
  useEffect(() => {
    // Add custom styles to document head to improve tooltip visibility
    if (typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.innerHTML = `
        .recharts-tooltip-wrapper .recharts-default-tooltip {
          background-color: rgba(0, 0, 0, 0.85) !important;
          border: 1px solid #ccc !important;
          border-radius: 4px !important;
          padding: 10px !important;
        }
        .recharts-tooltip-wrapper .recharts-default-tooltip .recharts-tooltip-label {
          color: white !important;
          font-weight: bold !important;
          margin-bottom: 8px !important;
          display: block !important;
        }
        .recharts-tooltip-wrapper .recharts-default-tooltip .recharts-tooltip-item {
          color: white !important;
          padding: 4px 0 !important;
          display: flex !important;
          align-items: center !important;
          gap: 6px !important;
        }
        .recharts-tooltip-wrapper .recharts-default-tooltip .recharts-tooltip-item-name {
          color: #ccc !important;
        }
        .recharts-tooltip-wrapper .recharts-default-tooltip .recharts-tooltip-item-value {
          font-weight: bold !important;
        }
        .tooltip-color-indicator {
          display: inline-block;
          width: 10px;
          height: 10px;
          margin-right: 4px;
        }
      `;
      document.head.appendChild(style);
      
      // Cleanup function to remove the style when component unmounts
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/analytics?period=${selectedPeriod}`);
        if (!response.ok) {
          throw new Error("Failed to fetch analytics data");
        }
        const data = await response.json();
        setAnalyticsData(data);
        
        // Check for month view data consistency
        if (selectedPeriod === 'month' && data.revenueTrend && data.revenueTrend.length > 0) {
          const firstDataPoint = data.revenueTrend[0];
          const expectedStartDate = getStartDateForPeriod('month');
          const expectedDateStr = expectedStartDate.toISOString().split('T')[0];
          const actualDateStr = firstDataPoint.date;
          
          console.log("Month data verification (updated):");
          console.log("- Expected first date:", expectedDateStr); // Should now be April 10
          console.log("- Actual first date:", actualDateStr);
          
          if (expectedDateStr !== actualDateStr) {
            console.warn("⚠️ Date mismatch in month view! This may cause inconsistent display.");
          } else {
            console.log("✓ Month view dates are consistent between API and UI.");
          }
        }
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [selectedPeriod]);

  // Format category names for better display
  const formatCategoryName = (category: string) => {
    return category
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Format payment method names for better display
  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case "CASH_ON_DELIVERY":
        return "Cash on Delivery";
      case "IN_STORE":
        return "In Store";
      case "GCASH":
        return "GCash";
      default:
        return method;
    }
  };

  // Add a utility function to ensure consistent date handling
  const createConsistentDateString = (dateStr: string) => {
    // Always append the time and Z suffix to create consistent UTC dates
    return new Date(dateStr + 'T00:00:00Z');
  };

  // Helper function to get the correct start date for a period
  const getStartDateForPeriod = (period: string) => {
    const now = new Date();
    let startDate = new Date(now);
    
    switch(period) {
      case "day":
        startDate.setHours(0, 0, 0, 0);
        break;
      case "week":
        startDate.setDate(now.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "month":
        // For month, calculation should match exactly what the server does
        // The API is using April 10 as the first date (inclusive)
        // This is 30 days total when counting from April 10 to May 10
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 1);
        startDate.setHours(0, 0, 0, 0);
        
        // Log for verification 
        console.log("Fixed frontend month period calculation:");
        console.log("- Today's date:", now.toISOString());
        console.log("- Adjusted start date:", startDate.toISOString());
        console.log("- Day of month for start date:", startDate.getDate());
        break;
      case "year":
        startDate.setDate(now.getDate() - 364);
        startDate.setHours(0, 0, 0, 0);
        // Get first day of that month
        const firstMonth = startDate.getMonth();
        const firstYear = startDate.getFullYear();
        startDate = new Date(firstYear, firstMonth, 1);
        break;
    }
    
    return startDate;
  };

  // Format data for better display in charts with proper date handling
  const formatRevenueTrendData = () => {
    if (!analyticsData || !analyticsData.revenueTrend || analyticsData.revenueTrend.length === 0) return [];
    
    console.log("Raw revenue trend dates from API:", analyticsData.revenueTrend);
    
    // Debug if month period: log the first date
    if (selectedPeriod === 'month' && analyticsData.revenueTrend.length > 0) {
      const firstDate = analyticsData.revenueTrend[0].date;
      console.log("First date in month data from API:", firstDate);
      console.log("First date converted to local:", new Date(firstDate).toLocaleDateString());
    }
    
    // Properly sort the dates chronologically
    const sortedData = [...analyticsData.revenueTrend].sort((a, b) => {
      if (selectedPeriod === 'day' && a.hour !== undefined && b.hour !== undefined) {
        // For day period, sort by hour
        return a.hour - b.hour;
      }
      // Otherwise sort by date
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    
    console.log("Sorted data:", sortedData);
    
    // For month view, find month transitions to improve x-axis labeling
    const monthTransitions = new Set();
    const importantDates = new Set();
    
    // For year view, track where the year changes
    const yearTransitions = new Map(); // Maps index to year
    let prevYear = null;
    
    if (selectedPeriod === 'month') {
      // Process all dates to find important ones
      sortedData.forEach((item) => {
        // Use consistent date objects with correct timezone handling
        // Add the 'T00:00:00Z' to ensure consistent date interpretation
        const dateObj = new Date(item.date + 'T00:00:00Z');
        const day = dateObj.getDate();
        
        // Month transitions (1st of month)
        if (day === 1) {
          monthTransitions.add(item.date);
          importantDates.add(item.date);
        }
        
        // Important days - 5th, 10th, 15th, 20th, 25th, 30th
        if (day === 5 || day === 10 || day === 15 || 
            day === 20 || day === 25 || day === 30) {
          importantDates.add(item.date);
        }
      });
      
      // Always add the first and last dates as important
      if (sortedData.length > 0) {
        const firstDate = sortedData[0].date;
        const lastDate = sortedData[sortedData.length - 1].date;
        
        // Log the first date for debugging 
        console.log("First date in sorted month data:", firstDate);
        console.log("First date as Date object:", new Date(firstDate + 'T00:00:00Z').toISOString());
        
        importantDates.add(firstDate);
        importantDates.add(lastDate);
      }
      
      console.log("Month transitions:", Array.from(monthTransitions));
      console.log("Important dates:", Array.from(importantDates));
    } else if (selectedPeriod === 'year') {
      // For year view, find where the year changes
      sortedData.forEach((item, index) => {
        const dateObj = new Date(item.date + "T00:00:00Z");
        const year = dateObj.getFullYear();
        
        // Track year transitions
        if (prevYear === null) {
          prevYear = year;
          yearTransitions.set(index, year);
        } else if (year !== prevYear) {
          yearTransitions.set(index, year); // Mark this index as a year transition
          prevYear = year;
        }
      });
      
      // Check if the data includes the current month
      const lastItemDate = sortedData.length > 0 ? new Date(sortedData[sortedData.length - 1].date + "T00:00:00Z") : null;
      const currentDate = new Date();
      const isCurrentMonthIncluded = lastItemDate && 
        lastItemDate.getMonth() === currentDate.getMonth() &&
        lastItemDate.getFullYear() === currentDate.getFullYear();
      
      console.log("Year data includes current month:", isCurrentMonthIncluded);
      console.log("Year transitions:", Array.from(yearTransitions.entries()));
    }
    
    const formattedData = sortedData.map((item, index) => {
      // Special handling for day period with hourly data
      if (selectedPeriod === 'day' && item.hour !== undefined) {
        const hour = item.hour;
        // Format hour as 12-hour time with AM/PM
        const hour12 = hour % 12 || 12;
        const amPm = hour >= 12 ? 'PM' : 'AM';
        const formattedHour = `${hour12} ${amPm}`;
        
        return {
          ...item, 
          date: formattedHour,
          tooltipDate: formattedHour,
          isTimeData: true, // Mark this as time data for the tooltip
          revenue: Number(item.revenue.toFixed(2))
        };
      }
      
      // Use our utility function for consistent date handling
      const dateObj = createConsistentDateString(item.date);
      
      // Always create a consistent complete date format for tooltips
      let consistentTooltipDate;
      if (selectedPeriod === 'year') {
        // For year view, include the month name and full year in tooltip
        consistentTooltipDate = dateObj.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric'
        });
      } else {
        // For other views, show month and day
        consistentTooltipDate = dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      }
      
      let formattedDate;
      switch (selectedPeriod) {
        case 'week':
          // For week, show month name + day (e.g., May 10)
          formattedDate = dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
          break;
          
        case 'month':
          // For month view, always show month + day format
          // Verify that this matches the expected date format
          formattedDate = dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
          
          if (index === 0) {
            // Compare the first date with what we expect from the date range string
            const expectedStartDate = getStartDateForPeriod('month');
            console.log("Expected first date for month:", expectedStartDate.toISOString());
            console.log("Actual first date in chart:", dateObj.toISOString());
            
            // Log the day for debugging
            console.log("Expected day:", expectedStartDate.getDate());
            console.log("Actual day:", dateObj.getDate());
          }
          break;
          
        case 'year':
          // For year view, check if this is where the year changes
          const year = dateObj.getFullYear();
          const isYearTransition = yearTransitions.has(index);
          
          // Check if this is the current month/year
          const now = new Date();
          const isCurrentMonth = dateObj.getMonth() === now.getMonth() && 
                               dateObj.getFullYear() === now.getFullYear();
          
          // If it's a year transition or the first month, include the year 
          if (isYearTransition || index === 0) {
            formattedDate = dateObj.toLocaleDateString('en-US', {
              month: 'short',
              year: '2-digit'
            });
          } else {
            // Otherwise just show the month
            formattedDate = dateObj.toLocaleDateString('en-US', {
              month: 'short'
            });
          }
          
          // Append "†" to current month to indicate partial data
          if (isCurrentMonth) {
            formattedDate += "†";
          }
          break;
          
        default:
          // Default format
          formattedDate = dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          });
      }
      
      return {
        ...item,
        originalDate: item.date, // Keep the original date for debugging
        date: formattedDate,
        tooltipDate: consistentTooltipDate, // Consistent format for tooltips
        isMonthTransition: selectedPeriod === 'month' && monthTransitions.has(item.date),
        isImportantDate: selectedPeriod === 'month' && importantDates.has(item.date),
        isYearTransition: selectedPeriod === 'year' && yearTransitions.has(index),
        year: dateObj.getFullYear(), // Store the year for reference
        revenue: Number(item.revenue.toFixed(2))
      };
    });
    
    return formattedData;
  };

  const formatCategoryData = () => {
    if (!analyticsData) return [];
    return analyticsData.revenueByCategory.map((item, index) => ({
      ...item,
      category: formatCategoryName(item.category),
      revenue: Number(item.revenue.toFixed(2)),
      colorIndex: index, // Store the index for color lookup
      color: COLORS[index % COLORS.length] // Store the actual color
    }));
  };

  const formatPaymentMethodData = () => {
    if (!analyticsData) return [];
    return analyticsData.revenueByPaymentMethod.map((item, index) => ({
      ...item,
      method: formatPaymentMethod(item.method),
      revenue: Number(item.revenue.toFixed(2)),
      colorIndex: index, // Store the index for color lookup
      color: COLORS[index % COLORS.length] // Store the actual color
    }));
  };

  // Function to format top products data for the chart
  const formatTopProductsData = () => {
    if (!analyticsData || !analyticsData.topProducts) return [];
    
    return analyticsData.topProducts.map(product => ({
      name: product.name.length > 15 ? product.name.substring(0, 15) + '...' : product.name,
      revenue: parseFloat(product.revenue.toFixed(2)),
      quantity: product.quantity,
    }));
  };

  // Helper function to generate a date range string based on the selected period
  const getPeriodDateRange = (period: string) => {
    const now = new Date();
    
    // Use our consistent start date calculation function
    const startDate = getStartDateForPeriod(period);
    
    switch(period) {
      case "day":
        return `Today: ${now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
      case "week":
        return `Last 7 days: ${startDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })} - ${now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
      case "month": 
        // Hard-code April 10 for month view when today is May 10
        // This ensures consistency with the API data
        const today = now.getDate();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Create the exact start date string that the API is using
        const apiStartDate = new Date(currentYear, currentMonth - 1, today); // Go back one month, same day
        console.log("Hard-coded start date:", apiStartDate.toISOString());
        
        return `Last 30 days: ${apiStartDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })} - ${now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
      case "year":
        // Get first day of month for year view
        const firstMonth = startDate.getMonth();
        const firstYear = startDate.getFullYear();
        const startDateFirstOfMonth = new Date(firstYear, firstMonth, 1);
        
        return `Last 365 days: ${startDateFirstOfMonth.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} - ${now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
      default:
        return `${startDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })} - ${now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
    }
  };

  return (
    <AdminLayout>
      <div className="container px-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Sales Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Track sales performance and revenue metrics
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <TabsList>
                <TabsTrigger value="day">Today</TabsTrigger>
                <TabsTrigger value="week">Last 7 Days</TabsTrigger>
                <TabsTrigger value="month">Last 30 Days</TabsTrigger>
                <TabsTrigger value="year">Last 365 Days</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-10 w-1/2" />
              ) : (
                <>
                  <div className="text-3xl font-bold">
                    {analyticsData?.currentPeriod ? formatCurrency(analyticsData.currentPeriod.totalRevenue) : "₱0.00"}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">
                      From {analyticsData?.currentPeriod?.completedOrders || 0} completed orders
                    </p>
                    {analyticsData?.comparison && (
                      <PercentageChange value={analyticsData.comparison.revenueChange} />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    vs previous {selectedPeriod === 'day' ? 'day' : 
                                selectedPeriod === 'week' ? '7 days' : 
                                selectedPeriod === 'month' ? '30 days' : '365 days'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-10 w-1/2" />
              ) : (
                <>
                  <div className="text-3xl font-bold">
                    {analyticsData?.currentPeriod ? analyticsData.currentPeriod.totalOrders : 0}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">
                      All non-cancelled orders
                    </p>
                    {analyticsData?.comparison && (
                      <PercentageChange value={analyticsData.comparison.ordersChange} />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    vs previous {selectedPeriod === 'day' ? 'day' : 
                                selectedPeriod === 'week' ? '7 days' : 
                                selectedPeriod === 'month' ? '30 days' : '365 days'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-10 w-1/2" />
              ) : (
                <>
                  <div className="text-3xl font-bold">
                    {analyticsData?.currentPeriod ? analyticsData.currentPeriod.completedOrders : 0}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">
                      Successfully fulfilled
                    </p>
                    {analyticsData?.comparison && (
                      <PercentageChange value={analyticsData.comparison.completedOrdersChange} />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    vs previous {selectedPeriod === 'day' ? 'day' : 
                                selectedPeriod === 'week' ? '7 days' : 
                                selectedPeriod === 'month' ? '30 days' : '365 days'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Order Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-10 w-1/2" />
              ) : (
                <>
                  <div className="text-3xl font-bold">
                    {analyticsData?.currentPeriod
                      ? formatCurrency(analyticsData.currentPeriod.averageOrderValue)
                      : "₱0.00"}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">
                      Revenue per order
                    </p>
                    {analyticsData?.comparison && (
                      <PercentageChange value={analyticsData.comparison.averageOrderValueChange} />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    vs previous {selectedPeriod === 'day' ? 'day' : 
                                selectedPeriod === 'week' ? '7 days' : 
                                selectedPeriod === 'month' ? '30 days' : '365 days'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add a comparison overview card */}
        {!isLoading && analyticsData?.comparison && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Period-over-Period Comparison</CardTitle>
              <CardDescription>
                Performance comparison vs previous {selectedPeriod === 'day' ? 'day' : 
                                                    selectedPeriod === 'week' ? '7 days' : 
                                                    selectedPeriod === 'month' ? '30 days' : '365 days'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Revenue Change</p>
                  <div className="flex items-center">
                    <PercentageChange value={analyticsData.comparison.revenueChange} />
                    <span className="ml-2">
                      {formatCurrency(analyticsData.currentPeriod.totalRevenue - analyticsData.previousPeriod.totalRevenue)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(analyticsData.currentPeriod.totalRevenue)} vs {formatCurrency(analyticsData.previousPeriod.totalRevenue)}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Orders Change</p>
                  <div className="flex items-center">
                    <PercentageChange value={analyticsData.comparison.ordersChange} />
                    <span className="ml-2">
                      {analyticsData.currentPeriod.totalOrders - analyticsData.previousPeriod.totalOrders} orders
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {analyticsData.currentPeriod.totalOrders} vs {analyticsData.previousPeriod.totalOrders}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Completed Orders Change</p>
                  <div className="flex items-center">
                    <PercentageChange value={analyticsData.comparison.completedOrdersChange} />
                    <span className="ml-2">
                      {analyticsData.currentPeriod.completedOrders - analyticsData.previousPeriod.completedOrders} orders
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {analyticsData.currentPeriod.completedOrders} vs {analyticsData.previousPeriod.completedOrders}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Avg Order Value Change</p>
                  <div className="flex items-center">
                    <PercentageChange value={analyticsData.comparison.averageOrderValueChange} />
                    <span className="ml-2">
                      {formatCurrency(analyticsData.currentPeriod.averageOrderValue - analyticsData.previousPeriod.averageOrderValue)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(analyticsData.currentPeriod.averageOrderValue)} vs {formatCurrency(analyticsData.previousPeriod.averageOrderValue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Revenue Trend Chart */}
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>
                Revenue trend over {selectedPeriod === 'day' ? 'today (hourly)' : 
                                   selectedPeriod === 'week' ? 'the last 7 days' : 
                                   selectedPeriod === 'month' ? 'the last 30 days' : 
                                   'the last 365 days'}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : analyticsData && analyticsData.revenueTrend.length > 0 ? (
                <div className="flex flex-col h-full">
                  <ResponsiveContainer width="100%" height="85%">
                    <AreaChart
                      data={formatRevenueTrendData()}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 10,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={(props) => {
                          const { x, y, payload, index } = props;
                          const dataPoint = formatRevenueTrendData()[index];
                          const originalDate = dataPoint?.originalDate;
                          
                          // Special handling for day view with time data
                          if (selectedPeriod === 'day' && dataPoint?.isTimeData) {
                            const showTick = index % 3 === 0 || index === 0 || 
                                            index === formatRevenueTrendData().length - 1;
                            
                            if (!showTick) return null;
                            
                            return (
                              <g transform={`translate(${x},${y})`}>
                                <text 
                                  x={0} 
                                  y={0} 
                                  dy={16} 
                                  textAnchor="middle" 
                                  fill={CHART_TEXT_STYLE.fill}
                                  fontWeight={CHART_TEXT_STYLE.fontWeight}
                                  fontSize={CHART_TEXT_STYLE.fontSize}
                                >
                                  {payload.value}
                                </text>
                              </g>
                            );
                          }
                          
                          if (!originalDate) return null;
                          
                          // Rest of the existing tick rendering logic
                          const textFill = CHART_TEXT_STYLE.fill;
                          let fontWeight = CHART_TEXT_STYLE.fontWeight;
                          let fontSize = CHART_TEXT_STYLE.fontSize;
                          let rotateAngle = 0;
                          let showTick = true;
                          
                          // Special handling for different periods
                          if (selectedPeriod === 'month') {
                            // For month view, apply systematic filtering
                            const dateObj = new Date(originalDate + "T00:00:00Z");
                            const day = dateObj.getDate();
                            
                            // Key dates to show
                            const isFirstOrLastDay = 
                              index === 0 || 
                              index === formatRevenueTrendData().length - 1;
                            const isMonthTransition = day === 1;
                            const isKeyDate = day === 5 || day === 10 || 
                                            day === 15 || day === 20 || 
                                            day === 25 || day === 30;
                            const isEveryFifthDay = day % 5 === 0;
                            
                            showTick = isFirstOrLastDay || isMonthTransition || 
                                      isKeyDate || isEveryFifthDay;
                                      
                            // Special styling for month transitions
                            if (isMonthTransition) {
                              fontWeight = "bold";
                              fontSize = 13;
                            }
                            
                            rotateAngle = -30;
                            
                          } else if (selectedPeriod === 'week') {
                            // For week view, ensure all days are visible with proper contrast
                            rotateAngle = -20;
                            
                          } else if (selectedPeriod === 'year') {
                            // For year view, no need for much filtering
                            rotateAngle = 0;
                          }
                          
                          if (!showTick) return null;
                          
                          return (
                            <g transform={`translate(${x},${y})`}>
                              <text 
                                x={0} 
                                y={0} 
                                dy={16} 
                                textAnchor="middle" 
                                fill={textFill}
                                fontWeight={fontWeight}
                                fontSize={fontSize}
                                transform={`rotate(${rotateAngle})`}
                              >
                                {payload.value}
                              </text>
                            </g>
                          );
                        }}
                        interval={0}
                        padding={{ left: 10, right: 10 }}
                        height={selectedPeriod === 'month' ? 60 : 
                                 selectedPeriod === 'week' ? 50 : 40}
                      />
                      <YAxis 
                        tickFormatter={(value) => `₱${value}`}
                        tick={{ ...CHART_TEXT_STYLE }}
                      />
                      <Tooltip 
                        labelFormatter={(label, payload) => {
                          // Find the original data point to get the consistent tooltip date
                          if (payload && payload.length > 0) {
                            const dataPoint = payload[0].payload;
                            if (dataPoint && dataPoint.tooltipDate) {
                              // Check if this is time data (from day view)
                              if (dataPoint.isTimeData) {
                                return `Time: ${dataPoint.tooltipDate}`;
                              }
                              return `Date: ${dataPoint.tooltipDate}`;
                            }
                          }
                          return `Date: ${label}`;
                        }}
                        content={<CustomTooltip />}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.2}
                        name="Revenue"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-1">
                    {analyticsData?.comparison && (
                      <div className="flex items-center text-sm font-medium">
                        {analyticsData.comparison.revenueChange >= 0 ? (
                          <ArrowUpIcon className="h-4 w-4 mr-1 text-green-500" />
                        ) : (
                          <ArrowDownIcon className="h-4 w-4 mr-1 text-red-500" />
                        )}
                        <span className={analyticsData.comparison.revenueChange >= 0 ? "text-green-500" : "text-red-500"}>
                          Trending {analyticsData.comparison.revenueChange >= 0 ? "up" : "down"} by {Math.abs(analyticsData.comparison.revenueChange).toFixed(1)}% over {
                            selectedPeriod === 'day' ? 'today' : 
                            selectedPeriod === 'week' ? 'the last 7 days' : 
                            selectedPeriod === 'month' ? 'the last 30 days' : 
                            'the last 365 days'
                          }
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {getPeriodDateRange(selectedPeriod)}
                    </div>
                    {/* Add note for partial month data */}
                    {selectedPeriod === 'year' && (
                      <div className="text-xs text-muted-foreground mt-2">
                        † Indicates current month (partial data)
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No data available for this period
                </div>
              )}
            </CardContent>
          </Card>

          {/* Peak Hours Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Peak Hours</CardTitle>
              <CardDescription>
                Orders by hour of day {selectedPeriod === 'day' ? 'today' : 
                                      selectedPeriod === 'week' ? 'over the last 7 days' : 
                                      selectedPeriod === 'month' ? 'over the last 30 days' : 
                                      'over the last 365 days'}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : analyticsData && analyticsData.peakHours.some(item => item.orders > 0) ? (
                <div className="flex flex-col h-full">
                  <ResponsiveContainer width="100%" height="85%">
                    <BarChart
                      data={analyticsData.peakHours}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 40,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="hour" 
                        angle={-45} 
                        textAnchor="end"
                        height={60}
                        tick={{ ...CHART_TEXT_STYLE }}
                        interval={selectedPeriod === "week" ? 0 : "auto"}
                      />
                      <YAxis 
                        allowDecimals={false}
                        tick={{ ...CHART_TEXT_STYLE }}
                      />
                      <Tooltip 
                        labelFormatter={(label) => `Time: ${label}`}
                        content={<CustomTooltip />}
                      />
                      <Legend />
                      <Bar
                        dataKey="orders"
                        name="Orders"
                        fill="#0088FE"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {getPeriodDateRange(selectedPeriod)}
                    {/* Add note for partial month data */}
                    {selectedPeriod === 'year' && (
                      <div className="mt-1">
                        † Includes current month (partial data)
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No data available for this period
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revenue by Category Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Category</CardTitle>
              <CardDescription>
                Sales distribution by product category {selectedPeriod === 'day' ? 'today' : 
                                                      selectedPeriod === 'week' ? 'over the last 7 days' : 
                                                      selectedPeriod === 'month' ? 'over the last 30 days' : 
                                                      'over the last 365 days'}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : analyticsData && analyticsData.revenueByCategory.length > 0 ? (
                <div className="flex flex-col h-full">
                  <ResponsiveContainer width="100%" height="85%">
                    <PieChart>
                      <Pie
                        data={formatCategoryData().map((item, index) => ({
                          name: item.category,
                          value: item.revenue,
                          colorIndex: index,
                          _tooltipTitle: "Category",
                          fill: COLORS[index % COLORS.length],
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        dataKey="value"
                        nameKey="name"
                      >
                        {formatCategoryData().map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={<CustomTooltip />}
                        formatter={(value, name, props) => {
                          // This helps ensure the color is passed correctly
                          return [value, name, { color: props.fill }];
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {getPeriodDateRange(selectedPeriod)}
                    {/* Add note for partial month data */}
                    {selectedPeriod === 'year' && (
                      <div className="mt-1">
                        † Includes current month (partial data)
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No data available for this period
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revenue by Payment Method Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Payment Method</CardTitle>
              <CardDescription>
                Sales distribution by payment method {selectedPeriod === 'day' ? 'today' : 
                                                    selectedPeriod === 'week' ? 'over the last 7 days' : 
                                                    selectedPeriod === 'month' ? 'over the last 30 days' : 
                                                    'over the last 365 days'}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {isLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : analyticsData && analyticsData.revenueByPaymentMethod.length > 0 ? (
                <div className="flex flex-col h-full">
                  <ResponsiveContainer width="100%" height="85%">
                    <PieChart>
                      <Pie
                        data={formatPaymentMethodData().map((item, index) => ({
                          name: item.method,
                          value: item.revenue,
                          colorIndex: index,
                          _tooltipTitle: "Payment Method",
                          fill: COLORS[index % COLORS.length],
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        dataKey="value"
                        nameKey="name"
                      >
                        {formatPaymentMethodData().map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]} 
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={<CustomTooltip />}
                        formatter={(value, name, props) => {
                          // This helps ensure the color is passed correctly
                          return [value, name, { color: props.fill }];
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {getPeriodDateRange(selectedPeriod)}
                    {/* Add note for partial month data */}
                    {selectedPeriod === 'year' && (
                      <div className="mt-1">
                        † Includes current month (partial data)
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No data available for this period
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Products Chart */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
              <CardDescription>
                Best selling products by revenue {selectedPeriod === 'day' ? 'today' : 
                                                selectedPeriod === 'week' ? 'over the last 7 days' : 
                                                selectedPeriod === 'month' ? 'over the last 30 days' : 
                                                'over the last 365 days'}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : analyticsData?.topProducts && analyticsData.topProducts.length > 0 ? (
                <div className="flex flex-col h-full">
                  <ResponsiveContainer width="100%" height="85%">
                    <BarChart
                      layout="vertical"
                      data={formatTopProductsData()}
                      margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        tick={{ ...CHART_TEXT_STYLE }} 
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        tick={{ ...CHART_TEXT_STYLE }}
                        width={120}
                      />
                      <Tooltip 
                        labelFormatter={(name) => `Product: ${name}`}
                        content={<CustomTooltip />}
                      />
                      <Legend />
                      <Bar 
                        dataKey="revenue" 
                        name="Revenue (₱)" 
                        fill="#8884d8" 
                        radius={[0, 4, 4, 0]} 
                      />
                      <Bar 
                        dataKey="quantity" 
                        name="Quantity" 
                        fill="#82ca9d" 
                        radius={[0, 4, 4, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {getPeriodDateRange(selectedPeriod)}
                    {/* Add note for partial month data */}
                    {selectedPeriod === 'year' && (
                      <div className="mt-1">
                        † Includes current month (partial data)
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <p className="text-muted-foreground">No product data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
} 