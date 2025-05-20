"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPricePHP } from "@/lib/price-utils";
import { format, formatDistanceToNow } from "date-fns";
import { ChevronLeft, ChevronRight, FileText, Filter, Package, RefreshCw } from "lucide-react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { socketClient } from "@/lib/client-socket";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define our own OrderStatus type to match Prisma's actual enum
type OrderStatus = 
  | "RECEIVED" 
  | "PREPARING" 
  | "OUT_FOR_DELIVERY" 
  | "READY_FOR_PICKUP" 
  | "COMPLETED" 
  | "CANCELLED";

type Order = {
  id: string;
  userId: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  total: number;
  orderType: string;
  items: any[];
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  deliveryFee?: number;
  pointsUsed?: number;
};

export default function AdminOrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const urlSearchParams = useSearchParams();
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [receivedCount, setReceivedCount] = useState(0);
  const [preparingCount, setPreparingCount] = useState(0);
  const [outForDeliveryCount, setOutForDeliveryCount] = useState(0);
  const [readyForPickupCount, setReadyForPickupCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [cancelledCount, setCancelledCount] = useState(0);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalOrders, setTotalOrders] = useState(0);
  const [allOrdersCount, setAllOrdersCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Get current URL parameters
  const [searchParams, setSearchParams] = useState<{
    userId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }>({});
  
  // Update searchParams whenever URL changes
  useEffect(() => {
    const userId = urlSearchParams.get('userId') || undefined;
    const status = urlSearchParams.get('status') || undefined;
    const page = Number(urlSearchParams.get('page')) || 1;
    const size = Number(urlSearchParams.get('pageSize')) || 10;
    
    // Clear user state if URL no longer has userId parameter
    if (!userId && user) {
      setUser(null);
    }
    
    // Only update if different to avoid unnecessary re-renders
    if (
      searchParams.userId !== userId || 
      searchParams.status !== status || 
      searchParams.page !== page ||
      searchParams.pageSize !== size
    ) {
      console.log(`URL params changed: status=${status}, userId=${userId}, page=${page}, pageSize=${size}`);
      setSearchParams({ userId, status, page, pageSize: size });
      setCurrentPage(page);
      setPageSize(size);
    }
  }, [urlSearchParams]);
  
  // Protect route - redirect if not admin
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
        router.push('/');
      } else {
        // Initialize socket connection for real-time updates
        if (session?.user?.id) {
          initializeSocket(session.user.id);
        }
      }
    }
  }, [status, session, router]);

  // Socket initialization and cleanup
  const initializeSocket = async (userId: string) => {
    try {
      const socket = await socketClient.initialize(userId);
      
      // Listen for new order notifications
      socket.on('notification', (notification) => {
        if (notification.type === 'NEW_ORDER' || notification.type === 'ORDER_STATUS') {
          console.log('Received order notification, refreshing data');
          fetchOrders();
        }
      });
      
      return () => {
        socket.off('notification');
      };
    } catch (error) {
      console.error('Error initializing socket:', error);
    }
  };

  // Fetch orders data
  const fetchOrders = async () => {
    setRefreshing(true);
    try {
      // Build API URL with filters - using urlSearchParams directly instead of searchParams state
      let url = '/api/admin/orders';
      const params = new URLSearchParams();
      
      // Use URL parameters directly to ensure we always have the latest values
      const userIdParam = urlSearchParams.get('userId');
      const statusParam = urlSearchParams.get('status');
      const pageParam = urlSearchParams.get('page') || currentPage.toString();
      const pageSizeParam = urlSearchParams.get('pageSize') || pageSize.toString();
      
      if (userIdParam) {
        params.append('userId', userIdParam);
      }
      
      if (statusParam) {
        params.append('status', statusParam);
      }
      
      // Add pagination parameters
      params.append('page', pageParam);
      params.append('pageSize', pageSizeParam);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      console.log(`Fetching orders from: ${url}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      
      const data = await response.json();
      console.log(`Received ${data.orders.length} orders`);
      setOrders(data.orders);
      setTotalOrders(data.totalCount);
      setAllOrdersCount(data.allOrdersCount);
      setTotalPages(Math.ceil(data.totalCount / pageSize));
      
      // Update status counts
      setReceivedCount(data.counts.received);
      setPreparingCount(data.counts.preparing);
      setOutForDeliveryCount(data.counts.outForDelivery);
      setReadyForPickupCount(data.counts.readyForPickup);
      setCompletedCount(data.counts.completed);
      setCancelledCount(data.counts.cancelled);
      setActiveOrdersCount(data.counts.active);
      
      // If userId is provided, fetch user details (use direct URL param)
      if (userIdParam && !user) {
        const userResponse = await fetch(`/api/admin/users/${userIdParam}`);
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUser(userData);
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || isLoading || refreshing) return;
    
    // Set local table loading state instead of full page loading
    setRefreshing(true);
    
    // Update URL with new page
    const newParams = new URLSearchParams();
    if (searchParams.userId) newParams.append('userId', searchParams.userId);
    if (searchParams.status) newParams.append('status', searchParams.status);
    newParams.append('page', page.toString());
    newParams.append('pageSize', pageSize.toString());
    
    // Use shallow routing to update URL without full page reload
    router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
    
    // Update the current page immediately (don't wait for effect to run)
    setCurrentPage(page);
  };
  
  // Handle page size change
  const handlePageSizeChange = (value: string) => {
    if (isLoading || refreshing) return;
    
    const newSize = parseInt(value);
    // Set local table loading state instead of full page loading
    setRefreshing(true);
    
    // Update URL with new page size and reset to page 1
    const newParams = new URLSearchParams();
    if (searchParams.userId) newParams.append('userId', searchParams.userId);
    if (searchParams.status) newParams.append('status', searchParams.status);
    newParams.append('page', '1');
    newParams.append('pageSize', newSize.toString());
    
    // Use shallow routing to update URL without full page reload
    router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
    
    // Update page size and page states immediately
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Fetch data when searchParams change or component mounts
  useEffect(() => {
    if (status === 'authenticated') {
      fetchOrders();
    }
  }, [status, searchParams, currentPage, pageSize, urlSearchParams]);

  // Set up periodic refresh every 30 seconds as a fallback
  useEffect(() => {
    if (status === 'authenticated') {
      const intervalId = setInterval(() => {
        fetchOrders();
      }, 30000);
      
      return () => clearInterval(intervalId);
    }
  }, [status]);

  // Handle manual refresh
  const handleRefresh = () => {
    fetchOrders();
  };

  // Filter orders based on current status from URL
  const getFilteredOrders = () => {
    // We don't need to filter here since the API already filters based on the URL params
    return orders;
  };

  // Only show full page loading on initial load, not during pagination
  if (status === 'loading' || (isLoading && orders.length === 0)) {
    return (
      <AdminLayout>
        <div className="container flex justify-center items-center py-12">
          <div className="animate-spin">
            <RefreshCw className="h-8 w-8 text-primary" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container px-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">Orders</h1>
              {user && (
                <span className="text-muted-foreground">
                  for {user.name}
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {user 
                ? `Manage orders for ${user.name} (${user.email})`
                : "View and manage all customer orders"}
            </p>
          </div>
          
          <div className="mt-4 md:mt-0 flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh} 
              disabled={refreshing || isLoading}
              className="flex items-center gap-1"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
            
            {user && (
              <Link href="/admin/orders">
                <Button variant="outline">View All Orders</Button>
              </Link>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-1">
                  <Filter className="h-4 w-4" /> 
                  Filter Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/admin/orders${searchParams.userId ? `?userId=${searchParams.userId}` : ''}`} className="w-full cursor-pointer">
                    All Orders
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/admin/orders?status=received${searchParams.userId ? `&userId=${searchParams.userId}` : ''}`} className="w-full cursor-pointer">
                    Received
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/admin/orders?status=preparing${searchParams.userId ? `&userId=${searchParams.userId}` : ''}`} className="w-full cursor-pointer">
                    Preparing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/admin/orders?status=out_for_delivery${searchParams.userId ? `&userId=${searchParams.userId}` : ''}`} className="w-full cursor-pointer">
                    Out for Delivery
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/admin/orders?status=ready_for_pickup${searchParams.userId ? `&userId=${searchParams.userId}` : ''}`} className="w-full cursor-pointer">
                    Ready for Pickup
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/admin/orders?status=completed${searchParams.userId ? `&userId=${searchParams.userId}` : ''}`} className="w-full cursor-pointer">
                    Completed
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/admin/orders?status=cancelled${searchParams.userId ? `&userId=${searchParams.userId}` : ''}`} className="w-full cursor-pointer">
                    Cancelled
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Order Status Summary Cards */}
        <div className="bg-card border rounded-lg mb-6 overflow-hidden">
          <div className="p-4 bg-muted/30">
            <h2 className="text-base font-medium">Order Status Overview</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x">
            <Link href={`/admin/orders${searchParams.userId ? `?userId=${searchParams.userId}` : ''}`} className="group hover:bg-muted/20 transition-colors p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted-foreground text-sm">
                  {searchParams.userId ? "User's Orders" : "All Orders"}
                </span>
                <Badge variant="outline">
                  <Package className="h-3.5 w-3.5 mr-1" /> Total
                </Badge>
              </div>
              <p className="text-3xl font-bold">{allOrdersCount}</p>
            </Link>
            
            <Link href={`/admin/orders?status=received${searchParams.userId ? `&userId=${searchParams.userId}` : ''}`} className={`group hover:bg-muted/20 transition-colors p-4 ${searchParams.status === "received" ? "bg-muted/20" : ""}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted-foreground text-sm">Received</span>
                <Badge className="bg-blue-100 text-blue-800">
                  Needs Attention
                </Badge>
              </div>
              <p className="text-3xl font-bold">{receivedCount}</p>
            </Link>
            
            <Link href={`/admin/orders?status=preparing${searchParams.userId ? `&userId=${searchParams.userId}` : ''}`} className={`group hover:bg-muted/20 transition-colors p-4 ${searchParams.status === "preparing" ? "bg-muted/20" : ""}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted-foreground text-sm">Preparing</span>
                <Badge className="bg-yellow-100 text-yellow-800">
                  In Progress
                </Badge>
              </div>
              <p className="text-3xl font-bold">{preparingCount}</p>
            </Link>
            
            <Link href={`/admin/orders?status=out_for_delivery${searchParams.userId ? `&userId=${searchParams.userId}` : ''}`} className={`group hover:bg-muted/20 transition-colors p-4 ${searchParams.status === "out_for_delivery" ? "bg-muted/20" : ""}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted-foreground text-sm">Out for Delivery</span>
                <Badge className="bg-purple-100 text-purple-800">
                  On the Way
                </Badge>
              </div>
              <p className="text-3xl font-bold">{outForDeliveryCount}</p>
            </Link>
            
            <Link href={`/admin/orders?status=ready_for_pickup${searchParams.userId ? `&userId=${searchParams.userId}` : ''}`} className={`group hover:bg-muted/20 transition-colors p-4 ${searchParams.status === "ready_for_pickup" ? "bg-muted/20" : ""}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted-foreground text-sm">Ready for Pickup</span>
                <Badge className="bg-indigo-100 text-indigo-800">
                  Ready for Pickup
                </Badge>
              </div>
              <p className="text-3xl font-bold">{readyForPickupCount}</p>
            </Link>
            
            <Link href={`/admin/orders?status=completed${searchParams.userId ? `&userId=${searchParams.userId}` : ''}`} className={`group hover:bg-muted/20 transition-colors p-4 ${searchParams.status === "completed" ? "bg-muted/20" : ""}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted-foreground text-sm">Completed</span>
                <Badge className="bg-teal-100 text-teal-800">
                  Fulfilled
                </Badge>
              </div>
              <p className="text-3xl font-bold">{completedCount}</p>
            </Link>
            
            <Link href={`/admin/orders?status=cancelled${searchParams.userId ? `&userId=${searchParams.userId}` : ''}`} className={`group hover:bg-muted/20 transition-colors p-4 ${searchParams.status === "cancelled" ? "bg-muted/20" : ""}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-muted-foreground text-sm">Cancelled</span>
                <Badge className="bg-red-100 text-red-800">
                  Cancelled
                </Badge>
              </div>
              <p className="text-3xl font-bold">{cancelledCount}</p>
            </Link>
          </div>
        </div>

        {/* Orders table */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h2 className="text-base font-medium">
              {searchParams.status 
                ? `${searchParams.status.charAt(0).toUpperCase() + searchParams.status.slice(1).toLowerCase().replace('_', ' ')} Orders`
                : "All Orders"}
              {user && <span className="text-muted-foreground ml-2 text-sm">for {user.name}</span>}
            </h2>
            {(searchParams.status || user) && (
              <Link href="/admin/orders">
                <Button variant="outline" size="sm" className="text-xs">
                  Clear Filters
                </Button>
              </Link>
            )}
          </div>
          
          {orders.length > 0 || isLoading ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Order ID</TableHead>
                      {!searchParams.userId && <TableHead className="w-[180px]">Customer</TableHead>}
                      <TableHead className="w-[180px]">Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {refreshing ? (
                      // Loading skeleton rows during pagination/filtering
                      Array.from({length: pageSize}).map((_, index) => (
                        <OrderSkeleton key={`skeleton-${index}`} withCustomer={!searchParams.userId} />
                      ))
                    ) : isLoading ? (
                      // Initial loading state
                      Array.from({length: 5}).map((_, index) => (
                        <OrderSkeleton key={`skeleton-${index}`} withCustomer={!searchParams.userId} />
                      ))
                    ) : (
                      getFilteredOrders().map((order) => {
                        // Calculate total cost correctly to match expected ₱212.00
                        const subtotal = order.items.reduce((sum, item) => {
                          return sum + (item.price * item.quantity);
                        }, 0);
                        
                        // Apply the same formula used in calculateTotal function
                        const deliveryFee = order.deliveryFee || 0;
                        const pointsDiscount = order.pointsUsed || 0;
                        const totalCost = subtotal + deliveryFee - pointsDiscount;

                        return (
                          <TableRow key={order.id} className="cursor-pointer group hover:bg-muted/50">
                            <TableCell className="font-medium">
                              <Link href={`/admin/orders/${order.id}`} className="flex items-center gap-1 hover:text-primary">
                                <FileText className="h-3.5 w-3.5 opacity-70" />
                                {order.id.substring(0, 8)}
                              </Link>
                            </TableCell>
                            {!searchParams.userId && (
                              <TableCell>
                                <Link 
                                  href={`/admin/users/${order.userId}`}
                                  className="hover:text-primary"
                                >
                                  {order.user?.name || "Guest"}
                                </Link>
                              </TableCell>
                            )}
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm">
                                  {format(new Date(order.createdAt), "MMM d, yyyy")}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(order.createdAt), "h:mm a")}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(order.createdAt), {
                                    addSuffix: true,
                                  })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <Badge variant="outline" className="bg-primary/5">
                                    {order.items.length}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {order.items.length === 1 ? "item" : "items"}
                                  </span>
                                </div>
                                <div className="max-h-24 overflow-y-auto text-xs">
                                  {order.items.slice(0, 3).map((item, index) => (
                                    <div key={index} className="mb-0.5 text-muted-foreground">
                                      <span className="font-medium text-foreground">{item.quantity > 1 ? `${item.quantity}× ` : ""}</span>
                                      {item.product?.name || (item.name || "Product")}
                                      <span className="text-muted-foreground ml-1">
                                        ({formatPricePHP(item.price)}{item.size && `, ${item.size.replace('_', ' ').toLowerCase()}`})
                                      </span>
                                    </div>
                                  ))}
                                  {order.items.length > 3 && (
                                    <div className="text-xs text-muted-foreground italic">
                                      +{order.items.length - 3} more...
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {formatPricePHP(totalCost)}
                            </TableCell>
                            <TableCell>
                              <OrderStatusBadge status={order.status as OrderStatus} />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Link href={`/admin/orders/${order.id}`}>
                                  <Button variant="outline" size="sm">
                                    View
                                  </Button>
                                </Link>
                                {(order.status === "RECEIVED" || order.status === "PREPARING" || 
                                  order.status === "OUT_FOR_DELIVERY" || order.status === "READY_FOR_PICKUP") && (
                                  <Link href={`/admin/orders/${order.id}/update`}>
                                    <Button size="sm">
                                      Update
                                    </Button>
                                  </Link>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination Controls */}
              <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Show</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={handlePageSizeChange}
                    disabled={isLoading || refreshing}
                  >
                    <SelectTrigger className="w-[70px] h-8">
                      <SelectValue placeholder={pageSize.toString()} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>per page</span>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {isLoading || refreshing ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      Loading orders...
                    </div>
                  ) : (
                    <>
                      Showing {orders.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
                      {Math.min(currentPage * pageSize, totalOrders)} of {totalOrders} orders
                    </>
                  )}
                </div>
                
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => handlePageChange(currentPage - 1)}
                        className={currentPage === 1 || refreshing ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {/* First page */}
                    {currentPage > 3 && (
                      <PaginationItem>
                        <PaginationLink 
                          onClick={() => handlePageChange(1)}
                          disabled={refreshing}
                        >
                          1
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    
                    {/* Ellipsis if needed */}
                    {currentPage > 4 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    
                    {/* Page before current if it exists */}
                    {currentPage > 1 && (
                      <PaginationItem>
                        <PaginationLink 
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={refreshing}
                        >
                          {currentPage - 1}
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    
                    {/* Current page */}
                    <PaginationItem>
                      <PaginationLink isActive disabled={refreshing}>
                        {refreshing ? (
                          <div className="flex items-center justify-center w-4 h-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                        ) : (
                          currentPage
                        )}
                      </PaginationLink>
                    </PaginationItem>
                    
                    {/* Page after current if it exists */}
                    {currentPage < totalPages && (
                      <PaginationItem>
                        <PaginationLink 
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={refreshing}
                        >
                          {currentPage + 1}
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    
                    {/* Ellipsis if needed */}
                    {currentPage < totalPages - 3 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    
                    {/* Last page if not current */}
                    {currentPage < totalPages - 2 && (
                      <PaginationItem>
                        <PaginationLink 
                          onClick={() => handlePageChange(totalPages)}
                          disabled={refreshing}
                        >
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => handlePageChange(currentPage + 1)}
                        className={currentPage === totalPages || refreshing ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </>
          ) : (
            <div className="py-16 text-center">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center">
                  <div className="w-10 h-10 mb-4 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  <p>Loading orders...</p>
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground">
                    {user 
                      ? `No orders found for ${user.name}`
                      : searchParams.status
                        ? `No ${searchParams.status.replace('_', ' ')} orders found` 
                        : "No orders found"}
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleRefresh} 
                      disabled={refreshing}
                      className="flex items-center gap-1"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                      {refreshing ? "Refreshing..." : "Try Again"}
                    </Button>
                    
                    {searchParams.status && (
                      <Link href="/admin/orders">
                        <Button variant="outline">View All Orders</Button>
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

// Helper function to render order status badge
function OrderStatusBadge({ status }: { status: OrderStatus }) {
  switch (status) {
    case "RECEIVED":
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200 whitespace-nowrap">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1.5"></div>
          Received
        </Badge>
      );
    case "PREPARING":
      return (
        <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 whitespace-nowrap">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-600 mr-1.5"></div>
          Preparing
        </Badge>
      );
    case "OUT_FOR_DELIVERY":
      return (
        <Badge variant="outline" className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200 whitespace-nowrap">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-600 mr-1.5"></div>
          Out for Delivery
        </Badge>
      );
    case "READY_FOR_PICKUP":
      return (
        <Badge variant="outline" className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 border-indigo-200 whitespace-nowrap">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 mr-1.5"></div>
          Ready for Pickup
        </Badge>
      );
    case "COMPLETED":
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 whitespace-nowrap">
          <div className="w-1.5 h-1.5 rounded-full bg-green-600 mr-1.5"></div>
          Completed
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 whitespace-nowrap">
          <div className="w-1.5 h-1.5 rounded-full bg-red-600 mr-1.5"></div>
          Cancelled
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200 whitespace-nowrap">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mr-1.5"></div>
          {status}
        </Badge>
      );
  }
}

// Add this component at the end of the file
function OrderSkeleton({ withCustomer = true }: { withCustomer?: boolean }) {
  return (
    <TableRow>
      <TableCell>
        <div className="w-24 h-5 bg-muted animate-pulse rounded"></div>
      </TableCell>
      {withCustomer && (
        <TableCell>
          <div className="w-32 h-5 bg-muted animate-pulse rounded"></div>
        </TableCell>
      )}
      <TableCell>
        <div className="flex flex-col gap-1">
          <div className="w-28 h-4 bg-muted animate-pulse rounded"></div>
          <div className="w-20 h-3 bg-muted/70 animate-pulse rounded"></div>
          <div className="w-24 h-3 bg-muted/70 animate-pulse rounded"></div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <div className="w-16 h-4 bg-muted animate-pulse rounded"></div>
          <div className="w-28 h-3 bg-muted/70 animate-pulse rounded"></div>
          <div className="w-20 h-3 bg-muted/70 animate-pulse rounded"></div>
        </div>
      </TableCell>
      <TableCell>
        <div className="w-20 h-5 bg-muted animate-pulse rounded"></div>
      </TableCell>
      <TableCell>
        <div className="w-28 h-7 bg-muted animate-pulse rounded"></div>
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-2">
          <div className="w-16 h-8 bg-muted animate-pulse rounded"></div>
          <div className="w-20 h-8 bg-muted animate-pulse rounded"></div>
        </div>
      </TableCell>
    </TableRow>
  );
} 