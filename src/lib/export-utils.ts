import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// Import the function to add font support
import { addFontSupport, processFinancialDataForPDF } from './pdf-fonts';

// Format data for export (both Excel and PDF use this)
export function formatDataForExport(data: any, reportType: string) {
  // Safety check - make sure data exists
  if (!data) {
    console.error("Export data is missing");
    return []; // Return empty array if data is invalid
  }

  try {
    switch (reportType) {
      case 'sales-summary':
        return formatSalesSummary(data);
      case 'sales-by-day':
        return formatDailySales(data);
      case 'sales-by-category':
        return formatSalesByCategory(data);
      case 'sales-by-payment':
        return formatSalesByPayment(data);
      case 'top-customers':
        return formatTopCustomers(data);
      case 'product-performance':
        return formatProductPerformance(data);
      default:
        return []; // Return empty array for unknown report types
    }
  } catch (error) {
    console.error("Error formatting data for export:", error);
    return []; // Return empty array on error
  }
}

// Export to Excel file
export function exportToExcel(data: any, reportType: string, fileName: string) {
  if (!data || !reportType || !fileName) {
    console.error("Missing required parameters for Excel export");
    return;
  }

  try {
    const formattedData = formatDataForExport(data, reportType);
    
    if (formattedData.length === 0) {
      console.warn("No data to export to Excel");
      return;
    }
    
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Convert data to worksheet
    const ws = XLSX.utils.json_to_sheet(formattedData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    
    // Generate Excel file and trigger download
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  } catch (error) {
    console.error("Error exporting to Excel:", error);
  }
}

// Export to PDF file
export function exportToPDF(data: any, reportType: string, fileName: string) {
  if (!data || !reportType || !fileName) {
    console.error("Missing required parameters for PDF export");
    return;
  }

  try {
    // Format the data for export
    let formattedData = formatDataForExport(data, reportType);
    
    if (!formattedData || formattedData.length === 0) {
      console.warn("No data to export to PDF");
      return;
    }
    
    // Process the data to handle peso symbols
    formattedData = processFinancialDataForPDF(formattedData);
    
    const columns = Object.keys(formattedData[0] || {});
    if (columns.length === 0) {
      console.warn("No columns to export to PDF");
      return;
    }

    // Create a new PDF document
    const doc = new jsPDF();
    
    // Add font support for peso symbol
    const fontName = addFontSupport(doc);
    
    // Add title to the PDF
    const title = getReportTitle(reportType);
    doc.setFontSize(16);
    doc.text(title, 14, 15);
    
    // Add report details (date range, etc.)
    if (data.currentPeriod && data.currentPeriod.startDate && data.currentPeriod.endDate) {
      try {
        const startDate = new Date(data.currentPeriod.startDate);
        const endDate = new Date(data.currentPeriod.endDate);
        const dateRange = `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`;
        
        doc.setFontSize(10);
        doc.text(`Date Range: ${dateRange}`, 14, 22);
        doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 27);
      } catch (err) {
        console.error("Error formatting dates:", err);
      }
    }
    
    // Convert data for the table
    const tableColumns = columns.map(col => ({ header: formatColumnHeader(col), dataKey: col }));
    const tableRows = formattedData.map(row => Object.values(row));
    
    // Generate the table
    autoTable(doc, {
      head: [tableColumns.map(col => col.header)],
      body: tableRows,
      startY: 35,
      styles: { fontSize: 9, font: fontName },
      headStyles: { fillColor: [66, 66, 66] },
    });
    
    // Save the PDF and trigger download
    doc.save(`${fileName}.pdf`);
  } catch (error) {
    console.error("Error exporting to PDF:", error);
  }
}

// Helper functions for formatting data

function formatSalesSummary(data: any) {
  // Ensure data exists and has required properties
  if (!data || !data.currentPeriod) return [];

  // Safely access properties with fallbacks
  const totalOrders = data.currentPeriod.totalOrders || 0;
  const totalRevenue = typeof data.currentPeriod.totalRevenue === 'number' ? data.currentPeriod.totalRevenue : 0;
  const completedOrders = data.currentPeriod.completedOrders || 0;
  const averageOrderValue = typeof data.currentPeriod.averageOrderValue === 'number' ? data.currentPeriod.averageOrderValue : 0;

  // Make sure data.comparisonPeriod and data.comparison exist before accessing them
  const comparisonPeriod = data.comparisonPeriod || {};
  const comparison = data.comparison || {};

  // Safely format comparison values
  const comparisonTotalOrders = comparisonPeriod.totalOrders || 'N/A';
  const comparisonTotalRevenue = typeof comparisonPeriod.totalRevenue === 'number' 
    ? `₱${comparisonPeriod.totalRevenue.toFixed(2)}` 
    : 'N/A';
  const comparisonCompletedOrders = comparisonPeriod.completedOrders || 'N/A';
  const comparisonAvgOrderValue = typeof comparisonPeriod.averageOrderValue === 'number'
    ? `₱${comparisonPeriod.averageOrderValue.toFixed(2)}`
    : 'N/A';

  // Safely format change percentages
  const totalOrdersChange = typeof comparison.totalOrdersChange === 'number'
    ? `${comparison.totalOrdersChange.toFixed(2)}%`
    : 'N/A';
  const totalRevenueChange = typeof comparison.totalRevenueChange === 'number'
    ? `${comparison.totalRevenueChange.toFixed(2)}%`
    : 'N/A';
  const completedOrdersChange = typeof comparison.completedOrdersChange === 'number'
    ? `${comparison.completedOrdersChange.toFixed(2)}%`
    : 'N/A';
  const avgOrderValueChange = typeof comparison.averageOrderValueChange === 'number'
    ? `${comparison.averageOrderValueChange.toFixed(2)}%`
    : 'N/A';

  return [
    {
      metric: 'Total Orders',
      value: totalOrders,
      comparisonValue: comparisonTotalOrders,
      change: totalOrdersChange
    },
    {
      metric: 'Total Revenue',
      value: `₱${totalRevenue.toFixed(2)}`,
      comparisonValue: comparisonTotalRevenue,
      change: totalRevenueChange
    },
    {
      metric: 'Completed Orders',
      value: completedOrders,
      comparisonValue: comparisonCompletedOrders,
      change: completedOrdersChange
    },
    {
      metric: 'Average Order Value',
      value: `₱${averageOrderValue.toFixed(2)}`,
      comparisonValue: comparisonAvgOrderValue,
      change: avgOrderValueChange
    }
  ];
}

function formatDailySales(data: any) {
  if (!data || !data.currentPeriod || !Array.isArray(data.currentPeriod.dailySales)) {
    return [];
  }
  
  return data.currentPeriod.dailySales.map((day: any) => ({
    date: day.date || 'Unknown',
    orders: day.orders || 0,
    revenue: typeof day.revenue === 'number' ? `₱${day.revenue.toFixed(2)}` : '₱0.00'
  }));
}

function formatSalesByCategory(data: any) {
  if (!data || !data.currentPeriod || !Array.isArray(data.currentPeriod.salesByCategory)) {
    return [];
  }
  
  return data.currentPeriod.salesByCategory.map((cat: any) => ({
    category: cat.category ? formatCategoryName(cat.category) : 'Unknown',
    revenue: typeof cat.revenue === 'number' ? `₱${cat.revenue.toFixed(2)}` : '₱0.00',
    quantity: cat.quantity || 0
  }));
}

function formatSalesByPayment(data: any) {
  if (!data || !data.currentPeriod || !Array.isArray(data.currentPeriod.salesByPaymentMethod)) {
    return [];
  }
  
  return data.currentPeriod.salesByPaymentMethod.map((method: any) => ({
    method: method.method ? formatPaymentMethod(method.method) : 'Unknown',
    revenue: typeof method.revenue === 'number' ? `₱${method.revenue.toFixed(2)}` : '₱0.00',
    orders: method.orders || 0
  }));
}

function formatTopCustomers(data: any) {
  if (!data || !data.currentPeriod || !Array.isArray(data.currentPeriod.topCustomers)) {
    return [];
  }
  
  return data.currentPeriod.topCustomers.map((customer: any, index: number) => ({
    rank: index + 1,
    name: customer.name || 'Unknown',
    email: customer.email || 'N/A',
    totalOrders: customer.totalOrders || 0,
    totalSpent: typeof customer.totalSpent === 'number' ? `₱${customer.totalSpent.toFixed(2)}` : '₱0.00',
    lastOrder: customer.lastOrderDate ? format(new Date(customer.lastOrderDate), 'MMM dd, yyyy') : 'N/A'
  }));
}

function formatCategoryName(category: string) {
  try {
    return category
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  } catch (error) {
    return category; // Return original if formatting fails
  }
}

function formatPaymentMethod(method: string) {
  try {
    switch (method) {
      case 'CASH_ON_DELIVERY':
        return 'Cash on Delivery';
      case 'IN_STORE':
        return 'In Store';
      default:
        return method;
    }
  } catch (error) {
    return method; // Return original if formatting fails
  }
}

function formatColumnHeader(header: string) {
  try {
    // Convert camelCase or snake_case to Title Case
    return header
      .replace(/([A-Z])/g, ' $1') // Insert a space before all uppercase letters
      .replace(/_/g, ' ') // Replace underscores with spaces
      .split(' ') // Split into words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize first letter of each word
      .join(' '); // Join back together
  } catch (error) {
    return header; // Return original if formatting fails
  }
}

function getReportTitle(reportType: string) {
  switch (reportType) {
    case 'sales-summary':
      return 'Sales Summary Report';
    case 'sales-by-day':
      return 'Daily Sales Report';
    case 'sales-by-category':
      return 'Sales by Category Report';
    case 'sales-by-payment':
      return 'Sales by Payment Method Report';
    case 'top-customers':
      return 'Top Customers Report';
    case 'product-performance':
      return 'Product Performance Report';
    default:
      return 'Report';
  }
}

function formatProductPerformance(data: any) {
  if (!data || !data.currentPeriod || !Array.isArray(data.currentPeriod.productPerformance)) {
    return [];
  }
  
  return data.currentPeriod.productPerformance.map((product: any) => {
    const formattedData: any = {
      name: product.name || 'Unknown Product',
      category: product.category ? formatCategoryName(product.category) : 'Unknown',
      quantity: product.quantity || 0,
      revenue: typeof product.revenue === 'number' ? `₱${product.revenue.toFixed(2)}` : '₱0.00'
    };
    
    // Add optional metrics if they exist
    if (product.profitMargin !== undefined) {
      formattedData.profitMargin = `${product.profitMargin.toFixed(2)}%`;
    }
    
    if (product.inventoryTurnover !== undefined) {
      formattedData.inventoryTurnover = product.inventoryTurnover.toFixed(2);
    }
    
    if (product.returnRate !== undefined) {
      formattedData.returnRate = `${product.returnRate.toFixed(2)}%`;
    }
    
    return formattedData;
  });
} 