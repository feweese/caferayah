"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Icons } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Download, FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { exportToExcel, exportToPDF } from "@/lib/export-utils";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
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
import { format, subMonths } from "date-fns";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d"];

// Custom tooltip component for consistent styling across all charts
const CustomTooltip = ({ active, payload, label, labelFormatter, chartType, currentPeriod }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  // Apply custom label formatting if provided
  const formattedLabel = labelFormatter ? labelFormatter(label) : label;
  
  // Function to format tooltip date based on time period
  const getTooltipDateDisplay = (dateString: string, entry?: any, currentPeriod?: string) => {
    try {
      // Check if dateString is valid before parsing
      if (!dateString || typeof dateString !== 'string') {
        return 'No date available';
      }
      
      // Handle case where this is a comparison period with an originalDate
      let originalDate = '';
      if (entry && entry.payload && entry.payload.originalDate) {
        originalDate = entry.payload.originalDate;
      }
      
      // Get current period from parameter or default to month
      const activePeriod = currentPeriod || 'month';
      
      // Handle special case for year periods to show only month/year
      const shouldShowMonthYear = activePeriod === "year";
      
      // Handle ISO date strings
      if (dateString.includes('-')) {
        const date = new Date(dateString);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
          return dateString;
        }
        
        // If this is a comparison date with original date, show both
        if (originalDate) {
          const origDate = new Date(originalDate);
          if (!isNaN(origDate.getTime())) {
            // For comparison data, format according to period
            const displayFormat = shouldShowMonthYear ? "MMM yyyy" : "MMM dd, yyyy";
            return `${format(date, displayFormat)} (${format(origDate, displayFormat)})`;
          }
        }
        
        // Format date differently based on period
        if (activePeriod === "day") {
          return format(date, "HH:mm"); // For day, show hour:minute
        } else if (shouldShowMonthYear) {
          return format(date, "MMMM yyyy"); // For year, show month and year only
        } else {
          return format(date, "MMMM dd, yyyy"); // For others, show full date
        }
      }
      
      // If it's not an ISO string, just return it as is
      return dateString;
    } catch (e) {
      console.error("Error parsing date in tooltip:", e);
      return String(dateString);
    }
  };
  
  // Helper function to get the correct color based on data series name and chart type
  const getSeriesColor = (name: string, chartType: string) => {
    if (!name) return "#000";
    
    const nameLower = name.toLowerCase();
    
    // Handle explicit color matches for specific charts
    
    // Payment Methods Tab
    if (chartType === "payment") {
      if (nameLower === "revenue") return "#82ca9d";
      if (nameLower === "previous revenue") return "#d0f4de";
    }
    
    // Categories Tab
    if (chartType === "categories") {
      if (nameLower === "revenue") return "#8884d8";
      if (nameLower === "previous revenue") return "#dcd6f7";
    }
    
    // Products Performance Tab
    if (chartType === "products") {
      if (nameLower === "revenue") return "#8884d8";
      if (nameLower === "previous revenue") return "#dcd6f7";
      if (nameLower === "quantity") return "#82ca9d";
      if (nameLower === "previous quantity") return "#d0f4de";
    }
    
    // Time series charts
    if (nameLower.includes("current revenue")) return "#4285F4";
    if (nameLower.includes("previous revenue")) return "#8884d8";
    if (nameLower.includes("current orders")) return "#34A853";
    if (nameLower.includes("previous orders")) return "#FBBC05";
    
    // Generic fallbacks
    if (nameLower.includes("revenue") && nameLower.includes("previous")) return "#dcd6f7";
    if (nameLower.includes("revenue")) return "#8884d8";
    if (nameLower.includes("quantity") && nameLower.includes("previous")) return "#d0f4de";
    if (nameLower.includes("quantity")) return "#82ca9d";
    if (nameLower.includes("orders") && nameLower.includes("previous")) return "#FBBC05";
    if (nameLower.includes("orders")) return "#34A853";
    
    // Ultimate fallback
    return "#000";
  };
  
  return (
    <div className="custom-tooltip bg-background border border-border p-3 rounded-md shadow-md">
      <p className="font-medium text-sm mb-2">
        {typeof label === 'string' && 
         (label.includes('-') || 
          (formattedLabel && typeof formattedLabel === 'string' && formattedLabel.includes('-')))
          ? getTooltipDateDisplay(typeof formattedLabel === 'string' ? formattedLabel : label, payload[0], currentPeriod)
          : formattedLabel || 'N/A'
        }
      </p>
      <div className="space-y-2">
        {Array.isArray(payload) && payload.map((entry: any, index: number) => {
          if (!entry) return null;
          
          // Get color based on the series name and chart type
          const name = entry.name || '';
          const color = getSeriesColor(name, chartType || '');
          const value = entry.value;
          
          // Format the value (handle currency if needed)
          let formattedValue = value;
          if (
            // Only apply peso formatting to revenue-related values, not orders or quantities
            (name.toLowerCase().includes("revenue") || 
             (chartType === "payment" && name.toLowerCase() === "revenue") || 
             (chartType === "categories" && name.toLowerCase() === "revenue") || 
             (chartType === "products" && name.toLowerCase() === "revenue")) && 
            typeof value === "number"
          ) {
            formattedValue = typeof value === "number" 
              ? `₱${value.toLocaleString()}`
              : value;
          } else if (typeof value === "number") {
            // For non-currency values, just add thousand separators
            formattedValue = value.toLocaleString();
          }
          
          // Create a display name that shows 'Current' or 'Previous' 
          let displayName = name;
          if (!name.toLowerCase().includes("current") && !name.toLowerCase().includes("previous")) {
            displayName = name.toLowerCase().includes("previous") 
              ? `Previous ${name}` 
              : `Current ${name}`;
          }
          
          return (
            <div key={`tooltip-item-${index}`} className="flex items-center mb-1 last:mb-0">
              <div 
                className="w-3 h-3 mr-2 rounded-sm" 
                style={{ 
                  backgroundColor: color,
                  opacity: name.toLowerCase().includes("previous") ? 0.7 : 1
                }}
              />
              <span className="text-sm">
                <span className="font-medium">{formattedValue}</span>
                <span className="text-muted-foreground ml-2">{displayName}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// This component is used for custom date pickers
const DatePickerField = ({ selectedDate, onChange, label }: { selectedDate: Date | null, onChange: (date: Date | null) => void, label: string }) => {
  return (
    <div className="flex flex-col space-y-1">
      <Label>{label}</Label>
      <DatePicker
        selected={selectedDate}
        onChange={onChange}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        dateFormat="MMM dd, yyyy"
      />
    </div>
  );
};

// Type for report data
interface ReportData {
  currentPeriod: {
    startDate: string;
    endDate: string;
    totalOrders: number;
    totalRevenue: number;
    completedOrders: number;
    averageOrderValue: number;
    dailySales: { date: string; revenue: number; orders: number }[];
    salesByCategory: { category: string; revenue: number; quantity: number }[];
    salesByPaymentMethod: { method: string; revenue: number; orders: number }[];
    topCustomers?: { id: string; name: string; email: string; totalOrders: number; totalSpent: number; lastOrderDate: string }[];
    productPerformance?: { 
      id: string; 
      name: string; 
      quantity: number; 
      revenue: number; 
      category: string;
      profitMargin?: number;
      inventoryTurnover?: number;
      returnRate?: number;
    }[];
  };
  comparisonPeriod?: {
    startDate: string;
    endDate: string;
    totalOrders: number;
    totalRevenue: number;
    completedOrders: number;
    averageOrderValue: number;
    dailySales: { date: string; revenue: number; orders: number }[];
    salesByCategory: { category: string; revenue: number; quantity: number }[];
    salesByPaymentMethod: { method: string; revenue: number; orders: number }[];
    topCustomers?: { id: string; name: string; email: string; totalOrders: number; totalSpent: number; lastOrderDate: string }[];
    productPerformance?: { 
      id: string; 
      name: string; 
      quantity: number; 
      revenue: number; 
      category: string;
      profitMargin?: number;
      inventoryTurnover?: number;
      returnRate?: number;
    }[];
  };
  comparison?: {
    totalOrdersChange: number;
    totalRevenueChange: number;
    completedOrdersChange: number;
    averageOrderValueChange: number;
  };
}

// Component that uses useSearchParams
function ReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State for report filters
  const [reportType, setReportType] = useState("sales");
  const [period, setPeriod] = useState("month");
  const [startDate, setStartDate] = useState<Date | null>(subMonths(new Date(), 1));
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  // Always enable comparisons by default
  const [activeTab, setActiveTab] = useState("summary");
  
  // Loading and data states
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Safe tick formatter that handles various input types
  const safeTickFormatter = (value: any) => {
    // Skip formatting if no value
    if (value === undefined || value === null) return '';
    
    // If value is already formatted or not a date string
    if (typeof value !== 'string' || !value.includes('-')) {
      return String(value);
    }
    
    try {
      return formatDateForDisplay(value);
    } catch (err) {
      console.error('Error in tick formatter:', err);
      return String(value);
    }
  };
  
  // Function to get appropriate date format and tick interval based on period
  const getDateDisplaySettings = () => {
    if (!reportData || !reportData.currentPeriod) return { format: "MMM dd", interval: 1 };
    
    // Get actual data to examine format
    const dailyData = reportData.currentPeriod.dailySales || [];
    
    // Safely access date properties with fallbacks
    const startDate = reportData.currentPeriod.startDate;
    const endDate = reportData.currentPeriod.endDate;
    
    if (!startDate || !endDate) {
      return { format: "MMM dd", interval: 1 };
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { format: "MMM dd", interval: 1 };
    }
    
    const daysDifference = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    // For "Today" time period, use specific formatting for hours
    if (period === "day") {
      return { format: "HH:00", interval: 2 }; // Show every 2 hours
    }
    
    // For "Last 12 Months" period, use specific formatting to avoid overcrowding
    if (period === "year") {
      const dataLength = dailyData.length;
      // For year view, dramatically reduce the number of ticks shown
      return { 
        format: "MMM yyyy", 
        interval: Math.max(Math.floor(dataLength / 6), 1) // Show at most 6 ticks for the whole year
      };
    }
    
    // For a single day, check if data has hour information
    if (daysDifference <= 1) {
      // Check the format of date strings - do they include time?
      const sampleDate = dailyData.length > 0 ? dailyData[0].date : null;
      
      if (sampleDate && typeof sampleDate === 'string') {
        if (sampleDate.includes('T') || sampleDate.includes(':')) {
          // ISO date with time component - format as hours
          return { format: "HH:00", interval: 2 };
        } else if (sampleDate.includes('-')) {
          // Date format with no apparent time component
          // Try to infer - if we have multiple entries for the same day, they're likely hourly
          if (dailyData.length > 1) {
            return { format: "HH:00", interval: 2 };
          }
        }
      }
      
      // Default for a single day with unclear data format
      return { format: "HH:00", interval: 2 };
    } else if (daysDifference <= 7) {
      // For a week or less, show day of week and date
      return { format: "EEE dd", interval: 1 };
    } else if (daysDifference <= 31) {
      // For a month or less, show dates only
      return { format: "MMM dd", interval: Math.ceil(daysDifference / 10) };
    } else if (daysDifference <= 90) {
      // For 3 months or less, show dates with less frequency
      return { format: "MMM dd", interval: Math.ceil(daysDifference / 8) };
    } else {
      // For longer periods (more than 90 days but not a full year)
      return { format: "MMM yyyy", interval: Math.ceil(daysDifference / 12) };
    }
  };
  
  // Function to format date for display
  const formatDateForDisplay = (dateString: string) => {
    try {
      // Check if dateString is valid before parsing
      if (!dateString || typeof dateString !== 'string') {
        console.warn("Invalid date string:", dateString);
        return '';
      }
      
      // Try to parse the date
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid date:", dateString);
        return dateString;
      }
      
      const { format: dateFormat } = getDateDisplaySettings();
      return format(date, dateFormat);
    } catch (error) {
      console.error("Error formatting date:", error, dateString);
      return String(dateString);
    }
  };
  
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
          border-radius: 2px;
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
  
  // Fetch report data based on filters
  useEffect(() => {
    const fetchReportData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Build query parameters
        const params = new URLSearchParams();
        params.append("reportType", reportType);
        params.append("period", period);
        
        if (period === "custom" && startDate && endDate) {
          params.append("startDate", startDate.toISOString());
          params.append("endDate", endDate.toISOString());
        }
        
        // Always include comparison data
        params.append("compare", "true");
        
        console.log("Fetching report with params:", Object.fromEntries(params.entries()));
        
        // Fetch data from API
        const response = await fetch(`/api/admin/reports?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Error fetching report data: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Log relevant data for debugging
        if (data && data.currentPeriod && data.comparisonPeriod) {
          console.log("Report data received:", {
            current: {
              period: `${new Date(data.currentPeriod.startDate).toLocaleDateString()} - ${new Date(data.currentPeriod.endDate).toLocaleDateString()}`,
              totalOrders: data.currentPeriod.totalOrders,
              dailySalesCount: data.currentPeriod.dailySales?.length
            },
            comparison: {
              period: `${new Date(data.comparisonPeriod.startDate).toLocaleDateString()} - ${new Date(data.comparisonPeriod.endDate).toLocaleDateString()}`,
              totalOrders: data.comparisonPeriod.totalOrders,
              dailySalesCount: data.comparisonPeriod.dailySales?.length
            }
          });
        }
        
        setReportData(data);
      } catch (error) {
        console.error("Error fetching report data:", error);
        setError("Failed to load report data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchReportData();
  }, [reportType, period, startDate, endDate]);
  
  // Handle period change
  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    
    // Reset custom dates when switching to preset periods
    if (newPeriod !== "custom") {
      const end = new Date();
      const start = new Date();
      
      switch (newPeriod) {
        case "day":
          start.setHours(0, 0, 0, 0);
          break;
        case "week":
          start.setDate(end.getDate() - 7);
          break;
        case "month":
          start.setMonth(end.getMonth() - 1);
          break;
        case "year":
          start.setFullYear(end.getFullYear() - 1);
          break;
      }
      
      setStartDate(start);
      setEndDate(end);
    }
  };
  
  // Handle report type change
  const handleReportTypeChange = (newType: string) => {
    setReportType(newType);
    
    // Reset to summary tab when changing report type
    setActiveTab(newType === "customers" ? "top-customers" : "summary");
  };
  
  // Format category names for display
  const formatCategoryName = (category: string) => {
    return category
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };
  
  // Format payment method names for display
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
  
  // Export functions
  const handleExportExcel = () => {
    if (!reportData) return;
    
    const filename = `${reportType}-report-${format(new Date(), 'yyyy-MM-dd')}`;
    let reportSection = activeTab;
    
    // Map tab names to export types
    switch (activeTab) {
      case "summary":
        reportSection = "sales-summary";
        break;
      case "daily":
        reportSection = "sales-by-day";
        break;
      case "categories":
        reportSection = "sales-by-category";
        break;
      case "payment":
        reportSection = "sales-by-payment";
        break;
      case "top-customers":
        reportSection = "top-customers";
        break;
      case "products":
        reportSection = "product-performance";
        break;
    }
    
    exportToExcel(reportData, reportSection, filename);
  };
  
  const handleExportPDF = () => {
    if (!reportData) return;
    
    const filename = `${reportType}-report-${format(new Date(), 'yyyy-MM-dd')}`;
    let reportSection = activeTab;
    
    // Map tab names to export types
    switch (activeTab) {
      case "summary":
        reportSection = "sales-summary";
        break;
      case "daily":
        reportSection = "sales-by-day";
        break;
      case "categories":
        reportSection = "sales-by-category";
        break;
      case "payment":
        reportSection = "sales-by-payment";
        break;
      case "top-customers":
        reportSection = "top-customers";
        break;
      case "products":
        reportSection = "product-performance";
        break;
    }
    
    exportToPDF(reportData, reportSection, filename);
  };
  
  // Format percentage change for display
  const formatChange = (value: number) => {
    const formattedValue = value.toFixed(2);
    return (
      <Badge variant={value >= 0 ? "default" : "destructive"}>
        {value >= 0 ? "+" : ""}{formattedValue}%
      </Badge>
    );
  };
  
  // Format data for better display in charts
  const formatTopProductsData = () => {
    // More thorough null checking
    if (!reportData || !reportData.currentPeriod || !reportData.currentPeriod.productPerformance) {
      return [];
    }
    
    return reportData.currentPeriod.productPerformance
      .slice(0, 10) // Get top 10
      .map(product => ({
        name: product.name && product.name.length > 20 ? product.name.substring(0, 20) + '...' : product.name || 'Unknown',
        revenue: product.revenue || 0,
        quantity: product.quantity || 0,
        category: formatCategoryName(product.category || ''),
        profitMargin: product.profitMargin || 0,
        inventoryTurnover: product.inventoryTurnover || 0,
        returnRate: product.returnRate || 0
      }))
      .sort((a, b) => b.revenue - a.revenue);
  };
  
  // Prepare aligned data for comparison charts
  const prepareAlignedComparisonData = () => {
    if (!reportData || !reportData.currentPeriod || !reportData.comparisonPeriod) {
      return { current: [], previous: [] };
    }

    const currentData = reportData.currentPeriod.dailySales || [];
    const previousData = reportData.comparisonPeriod.dailySales || [];

    if (currentData.length === 0) {
      return { current: [], previous: [] };
    }

    // For "day" period, we keep the hourly data as is
    if (period === "day") {
      return { current: currentData, previous: previousData };
    }

    // For other periods, we need to align the data points
    const alignedCurrent = [...currentData];
    
    // Create aligned previous data points that match the current period days
    const alignedPrevious = [];
    
    // Different alignment strategy based on period
    if (period === "week" || period === "month" || period === "year" || period === "custom") {
      // Handle data density differences between periods
      const ratio = previousData.length > 0 ? 
        Math.max(1, Math.round(currentData.length / previousData.length)) : 1;
      
      // For longer periods like month or year, we may need to sample data differently
      for (let i = 0; i < currentData.length; i++) {
        // Find the corresponding index in the previous period
        const prevIndex = Math.min(Math.floor(i / ratio), previousData.length - 1);
        
        if (prevIndex >= 0 && previousData[prevIndex]) {
          alignedPrevious.push({
            ...previousData[prevIndex],
            // Keep original date for data reference but add displayDate for charts
            originalDate: previousData[prevIndex].date,
            date: currentData[i]?.date || previousData[prevIndex].date,
          });
        } else {
          // If no matching previous data, push a placeholder with 0 values
          alignedPrevious.push({
            date: currentData[i].date,
            revenue: 0,
            orders: 0,
            originalDate: null,
          });
        }
      }
    }

    return {
      current: alignedCurrent,
      previous: alignedPrevious
    };
  };
  
  return (
    <div className="container px-0">
      <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 items-start sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Sales Reports</h1>
          <p className="text-muted-foreground mt-1">
            Generate detailed reports for sales performance analysis
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={isLoading || !reportData}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={isLoading || !reportData}
          >
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>
      
      {/* Report Settings */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Report Settings</CardTitle>
          <CardDescription>Configure report parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label htmlFor="report-type">Report Type</Label>
              <Select value={reportType} onValueChange={handleReportTypeChange}>
                <SelectTrigger id="report-type">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales Report</SelectItem>
                  <SelectItem value="customers">Customer Analytics</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="time-period">Time Period</Label>
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger id="time-period">
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="year">Last 12 Months</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {period === "custom" && (
              <>
                <DatePickerField
                  selectedDate={startDate}
                  onChange={setStartDate}
                  label="Start Date"
                />
                <DatePickerField
                  selectedDate={endDate}
                  onChange={setEndDate}
                  label="End Date"
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Error message */}
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-6 flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      )}
      
      {/* Report content based on type */}
      {reportType === "sales" ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="daily">Daily Sales</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="payment">Payment Methods</TabsTrigger>
            <TabsTrigger value="products">Product Performance</TabsTrigger>
          </TabsList>
          
          {/* Summary tab */}
          <TabsContent value="summary" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {/* Total Orders Card */}
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
                        {reportData?.currentPeriod.totalOrders || 0}
                      </div>
                      {reportData?.comparison && (
                        <div className="mt-2">
                          {formatChange(reportData.comparison.totalOrdersChange)}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
              
              {/* Total Revenue Card */}
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
                        {reportData ? formatCurrency(reportData.currentPeriod.totalRevenue) : "₱0.00"}
                      </div>
                      {reportData?.comparison && (
                        <div className="mt-2">
                          {formatChange(reportData.comparison.totalRevenueChange)}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
              
              {/* Completed Orders Card */}
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
                        {reportData?.currentPeriod.completedOrders || 0}
                      </div>
                      {reportData?.comparison && (
                        <div className="mt-2">
                          {formatChange(reportData.comparison.completedOrdersChange)}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
              
              {/* Average Order Value Card */}
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
                        {reportData ? formatCurrency(reportData.currentPeriod.averageOrderValue) : "₱0.00"}
                      </div>
                      {reportData?.comparison && (
                        <div className="mt-2">
                          {formatChange(reportData.comparison.averageOrderValueChange)}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Period Comparison */}
            {reportData?.comparisonPeriod && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-md">Period Comparison</CardTitle>
                  <CardDescription>
                    {period === "year" ? (
                      // For year period, show month/year format
                      <>
                        Comparing {format(new Date(reportData.currentPeriod.startDate), "MMM yyyy")} - {format(new Date(reportData.currentPeriod.endDate), "MMM yyyy")} with {format(new Date(reportData.comparisonPeriod.startDate), "MMM yyyy")} - {format(new Date(reportData.comparisonPeriod.endDate), "MMM yyyy")}
                      </>
                    ) : period === "day" ? (
                      // For day (Today), show the specific day with hours
                      <>
                        Comparing {format(new Date(reportData.currentPeriod.startDate), "MMM dd, yyyy")} with {format(new Date(reportData.comparisonPeriod.startDate), "MMM dd, yyyy")}
                      </>
                    ) : (
                      // Default format for week, month, and custom
                      <>
                        Comparing {format(new Date(reportData.currentPeriod.startDate), "MMM dd, yyyy")} - {format(new Date(reportData.currentPeriod.endDate), "MMM dd, yyyy")} with {format(new Date(reportData.comparisonPeriod.startDate), "MMM dd, yyyy")} - {format(new Date(reportData.comparisonPeriod.endDate), "MMM dd, yyyy")}
                      </>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Revenue Comparison Chart */}
                    <div className="h-80">
                      <h3 className="text-sm font-medium mb-4">Revenue Comparison</h3>
                      {isLoading ? (
                        <div className="h-full flex items-center justify-center">
                          <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : reportData?.currentPeriod?.dailySales && reportData.currentPeriod.dailySales.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            margin={period === "year" ? 
                              { top: 20, right: 30, left: 20, bottom: 30 } : 
                              { top: 20, right: 30, left: 20, bottom: 5 }
                            }
                            syncId="periodComparison"
                          >
                            <CartesianGrid 
                              strokeDasharray="3 3" 
                              // Reduce grid density for year view
                              horizontal={period === "year" ? 6 : true}
                              vertical={period === "year" ? false : true}
                            />
                            <XAxis 
                              dataKey="date" 
                              tick={{ 
                                fontSize: period === "year" ? 10 : 12,
                                angle: period === "year" ? -30 : 0,
                                textAnchor: period === "year" ? "end" : "middle",
                                dy: period === "year" ? 8 : 0
                              }}
                              tickFormatter={safeTickFormatter}
                              interval={getDateDisplaySettings().interval}
                              allowDuplicatedCategory={false}
                            />
                            <YAxis 
                              tickFormatter={(value) => `₱${value}`}
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip 
                              content={<CustomTooltip chartType="revenue" currentPeriod={period} />}
                              labelFormatter={(value) => safeTickFormatter(value)}
                            />
                            <Legend 
                              layout="horizontal"
                              verticalAlign="bottom"
                              align="center"
                              wrapperStyle={{
                                paddingTop: 10,
                                paddingBottom: 5,
                                marginTop: 5
                              }}
                              iconType="circle"
                              iconSize={8}
                              margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                            />
                            <Area
                              type="monotone"
                              name="Current Revenue"
                              data={prepareAlignedComparisonData().current}
                              dataKey="revenue"
                              stroke="#4285F4"
                              fill="#4285F4"
                              fillOpacity={0.3}
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              activeDot={{ r: 8 }}
                            />
                            {reportData.comparisonPeriod && reportData.comparisonPeriod.dailySales && reportData.comparisonPeriod.dailySales.length > 0 && (
                              <Area
                                type="monotone"
                                name="Previous Revenue"
                                data={prepareAlignedComparisonData().previous}
                                dataKey="revenue"
                                stroke="#8884d8"
                                fill="#8884d8"
                                fillOpacity={0.1}
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={{ r: 2 }}
                              />
                            )}
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          No revenue data available for this period
                        </div>
                      )}
                    </div>
                    
                    {/* Orders Comparison Chart */}
                    <div className="h-80">
                      <h3 className="text-sm font-medium mb-4">Orders Comparison</h3>
                      {isLoading ? (
                        <div className="h-full flex items-center justify-center">
                          <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : reportData?.currentPeriod?.dailySales && reportData.currentPeriod.dailySales.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            margin={period === "year" ? 
                              { top: 20, right: 30, left: 20, bottom: 30 } : 
                              { top: 20, right: 30, left: 20, bottom: 5 }
                            }
                            syncId="periodComparison"
                          >
                            <CartesianGrid 
                              strokeDasharray="3 3" 
                              // Reduce grid density for year view
                              horizontal={period === "year" ? 6 : true}
                              vertical={period === "year" ? false : true}
                            />
                            <XAxis 
                              dataKey="date" 
                              tick={{ 
                                fontSize: period === "year" ? 10 : 12,
                                angle: period === "year" ? -30 : 0,
                                textAnchor: period === "year" ? "end" : "middle",
                                dy: period === "year" ? 8 : 0
                              }}
                              tickFormatter={safeTickFormatter}
                              interval={getDateDisplaySettings().interval}
                              allowDuplicatedCategory={false}
                            />
                            <YAxis
                              tick={{ fontSize: 12 }}
                              allowDecimals={false}
                            />
                            <Tooltip 
                              content={<CustomTooltip chartType="orders" currentPeriod={period} />}
                              labelFormatter={(value) => safeTickFormatter(value)}
                            />
                            <Legend 
                              layout="horizontal"
                              verticalAlign="bottom"
                              align="center"
                              wrapperStyle={{
                                paddingTop: 10,
                                paddingBottom: 5,
                                marginTop: 5
                              }}
                              iconType="circle"
                              iconSize={8}
                              margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                            />
                            {/* Current period orders */}
                            <Area
                              type="monotone"
                              name="Current Orders"
                              data={prepareAlignedComparisonData().current}
                              dataKey="orders"
                              stroke="#34A853"
                              fill="#34A853"
                              fillOpacity={0.3}
                              strokeWidth={2}
                              dot={{ r: 3 }}
                              activeDot={{ r: 8 }}
                            />
                            {/* Comparison period orders - ensure we're using the aligned data */}
                            {reportData.comparisonPeriod && reportData.comparisonPeriod.dailySales && reportData.comparisonPeriod.dailySales.length > 0 && (
                              <Area
                                type="monotone"
                                name="Previous Orders"
                                data={prepareAlignedComparisonData().previous}
                                dataKey="orders" 
                                stroke="#FBBC05"
                                fill="#FBBC05"
                                fillOpacity={0.1}
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={{ r: 2 }}
                              />
                            )}
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          No orders data available for this period
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Daily Sales tab */}
          <TabsContent value="daily">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Daily Sales</CardTitle>
                <CardDescription>
                  Revenue and order trends over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-80 w-full" />
                ) : reportData?.currentPeriod.dailySales && reportData.currentPeriod.dailySales.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart
                      data={reportData.currentPeriod.dailySales}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickFormatter={safeTickFormatter}
                        interval={getDateDisplaySettings().interval}
                        allowDuplicatedCategory={false}
                      />
                      <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip 
                        content={<CustomTooltip chartType="revenue" currentPeriod={period} />}
                        labelFormatter={(value) => safeTickFormatter(value)}
                      />
                      <Legend 
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{
                          paddingTop: 10,
                          paddingBottom: 5,
                          marginTop: 5
                        }}
                        iconType="circle"
                        iconSize={8}
                        margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                      />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        name="Revenue"
                        dataKey="revenue"
                        stroke="#4285F4"
                        fill="#4285F4"
                        fillOpacity={0.3}
                        activeDot={{ r: 8 }}
                      />
                      <Area
                        yAxisId="right"
                        type="monotone"
                        name="Orders"
                        dataKey="orders"
                        stroke="#34A853"
                        fill="#34A853"
                        fillOpacity={0.3}
                      />
                      {reportData?.comparisonPeriod && reportData.comparisonPeriod.dailySales && reportData.comparisonPeriod.dailySales.length > 0 && (
                        <>
                          <Area
                            yAxisId="left"
                            type="monotone"
                            name="Previous Revenue"
                            dataKey="revenue"
                            data={prepareAlignedComparisonData().previous}
                            stroke="#8884d8"
                            fill="#8884d8"
                            fillOpacity={0.1}
                            strokeDasharray="5 5"
                            key="prev-revenue"
                          />
                          <Area
                            yAxisId="right"
                            type="monotone"
                            name="Previous Orders"
                            dataKey="orders"
                            data={prepareAlignedComparisonData().previous}
                            stroke="#FBBC05"
                            fill="#FBBC05"
                            fillOpacity={0.1}
                            strokeDasharray="5 5"
                            key="prev-orders"
                          />
                        </>
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-80 w-full flex items-center justify-center text-muted-foreground">
                    No sales data available for this period
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Categories tab */}
          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>Sales Revenue by Category</CardTitle>
                <CardDescription>
                  Sales breakdown by product category
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : reportData?.currentPeriod.salesByCategory && reportData.currentPeriod.salesByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={reportData.currentPeriod.salesByCategory.sort((a, b) => b.revenue - a.revenue)}
                      margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => `₱${value}`} />
                      <YAxis 
                        type="category" 
                        dataKey="category" 
                        width={90}
                        tickFormatter={formatCategoryName}
                      />
                      <Tooltip 
                        content={<CustomTooltip chartType="categories" currentPeriod={period} />}
                        labelFormatter={(value) => formatCategoryName(value)}
                      />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#8884d8" />
                      {reportData.comparisonPeriod && reportData.comparisonPeriod.salesByCategory && (
                        <Bar 
                          dataKey={(entry, index) => {
                            const matchingCategory = reportData.comparisonPeriod?.salesByCategory.find(
                              (item) => item.category === entry.category
                            );
                            return matchingCategory ? matchingCategory.revenue : 0;
                          }}
                          name="Previous Revenue" 
                          fill="#dcd6f7" 
                          stroke="#8884d8"
                          strokeDasharray="5 5"
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No data available for this period
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Payment Methods tab */}
          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle>Sales Revenue by Payment Method</CardTitle>
                <CardDescription>
                  Sales breakdown by payment method
                </CardDescription>
              </CardHeader>
              <CardContent className="h-96">
                {isLoading ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : reportData?.currentPeriod.salesByPaymentMethod && reportData.currentPeriod.salesByPaymentMethod.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={reportData.currentPeriod.salesByPaymentMethod.sort((a, b) => b.revenue - a.revenue)}
                      margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => `₱${value}`} />
                      <YAxis 
                        type="category" 
                        dataKey="method" 
                        width={90}
                        tickFormatter={formatPaymentMethod}
                      />
                      <Tooltip 
                        content={<CustomTooltip chartType="payment" currentPeriod={period} />}
                        labelFormatter={(value) => formatPaymentMethod(value)}
                      />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#82ca9d" />
                      {reportData.comparisonPeriod && reportData.comparisonPeriod.salesByPaymentMethod && (
                        <Bar 
                          dataKey={(entry, index) => {
                            const matchingMethod = reportData.comparisonPeriod?.salesByPaymentMethod.find(
                              (item) => item.method === entry.method
                            );
                            return matchingMethod ? matchingMethod.revenue : 0;
                          }}
                          name="Previous Revenue" 
                          fill="#d0f4de" 
                          stroke="#82ca9d"
                          strokeDasharray="5 5"
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No data available for this period
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Products Performance tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Product Performance</CardTitle>
                <CardDescription>
                  Top 10 products by revenue
                </CardDescription>
              </CardHeader>
              <CardContent className="h-96">
                {isLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Icons.spinner className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : reportData?.currentPeriod.productPerformance && reportData.currentPeriod.productPerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={formatTopProductsData()}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 140, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => `₱${value}`} />
                      <YAxis type="category" dataKey="name" width={130} />
                      <Tooltip 
                        content={<CustomTooltip chartType="products" currentPeriod={period} />}
                        labelFormatter={(value) => `Product: ${value}`}
                      />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#8884d8" />
                      <Bar dataKey="quantity" name="Quantity" fill="#82ca9d" />
                      
                      {reportData.comparisonPeriod && reportData.comparisonPeriod.productPerformance && (
                        <>
                          <Bar 
                            dataKey={(entry, index) => {
                              const matchingProduct = reportData.comparisonPeriod?.productPerformance?.find(
                                (p) => p.id === entry.id
                              );
                              return matchingProduct ? matchingProduct.revenue : 0;
                            }}
                            name="Previous Revenue" 
                            fill="#dcd6f7" 
                            stroke="#8884d8"
                            strokeDasharray="5 5"
                          />
                          <Bar 
                            dataKey={(entry, index) => {
                              const matchingProduct = reportData.comparisonPeriod?.productPerformance?.find(
                                (p) => p.id === entry.id
                              );
                              return matchingProduct ? matchingProduct.quantity : 0;
                            }}
                            name="Previous Quantity" 
                            fill="#d0f4de" 
                            stroke="#82ca9d"
                            strokeDasharray="5 5"
                          />
                        </>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No data available for this period
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        // Customer Analytics Report
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="top-customers">Top Customers</TabsTrigger>
          </TabsList>
          
          <TabsContent value="top-customers">
            <Card>
              <CardHeader>
                <CardTitle>Top Customers by Revenue</CardTitle>
                <CardDescription>
                  Customers with highest total spending
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-4 w-1/4" />
                      </div>
                    ))}
                  </div>
                ) : reportData?.currentPeriod.topCustomers && reportData.currentPeriod.topCustomers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-3 px-2 text-left font-medium">Rank</th>
                          <th className="py-3 px-2 text-left font-medium">Customer</th>
                          <th className="py-3 px-2 text-left font-medium">Email</th>
                          <th className="py-3 px-2 text-left font-medium">Orders</th>
                          <th className="py-3 px-2 text-left font-medium">Total Spent</th>
                          <th className="py-3 px-2 text-left font-medium">Last Order</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.currentPeriod.topCustomers.map((customer, index) => (
                          <tr key={customer.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-2">{index + 1}</td>
                            <td className="py-3 px-2">{customer.name}</td>
                            <td className="py-3 px-2">{customer.email}</td>
                            <td className="py-3 px-2">{customer.totalOrders}</td>
                            <td className="py-3 px-2">{formatCurrency(customer.totalSpent)}</td>
                            <td className="py-3 px-2">
                              {customer.lastOrderDate ? format(new Date(customer.lastOrderDate), "MMM dd, yyyy") : "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    No customer data available for this period
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// Main component with Suspense boundary
export default function ReportsPage() {
  return (
    <AdminLayout>
      <Suspense fallback={
        <div className="container py-6">
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col space-y-2">
              <h1 className="text-3xl font-bold">Reports</h1>
              <p className="text-muted-foreground">
                Loading report data...
              </p>
            </div>
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        <Skeleton className="h-4 w-24" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-full mb-2" />
                      <Skeleton className="h-4 w-16" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="h-80">
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      }>
        <ReportsContent />
      </Suspense>
    </AdminLayout>
  );
} 