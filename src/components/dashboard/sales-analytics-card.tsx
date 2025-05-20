"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, ArrowRight } from "lucide-react";
import { formatPricePHP } from "@/lib/price-utils";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82ca9d"];

interface SalesAnalyticsProps {
  totalRevenue: number;
  ordersCount: number;
  averageOrderValue: number;
  revenueTrend: { date: string; revenue: number }[];
  categoryData: { category: string; revenue: number }[];
}

export function SalesAnalyticsCard({
  totalRevenue,
  ordersCount,
  averageOrderValue,
  revenueTrend,
  categoryData,
}: SalesAnalyticsProps) {
  // Prepare category data with color information for tooltips
  const enhancedCategoryData = categoryData.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
    colorIndex: index % COLORS.length, // Store the color index for tooltip reference
  }));

  // Custom tooltip component for consistent styling across charts
  const CustomTooltip = ({ active, payload, label, labelFormatter, chartType }: any) => {
    if (!active || !payload || !payload.length) return null;
    
    // Apply custom label formatting if provided
    const formattedLabel = labelFormatter ? labelFormatter(label) : label;
    
    return (
      <div className="custom-tooltip bg-background border border-border p-3 rounded-md shadow-md">
        <p className="font-medium text-sm mb-2">{formattedLabel}</p>
        {payload.map((entry: any, index: number) => {
          // Get color based on chart type and payload data
          let color;
          if (chartType === 'category') {
            // For category chart, extract the category name from the label (removing "Category: " prefix)
            const categoryName = label.replace("Category: ", "");
            
            // Find the corresponding category in the enhanced data
            const categoryItem = enhancedCategoryData.find(item => item.category === categoryName);
            if (categoryItem) {
              // Use the stored color or fall back to the COLORS array
              color = categoryItem.fill;
            } else {
              // Fallback if category not found
              color = COLORS[index % COLORS.length];
            }
          } else {
            // For other charts, use the color from the payload
            color = entry.color || entry.stroke || entry.fill || "#000";
          }
          
          const name = entry.name;
          const value = entry.value;
          
          // Format the value (handle currency if needed)
          let formattedValue = value;
          if (name?.toLowerCase() === "revenue" || name?.toLowerCase().includes("revenue")) {
            formattedValue = formatPricePHP(value);
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

  return (
    <Card className="shadow-sm hover:shadow transition-all lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          Sales Overview
        </CardTitle>
        <CardDescription>Recent revenue trends and top product categories</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Revenue (7 days)</p>
            <p className="text-3xl font-bold">{formatPricePHP(totalRevenue)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Orders</p>
            <p className="text-3xl font-bold">{ordersCount}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Average Order Value</p>
            <p className="text-3xl font-bold">{formatPricePHP(averageOrderValue)}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="font-medium mb-2">Revenue Trend</p>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={revenueTrend}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis 
                    width={50}
                    tickFormatter={(value) => `₱${value}`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    content={<CustomTooltip chartType="revenue" />}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    name="Revenue" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <p className="font-medium mb-2">Top Categories</p>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={enhancedCategoryData}
                  layout="vertical"
                  margin={{ top: 10, right: 10, left: 70, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis 
                    dataKey="category" 
                    type="category" 
                    tick={{ fontSize: 12 }} 
                    width={70}
                  />
                  <Tooltip 
                    content={<CustomTooltip chartType="category" />}
                    labelFormatter={(label) => `Category: ${label}`}
                  />
                  <Bar dataKey="revenue" name="Revenue" barSize={20}>
                    {enhancedCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="flex justify-center mt-6">
          <Link href="/admin/analytics">
            <Button variant="outline" className="flex items-center gap-1">
              View Detailed Analytics
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
} 