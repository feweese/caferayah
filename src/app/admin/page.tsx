import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, Users, ShoppingBag, MessageSquare, ClipboardList, BarChart3, Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { format, formatDistanceToNow, subDays } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SalesAnalyticsCard } from "@/components/dashboard/sales-analytics-card";
import { formatPricePHP } from "@/lib/price-utils";

// Define OrderStatus type to match Prisma's enum
type OrderStatus = 
  | "RECEIVED" 
  | "PREPARING" 
  | "OUT_FOR_DELIVERY" 
  | "READY_FOR_PICKUP" 
  | "COMPLETED" 
  | "CANCELLED";

// OrderStatusBadge component for displaying status with appropriate styling
function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const statusConfig = {
    RECEIVED: { class: "bg-blue-100 text-blue-800 hover:bg-blue-100", label: "Received" },
    PREPARING: { class: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100", label: "Preparing" },
    OUT_FOR_DELIVERY: { class: "bg-purple-100 text-purple-800 hover:bg-purple-100", label: "Out for Delivery" },
    READY_FOR_PICKUP: { class: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100", label: "Ready for Pickup" },
    COMPLETED: { class: "bg-green-100 text-green-800 hover:bg-green-100", label: "Completed" },
    CANCELLED: { class: "bg-red-100 text-red-800 hover:bg-red-100", label: "Cancelled" },
  };

  const config = statusConfig[status] || statusConfig.RECEIVED;

  return (
    <Badge className={config.class}>
      {config.label}
    </Badge>
  );
}

// Format category names for better display
function formatCategoryName(category: string) {
  return category
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  // Get dashboard stats
  const productsCount = await db.product.count();
  const usersCount = await db.user.count();
  const pendingOrdersCount = await db.order.count({
    where: {
      status: {
        notIn: ["COMPLETED", "CANCELLED"],
      },
    },
  });
  const pendingReviewsCount = await db.review.count({
    where: {
      approved: false,
    },
  });

  // Fetch recent orders (5 most recent ones)
  const recentOrders = await db.order.findMany({
    take: 5,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  // Fetch analytics data for charts (last 7 days)
  const today = new Date();
  const lastWeek = subDays(today, 7);
  
  // Get orders within the last 7 days for revenue trend
  const recentAnalyticsOrders = await db.order.findMany({
    where: {
      createdAt: {
        gte: lastWeek,
        lte: today,
      },
      status: {
        in: ["COMPLETED", "DELIVERED"],
      },
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Calculate revenue by date for trend analysis
  const revenueTrend = new Map();
  const revenueByCategory = new Map();
  
  // Initialize the last 7 days in the map to ensure we have entries for days with no orders
  for (let i = 0; i < 7; i++) {
    const date = subDays(today, i);
    const dateKey = format(date, 'yyyy-MM-dd');
    revenueTrend.set(dateKey, 0);
  }
  
  // Process orders
  let totalRevenue = 0;
  
  recentAnalyticsOrders.forEach((order) => {
    // Format date as string (YYYY-MM-DD)
    const dateKey = format(order.createdAt, 'yyyy-MM-dd');
    
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
    
    // Count product categories
    order.items.forEach((item) => {
      const category = item.product.category;
      if (!revenueByCategory.has(category)) {
        revenueByCategory.set(category, 0);
      }
      revenueByCategory.set(category, revenueByCategory.get(category) + item.price);
    });
    
    // Add to total revenue
    totalRevenue += correctTotal;
  });
  
  // Format data for charts
  const formattedRevenueTrend = Array.from(revenueTrend.entries())
    .map(([date, amount]) => ({
      date: format(new Date(date), 'MMM d'),
      revenue: amount,
    }))
    .sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    })
    .slice(-7); // Only keep the last 7 days
  
  const formattedRevenueByCategory = Array.from(revenueByCategory.entries())
    .map(([category, amount]) => ({
      category: formatCategoryName(category),
      revenue: amount,
    }))
    .sort((a, b) => b.revenue - a.revenue) // Sort by revenue descending
    .slice(0, 5); // Only keep top 5 categories
  
  // Calculate average order value
  const averageOrderValue = recentAnalyticsOrders.length > 0 
    ? (totalRevenue / recentAnalyticsOrders.length) 
    : 0;

  return (
    <AdminLayout>
      <div className="container px-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 bg-gradient-to-r from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 p-6 rounded-lg shadow-sm">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}! Manage your store, products, orders and customers
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex gap-2">
            <Link href="/admin/analytics">
              <Button variant="outline" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Button>
            </Link>
            <Link href="/admin/products/new">
              <Button className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Add New Product
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-500" />
                Total Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{productsCount}</div>
              <Link href="/admin/products" className="text-sm text-primary mt-1 block hover:underline">
                View all products →
              </Link>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-green-500" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{usersCount}</div>
              <Link href="/admin/users" className="text-sm text-primary mt-1 block hover:underline">
                View all users →
              </Link>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-amber-500" />
                Pending Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingOrdersCount}</div>
              <Link href="/admin/orders" className="text-sm text-primary mt-1 block hover:underline">
                View all orders →
              </Link>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow transition-all">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-500" />
                Pending Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingReviewsCount}</div>
              <Link href="/admin/reviews" className="text-sm text-primary mt-1 block hover:underline">
                Moderate reviews →
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Sales Analytics Card - Client Component */}
          <div className="lg:col-span-2">
            <SalesAnalyticsCard 
              totalRevenue={totalRevenue}
              ordersCount={recentAnalyticsOrders.length}
              averageOrderValue={averageOrderValue}
              revenueTrend={formattedRevenueTrend}
              categoryData={formattedRevenueByCategory}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-sm hover:shadow transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                Recent Orders
              </CardTitle>
              <CardDescription>Latest customer orders that need your attention</CardDescription>
            </CardHeader>
            <CardContent>
              {recentOrders.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Order ID</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentOrders.map((order) => (
                          <TableRow key={order.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              <Link href={`/admin/orders/${order.id}`} className="hover:underline hover:text-primary">
                                {order.id.slice(0, 8)}...
                              </Link>
                            </TableCell>
                            <TableCell>{order.user?.name || "Anonymous"}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(order.createdAt), {
                                    addSuffix: true,
                                  })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="bg-primary/5">
                                  {order.items.length}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {order.items.length === 1 ? "item" : "items"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{formatPricePHP(order.total)}</TableCell>
                            <TableCell>
                              <OrderStatusBadge status={order.status as OrderStatus} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-center mt-4">
                    <Link href="/admin/orders">
                      <Button variant="outline" className="flex items-center gap-1">
                        View All Orders
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground text-center py-8">
                    No recent orders to display
                  </p>
                  <div className="flex justify-center">
                    <Link href="/admin/orders">
                      <Button variant="outline">View All Orders</Button>
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card className="shadow-sm hover:shadow transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-muted-foreground" />
                Quick Actions
              </CardTitle>
              <CardDescription>Frequently used admin operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link href="/admin/products/new">
                  <Button variant="outline" className="w-full justify-start">
                    <Package className="mr-2 h-4 w-4" />
                    Add New Product
                  </Button>
                </Link>
                <Link href="/admin/orders?status=received">
                  <Button variant="outline" className="w-full justify-start">
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Process Orders
                  </Button>
                </Link>
                <Link href="/admin/reviews?approved=false">
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Approve Reviews
                  </Button>
                </Link>
                <Link href="/admin/analytics">
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Analytics
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
} 