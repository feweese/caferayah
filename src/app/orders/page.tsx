"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/main-layout";
import { Icons } from "@/components/icons";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import { motion } from "framer-motion";
import { Loader2, ShoppingBag, CheckCircle, Pencil, PackageCheck, ExternalLink } from "lucide-react";
import { calculateItemTotal, formatPricePHP, calculateTotal, parseAddons, hasAddons } from "@/lib/price-utils";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  temperature: string;
  addons: Array<{id: string; name: string; price: number}>;
  addonsJson: string;
  product?: {
    id: string;
    name: string;
    image: string | null;
  };
}

interface Order {
  id: string;
  items: OrderItem[];
  totalPrice: number;
  subtotal: number;
  deliveryFee: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
  deliveryAddress: string | null;
  addressLine1: string | null;
  contactNumber: string | null;
  pointsUsed: number;
  totalAmount: number;
  total?: number;
}

// Use the MotionCard component for animations
const MotionCard = motion(Card);

interface ImageWithShimmerProps {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
  quality?: number;
}

// Shimmer effect component
const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#f6f7f8" offset="0%" />
      <stop stop-color="#edeef1" offset="20%" />
      <stop stop-color="#f6f7f8" offset="40%" />
      <stop stop-color="#f6f7f8" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#f6f7f8" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`;

const toBase64 = (str: string) =>
  typeof window === 'undefined'
    ? Buffer.from(str).toString('base64')
    : window.btoa(str);

// Image component with shimmer effect
function ImageWithShimmer({ src, alt, sizes, className, priority, quality }: ImageWithShimmerProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      priority={priority}
      quality={quality || 85}
      placeholder="blur"
      blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer(700, 700))}`}
    />
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrders, setUpdatingOrders] = useState<Record<string, boolean>>({});
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [reviewableProducts, setReviewableProducts] = useState<Array<{id: string, name: string, image?: string, orderId: string}>>([]);
  const [loadingReviewable, setLoadingReviewable] = useState(false);
  
  // New state for review dialog
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{id: string, name: string, orderId: string} | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 6; // Show 6 orders per page (2 rows of 3 cards)
  const productsPerPage = 10; // Show 10 products per page (2 rows of 5 cards on large screens)
  
  // Check if user is admin
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  // Mark component as mounted after first render (client-side only)
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Redirect admin users to the menu page
  useEffect(() => {
    if (mounted && isAdmin) {
      toast.info("Orders page is disabled in admin preview mode", {
        description: "To view and manage orders, please use the admin dashboard",
        action: {
          label: "Go to Dashboard",
          onClick: () => router.push("/admin/orders"),
        },
      });
      router.push("/menu");
    }
  }, [mounted, isAdmin, router]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        
        if (session?.user) {
          // Fetch orders from the API for logged-in users
          const response = await fetch('/api/orders');
          if (response.ok) {
            const apiOrders = await response.json();
            
            // Add detailed logging to debug the issue
            console.log('Raw API orders:', JSON.stringify(apiOrders, null, 2));
            
            // Convert API orders to match the expected format
            const formattedOrders = apiOrders.map((order: any) => {
              // Check if items exist and are an array
              if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
                console.error(`Order ${order.id} has invalid items:`, order.items);
              }
              
              // Calculate subtotal from items if not present in the order
              let orderSubtotal = order.subtotal;
              if (!orderSubtotal) {
                orderSubtotal = Array.isArray(order.items) ? 
                  order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) : 0;
                console.log(`Calculated subtotal for order ${order.id}:`, orderSubtotal);
              }
              
              // Get delivery fee based on payment method
              const isCOD = order.paymentMethod?.toLowerCase().includes('delivery') || 
                           order.paymentMethod?.toLowerCase().includes('cod');
              const orderDeliveryFee = isCOD ? (order.deliveryFee || 50) : 0;
              
              // Get points used
              const orderPointsUsed = order.pointsUsed || 0;
              
              // Calculate total using the cart formula
              const calculatedTotal = orderSubtotal + orderDeliveryFee - orderPointsUsed;
              
              console.log(`Order ${order.id} detailed calculation:`, {
                apiTotal: order.total,
                items: Array.isArray(order.items) ? order.items.length : 0,
                submittedSubtotal: order.subtotal,
                calculatedSubtotal: orderSubtotal,
                deliveryFee: orderDeliveryFee, 
                pointsUsed: orderPointsUsed,
                calculatedTotal: calculatedTotal,
                paymentMethod: order.paymentMethod,
                matches: order.total === calculatedTotal
              });
              
              return {
                id: order.id,
                items: order.items.map((item: any) => {
                  // Fix: Get the product name directly from the item's product
                  const productName = item.product?.name || "Unnamed Product";
                  // Fix: Get image from the item's product, not the order's product
                  const productImage = item.product?.images && item.product.images.length > 0 
                    ? item.product.images[0] 
                    : null;
                  
                  return {
                    id: item.id,
                    name: productName, // Fixed: correct product name
                    price: item.price || 0,
                    quantity: item.quantity || 1,
                    size: item.size || "SIXTEEN_OZ",
                    temperature: item.temperature || "ICED",
                    addons: Array.isArray(item.addons) ? item.addons : [],
                    addonsJson: item.addonsJson,
                    product: { 
                      id: item.product?.id || item.productId || "unknown",
                      name: productName, // Fixed: Use the correct name
                      image: productImage // Fixed: Use the correct image
                    }
                  };
                }),
                totalPrice: calculatedTotal, // Use our calculated total
                subtotal: orderSubtotal,
                deliveryFee: orderDeliveryFee,
                paymentMethod: order.paymentMethod || "in_store",
                status: order.status?.toLowerCase() || "processing",
                createdAt: order.createdAt || new Date().toISOString(),
                deliveryAddress: order.deliveryAddress,
                addressLine1: order.deliveryAddress,
                contactNumber: order.contactNumber,
                pointsUsed: orderPointsUsed,
                totalAmount: calculatedTotal, // Use our calculated total here too
                total: calculatedTotal // Use our calculated total
              };
            });
            
            setOrders(formattedOrders);
          } else {
            // Fallback to localStorage if API fails
            const savedOrders = JSON.parse(localStorage.getItem("orders") || "[]");
            setOrders(savedOrders);
          }
        } else {
          // For non-logged in users, use localStorage
          const savedOrders = JSON.parse(localStorage.getItem("orders") || "[]");
          setOrders(savedOrders);
        }
      } catch (error) {
        console.error("Error loading orders:", error);
        // Fallback to localStorage
        const savedOrders = JSON.parse(localStorage.getItem("orders") || "[]");
        setOrders(savedOrders);
      } finally {
        setLoading(false);
      }
    };

    // Only run on client-side
    if (typeof window !== 'undefined') {
      fetchOrders();
    }
  }, [session]);

  // Fetch reviewable products when the tab changes to 'to_review'
  useEffect(() => {
    if (activeTab === "to_review" && session?.user) {
      setLoadingReviewable(true);
      
      fetch('/api/reviews/reviewable')
        .then(res => res.json())
        .then(data => {
          if (data.products) {
            setReviewableProducts(data.products.map((product: any) => ({
              id: product.id,
              name: product.name,
              image: product.image,
              orderId: product.orderId
            })));
          }
        })
        .catch(error => {
          console.error('Error fetching reviewable products:', error);
          toast.error('Failed to load reviewable products');
        })
        .finally(() => {
          setLoadingReviewable(false);
        });
    }
  }, [activeTab, session?.user]);

  const handleOrderReceived = async (orderId: string) => {
    if (!orderId) return;
    
    // Set the order as updating
    setUpdatingOrders({...updatingOrders, [orderId]: true});
    
    try {
      // Call the API endpoint directly
      const response = await fetch('/api/orders/confirm', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to update order status");
      }
      
      // Success - update the local state
      setOrders(orders.map(order => 
        order.id === orderId 
          ? {...order, status: "completed"} 
          : order
      ));
      
      toast.success(result.message || "Order marked as completed");
      
      // Refresh the page to get updated data
      router.refresh();
    } catch (error) {
      console.error("Error confirming order:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update order status");
    } finally {
      setUpdatingOrders({...updatingOrders, [orderId]: false});
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    // Show confirmation dialog instead of using browser's confirm
    setOrderToCancel(orderId);
    setShowCancelConfirm(true);
  };

  const confirmCancelOrder = async () => {
    if (!orderToCancel) return;
    
    setUpdatingOrders({...updatingOrders, [orderToCancel]: true});
    
    try {
      // Call the API endpoint directly
      const response = await fetch('/api/orders/cancel', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId: orderToCancel })
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to cancel order");
      }
      
      // Success - update the local state
      setOrders(orders.map(order => 
        order.id === orderToCancel 
          ? {...order, status: "cancelled"} 
          : order
      ));
      
      toast.success(result.message || "Order cancelled successfully");
      
      // Refresh the page to get updated data
      router.refresh();
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error(error instanceof Error ? error.message : "Failed to cancel order");
    } finally {
      setUpdatingOrders({...updatingOrders, [orderToCancel]: false});
      setShowCancelConfirm(false);
      setOrderToCancel(null);
    }
  };

  // Helper function to check order status in a case-insensitive way
  const hasStatus = (order: Order, status: string): boolean => {
    return order.status?.toLowerCase() === status.toLowerCase();
  };

  // Helper function to check if payment method is Cash on Delivery
   
  const isCashOnDelivery = (paymentMethod?: string): boolean => {
    if (!paymentMethod) return false;
    
    const method = paymentMethod.toLowerCase();
    return (
      method === "cod" || 
      method === "cash_on_delivery" || 
      method.includes("cash") || 
      method.includes("delivery") ||
      method.includes("cod")
    );
  };

  // Replace the handleWriteReview function with this one to open the dialog instead of redirecting
  const handleWriteReview = async (productId: string, orderId: string, productName: string) => {
    try {
      // Check if the user has already reviewed this product for this order before opening the dialog
      const existingReviewResponse = await fetch(`/api/reviews/check?productId=${productId}&orderId=${orderId}`);
      const existingReviewData = await existingReviewResponse.json();
      
      if (existingReviewResponse.ok && existingReviewData.hasReviewed) {
        toast.info("You have already reviewed this product. Thank you for your feedback!");
        return;
      }
      
      // If no existing review, open the dialog
      setSelectedProduct({id: productId, orderId, name: productName});
      setRating(0);
      setComment("");
      setShowReviewDialog(true);
    } catch (error) {
      console.error("Error checking review status:", error);
      toast.error("Something went wrong. Please try again.");
    }
  };
  
  // Add a function to handle review submission
  const handleReviewSubmit = async () => {
    if (!selectedProduct) return;
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    try {
      setIsSubmittingReview(true);
      
      // First check if the user can review this product from this order
      const eligibilityResponse = await fetch(`/api/orders/completed?productId=${selectedProduct.id}&orderId=${selectedProduct.orderId}`);
      const eligibilityData = await eligibilityResponse.json();
      
      if (!eligibilityResponse.ok) {
        throw new Error("Failed to check review eligibility");
      }
      
      if (!eligibilityData.canReview) {
        toast.error("You can only review products from completed orders");
        setShowReviewDialog(false);
        return;
      }

      // Check if the user has already reviewed this product for this order
      const existingReviewResponse = await fetch(`/api/reviews/check?productId=${selectedProduct.id}&orderId=${selectedProduct.orderId}`);
      const existingReviewData = await existingReviewResponse.json();
      
      if (existingReviewResponse.ok && existingReviewData.hasReviewed) {
        toast.info("You have already reviewed this product. Thank you for your feedback!");
        setShowReviewDialog(false);
        return;
      }

      // Submit the review with orderId
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          orderId: selectedProduct.orderId,
          rating,
          comment,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error && data.error.includes("already reviewed")) {
          toast.info("You have already reviewed this product. Thank you for your feedback!");
          setShowReviewDialog(false);
          return;
        }
        throw new Error(data.error || "Something went wrong with the submission");
      }

      toast.success("Review submitted successfully and pending approval!");
      setShowReviewDialog(false);
      
      // Remove the reviewed product from the reviewable products list
      setReviewableProducts(prev => 
        prev.filter(product => !(product.id === selectedProduct.id && product.orderId === selectedProduct.orderId))
      );
      
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Function to handle page change
  const paginate = (pageNumber: number, filteredOrders: Order[]) => {
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      // Scroll to top of orders section
      window.scrollTo({ 
        top: document.getElementById('orders-section')?.offsetTop || 0, 
        behavior: 'smooth' 
      });
    }
  };

  // Helper function to get paginated orders based on filter
  const getPaginatedOrders = (filteredOrders: Order[]) => {
    const indexOfLastOrder = currentPage * ordersPerPage;
    const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
    return filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  };
  
  // Helper function to get paginated products for the "To Review" tab
  const getPaginatedProducts = () => {
    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    return reviewableProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  };

  // Reset to page 1 when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  if (status === "loading") {
    return (
      <MainLayout>
        <div className="container py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
          <div className="animate-spin">
            <Icons.logo className="h-8 w-8" />
          </div>
        </div>
      </MainLayout>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "success";
      case "out_for_delivery":
        return "secondary";
      case "ready_for_pickup":
        return "secondary";
      case "preparing":
        return "warning";
      case "received":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

   
  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return <Icons.checkCircle className="h-4 w-4 text-green-600" />;
      case "out_for_delivery":
        return <Icons.truck className="h-4 w-4 text-blue-600" />;
      case "ready_for_pickup":
        return <Icons.checkCircle className="h-4 w-4 text-indigo-600" />;
      case "preparing":
        return <Icons.coffee className="h-4 w-4 text-yellow-600" />;
      case "received":
        return <Icons.check className="h-4 w-4 text-blue-600" />;
      case "cancelled":
        return <Icons.xCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Icons.spinner className="h-4 w-4 text-gray-600" />;
    }
  };

  // Format the status into a readable string
  const formatStatus = (status: string) => {
    if (!status) return "Processing";
    
    switch (status.toLowerCase()) {
      case "out_for_delivery":
        return "Out For Delivery";
      case "ready_for_pickup":
        return "Ready For Pickup";
      default:
        // Capitalize the first letter
        return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }
  };

   
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

   
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // Function to get formatted add-ons for display
  const getAddonsList = (item: OrderItem): string => {
    const addons = parseAddons(item);
    return addons.map(addon => addon.name).join(', ');
  };

  return (
    <MainLayout>
      <div className="container py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start mb-8">
          <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-background w-full rounded-lg p-8 mb-8 shadow-sm">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/70 text-transparent bg-clip-text">Your Orders</h1>
            <p className="text-muted-foreground max-w-xl">
              Track your order history, manage deliveries, and leave reviews for your purchases
            </p>
          </div>

          {loading ? (
            <div className="w-full flex justify-center py-12">
              <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                  <Icons.logo className="h-10 w-10 text-primary/50 animate-spin" />
                </div>
                <div className="h-4 w-48 bg-muted rounded"></div>
                <div className="h-2 w-24 bg-muted rounded"></div>
              </div>
            </div>
          ) : orders.length > 0 ? (
            <div className="space-y-6 w-full">
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm pb-2 pt-1 border-b">
                  <TabsList className="mb-0">
                    <TabsTrigger value="all" className="relative">
                      All Orders
                      <Badge variant="outline" className="ml-2">
                        {orders.length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="received" className="relative">
                      Received
                      {orders.filter(order => order.status?.toLowerCase() === "received").length > 0 && (
                        <Badge variant="outline" className="ml-2">
                          {orders.filter(order => order.status?.toLowerCase() === "received").length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="preparing" className="relative">
                      Preparing
                      {orders.filter(order => order.status?.toLowerCase() === "preparing").length > 0 && (
                        <Badge variant="outline" className="ml-2">
                          {orders.filter(order => order.status?.toLowerCase() === "preparing").length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="out_for_delivery" className="relative">
                      Out For Delivery
                      {orders.filter(order => order.status?.toLowerCase() === "out_for_delivery").length > 0 && (
                        <Badge variant="outline" className="ml-2">
                          {orders.filter(order => order.status?.toLowerCase() === "out_for_delivery").length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="ready_for_pickup" className="relative">
                      Ready For Pickup
                      {orders.filter(order => order.status?.toLowerCase() === "ready_for_pickup").length > 0 && (
                        <Badge variant="outline" className="ml-2">
                          {orders.filter(order => order.status?.toLowerCase() === "ready_for_pickup").length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="relative">
                      Completed
                      {orders.filter(order => order.status?.toLowerCase() === "completed").length > 0 && (
                        <Badge variant="outline" className="ml-2">
                          {orders.filter(order => order.status?.toLowerCase() === "completed").length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="cancelled" className="relative">
                      Cancelled
                      {orders.filter(order => order.status?.toLowerCase() === "cancelled").length > 0 && (
                        <Badge variant="outline" className="ml-2">
                          {orders.filter(order => order.status?.toLowerCase() === "cancelled").length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="to_review" className="relative">
                      To Review
                      {reviewableProducts.length > 0 && (
                        <Badge variant="secondary" className="ml-2 bg-primary text-primary-foreground">
                          {reviewableProducts.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <div className="mt-6 min-h-[300px]" id="orders-section">
                  {activeTab === "all" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {loading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                          <p className="mt-2 text-muted-foreground">Loading your orders...</p>
                        </div>
                      ) : orders.length > 0 ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {getPaginatedOrders(orders).map((order) => (
                              <MotionCard key={order.id} className="overflow-hidden">
                                <CardHeader className="pb-2">
                                  <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">Order #{order.id.slice(-6)}</CardTitle>
                                    <Badge variant={getStatusColor(order.status)}>
                                      {formatStatus(order.status)}
                                    </Badge>
                                  </div>
                                  <CardDescription>{new Date(order.createdAt).toLocaleDateString()}</CardDescription>
                                </CardHeader>
                                <CardContent className="pb-3">
                                  <div className="space-y-2">
                                    {order.items.map((item) => (
                                      <div key={item.id} className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                          <div className="h-10 w-10 rounded-md overflow-hidden bg-primary/5 flex items-center justify-center">
                                            {item.product?.image ? (
                                              <Image
                                                src={item.product.image}
                                                alt={item.product?.name || "Product"}
                                                width={40}
                                                height={40}
                                                className="object-cover"
                                              />
                                            ) : (
                                              <Icons.coffee className="h-6 w-6 text-primary/50" />
                                            )}
                                          </div>
                                          <div>
                                            <span className="font-medium">{item.product?.name || item.name} × {item.quantity}</span>
                                            {item.addons && item.addons.length > 0 && (
                                              <div className="text-xs text-muted-foreground mt-0.5">
                                                + {getAddonsList(item)}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <span className="text-muted-foreground">{formatPricePHP(calculateItemTotal(item))}</span>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                                <CardFooter className="flex flex-col gap-2">
                                  <div className="border-t pt-3 flex justify-between w-full">
                                    <span className="font-medium">Total:</span>
                                    <span className="font-bold">{formatPricePHP(order.totalPrice)}</span>
                                  </div>
                                  <div className="flex flex-col xs:flex-row gap-2 w-full">
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="w-full"
                                      onClick={() => router.push(`/orders/${order.id}`)}
                                    >
                                      <Icons.fileText className="mr-2 h-4 w-4" />
                                      View Details
                                    </Button>
                                    {(order.status?.toLowerCase() === "received") && (
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="w-full"
                                        onClick={() => handleCancelOrder(order.id)}
                                        disabled={updatingOrders[order.id]}
                                      >
                                        {updatingOrders[order.id] ? (
                                          <><Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> Cancelling...</>
                                        ) : (
                                          <><Icons.xCircle className="mr-2 h-4 w-4" /> Cancel Order</>
                                        )}
                                      </Button>
                                    )}
                                    {(order.status?.toLowerCase() === "out_for_delivery" || 
                                      order.status?.toLowerCase() === "ready_for_pickup") && (
                                      <Button
                                        size="sm"
                                        variant="default"
                                        className="w-full"
                                        onClick={() => handleOrderReceived(order.id)}
                                        disabled={updatingOrders[order.id]}
                                      >
                                        {updatingOrders[order.id] ? (
                                          <><Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> Confirming...</>
                                        ) : (
                                          <><Icons.check className="mr-2 h-4 w-4" /> Confirm Received</>
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                </CardFooter>
                              </MotionCard>
                            ))}
                          </div>
                          
                          {/* Pagination Controls */}
                          {orders.length > ordersPerPage && (
                            <div className="mt-8 flex justify-center">
                              <Pagination>
                                <PaginationContent>
                                  <PaginationItem>
                                    <PaginationPrevious 
                                      onClick={() => paginate(currentPage - 1, orders)}
                                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                                      size="default"
                                    />
                                  </PaginationItem>
                                  
                                  {Array.from({ length: Math.ceil(orders.length / ordersPerPage) }).map((_, index) => {
                                    const pageNumber = index + 1;
                                    const totalPages = Math.ceil(orders.length / ordersPerPage);
                                    
                                    // Show first page, last page, and pages around current page
                                    if (
                                      totalPages <= 5 || 
                                      pageNumber === 1 || 
                                      pageNumber === totalPages || 
                                      (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                                    ) {
                                      return (
                                        <PaginationItem key={pageNumber}>
                                          <PaginationLink 
                                            isActive={pageNumber === currentPage}
                                            onClick={() => paginate(pageNumber, orders)}
                                            size="default"
                                          >
                                            {pageNumber}
                                          </PaginationLink>
                                        </PaginationItem>
                                      );
                                    }
                                    
                                    // Add ellipsis for gaps
                                    if (
                                      (pageNumber === 2 && currentPage > 3) || 
                                      (pageNumber === totalPages - 1 && currentPage < totalPages - 2)
                                    ) {
                                      return (
                                        <PaginationItem key={pageNumber}>
                                          <PaginationEllipsis />
                                        </PaginationItem>
                                      );
                                    }
                                    
                                    return null;
                                  })}
                                  
                                  <PaginationItem>
                                    <PaginationNext 
                                      onClick={() => paginate(currentPage + 1, orders)}
                                      className={currentPage === Math.ceil(orders.length / ordersPerPage) ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                                      size="default"
                                    />
                                  </PaginationItem>
                                </PaginationContent>
                              </Pagination>
                            </div>
                          )}
                          
                          {/* Summary showing the current page info */}
                          {orders.length > ordersPerPage && (
                            <div className="text-center text-xs text-muted-foreground mt-2">
                              Showing {(currentPage - 1) * ordersPerPage + 1}-{Math.min(currentPage * ordersPerPage, orders.length)} of {orders.length} orders
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-10">
                          <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                          <h3 className="mt-2 text-lg font-medium">No Orders Found</h3>
                          <p className="mt-1 text-muted-foreground">You haven&apos;t placed any orders yet.</p>
                          <Button onClick={() => router.push('/menu')} className="mt-4">
                            Browse Menu
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "to_review" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {loadingReviewable ? (
                        <div className="flex flex-col items-center justify-center h-64">
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                          <p className="mt-2 text-muted-foreground">Finding products to review...</p>
                        </div>
                      ) : reviewableProducts.length > 0 ? (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {getPaginatedProducts().map((product, index) => (
                              <MotionCard 
                                key={`${product.id}-${product.orderId}-${index}`} 
                                className="overflow-hidden group relative cursor-pointer hover:shadow-md transition-all duration-200 border border-border hover:border-primary/20 hover:-translate-y-1"
                                onClick={(e) => {
                                  // Don't navigate if clicking the button
                                  if ((e.target as HTMLElement).closest('button')) return;
                                  router.push(`/orders/${product.orderId}`);
                                }}
                              >
                                {/* Order link indicator */}
                                <div className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm rounded-full p-1 shadow-sm opacity-80 group-hover:opacity-100 transition-opacity">
                                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                                </div>
                                <div className="relative w-full aspect-[4/3] overflow-hidden bg-primary/5">
                                  {product.image ? (
                                    <ImageWithShimmer
                                      src={product.image}
                                      alt={product.name}
                                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                                      className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
                                      priority={index < 3}
                                      quality={85}
                                    />
                                  ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                      <Icons.coffee className="h-12 w-12 text-primary/40" />
                                      <span className="text-xs text-muted-foreground mt-1">No image</span>
                                    </div>
                                  )}
                                </div>
                                <CardHeader className="pb-2 pt-3 px-4">
                                  <CardTitle className="text-base">{product.name}</CardTitle>
                                  <CardDescription className="text-xs">
                                    <span className="flex items-center gap-1.5">
                                      <Icons.fileText className="h-3 w-3 opacity-70" />
                                      View order details
                                    </span>
                                  </CardDescription>
                                </CardHeader>
                                <CardFooter className="pt-0 pb-3 px-4">
                                  <Button 
                                    onClick={(e) => {
                                      e.stopPropagation(); 
                                      handleWriteReview(product.id, product.orderId, product.name)
                                    }}
                                    className="w-full"
                                    size="sm"
                                  >
                                    Write Review <Pencil className="ml-2 h-3.5 w-3.5" />
                                  </Button>
                                </CardFooter>
                              </MotionCard>
                            ))}
                          </div>
                          
                          {/* Pagination Controls */}
                          {reviewableProducts.length > productsPerPage && (
                            <div className="mt-8 flex justify-center">
                              <Pagination>
                                <PaginationContent>
                                  <PaginationItem>
                                    <PaginationPrevious 
                                      onClick={() => paginate(currentPage - 1, reviewableProducts)}
                                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                                      size="default"
                                    />
                                  </PaginationItem>
                                  
                                  {Array.from({ length: Math.ceil(reviewableProducts.length / productsPerPage) }).map((_, index) => {
                                    const pageNumber = index + 1;
                                    const totalPages = Math.ceil(reviewableProducts.length / productsPerPage);
                                    
                                    if (totalPages <= 5 || pageNumber === 1 || pageNumber === totalPages || (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)) {
                                      return (
                                        <PaginationItem key={pageNumber}>
                                          <PaginationLink 
                                            isActive={pageNumber === currentPage}
                                            onClick={() => paginate(pageNumber, reviewableProducts)}
                                            size="default"
                                          >
                                            {pageNumber}
                                          </PaginationLink>
                                        </PaginationItem>
                                      );
                                    }
                                    
                                    if ((pageNumber === 2 && currentPage > 3) || (pageNumber === totalPages - 1 && currentPage < totalPages - 2)) {
                                      return (
                                        <PaginationItem key={pageNumber}>
                                          <PaginationEllipsis />
                                        </PaginationItem>
                                      );
                                    }
                                    
                                    return null;
                                  })}
                                  
                                  <PaginationItem>
                                    <PaginationNext 
                                      onClick={() => paginate(currentPage + 1, reviewableProducts)}
                                      className={currentPage === Math.ceil(reviewableProducts.length / productsPerPage) ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                                      size="default"
                                    />
                                  </PaginationItem>
                                </PaginationContent>
                              </Pagination>
                            </div>
                          )}
                          
                          {reviewableProducts.length > productsPerPage && (
                            <div className="text-center text-xs text-muted-foreground mt-2">
                              Showing {(currentPage - 1) * productsPerPage + 1}-{Math.min(currentPage * productsPerPage, reviewableProducts.length)} of {reviewableProducts.length} products to review
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-10">
                          <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                          <h3 className="mt-2 text-lg font-medium">No Products to Review</h3>
                          <p className="mt-1 text-muted-foreground">You&apos;ve reviewed all your purchased products.</p>
                          <Button onClick={() => setActiveTab("all")} className="mt-4">
                            View All Orders
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "received" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {/* Content for received orders */}
                      {loading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                          <p className="mt-2 text-muted-foreground">Loading received orders...</p>
                        </div>
                      ) : orders.filter(order => order.status?.toLowerCase() === "received").length > 0 ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {getPaginatedOrders(orders.filter(order => order.status?.toLowerCase() === "received")).map((order) => (
                              <MotionCard key={order.id} className="overflow-hidden">
                                <CardHeader className="pb-2">
                                  <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">Order #{order.id.slice(-6)}</CardTitle>
                                    <Badge variant={getStatusColor(order.status)}>
                                      {formatStatus(order.status)}
                                    </Badge>
                                  </div>
                                  <CardDescription>{new Date(order.createdAt).toLocaleDateString()}</CardDescription>
                                </CardHeader>
                                <CardContent className="pb-3">
                                  <div className="space-y-2">
                                    {order.items.map((item) => (
                                      <div key={item.id} className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                          <div className="h-10 w-10 rounded-md overflow-hidden bg-primary/5 flex items-center justify-center">
                                            {item.product?.image ? (
                                              <Image
                                                src={item.product.image}
                                                alt={item.product?.name || "Product"}
                                                width={40}
                                                height={40}
                                                className="object-cover"
                                              />
                                            ) : (
                                              <Icons.coffee className="h-6 w-6 text-primary/50" />
                                            )}
                                          </div>
                                          <div>
                                            <span className="font-medium">{item.product?.name || item.name} × {item.quantity}</span>
                                            {item.addons && item.addons.length > 0 && (
                                              <div className="text-xs text-muted-foreground mt-0.5">
                                                + {getAddonsList(item)}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <span className="text-muted-foreground">{formatPricePHP(calculateItemTotal(item))}</span>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                                <CardFooter className="flex flex-col gap-2">
                                  <div className="border-t pt-3 flex justify-between w-full">
                                    <span className="font-medium">Total:</span>
                                    <span className="font-bold">{formatPricePHP(order.totalPrice)}</span>
                                  </div>
                                  <div className="flex flex-col xs:flex-row gap-2 w-full">
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="w-full"
                                      onClick={() => router.push(`/orders/${order.id}`)}
                                    >
                                      <Icons.fileText className="mr-2 h-4 w-4" />
                                      View Details
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="w-full"
                                      onClick={() => handleCancelOrder(order.id)}
                                      disabled={updatingOrders[order.id]}
                                    >
                                      {updatingOrders[order.id] ? (
                                        <><Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> Cancelling...</>
                                      ) : (
                                        <><Icons.xCircle className="mr-2 h-4 w-4" /> Cancel Order</>
                                      )}
                                    </Button>
                                  </div>
                                </CardFooter>
                              </MotionCard>
                            ))}
                          </div>
                          
                          {/* Pagination Controls */}
                          {orders.filter(order => order.status?.toLowerCase() === "received").length > ordersPerPage && (
                            <div className="mt-8 flex justify-center">
                              <Pagination>
                                <PaginationContent>
                                  <PaginationItem>
                                    <PaginationPrevious 
                                      onClick={() => paginate(currentPage - 1, orders.filter(order => order.status?.toLowerCase() === "received"))}
                                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                                      size="default"
                                    />
                                  </PaginationItem>
                                  
                                  {Array.from({ length: Math.ceil(orders.filter(order => order.status?.toLowerCase() === "received").length / ordersPerPage) }).map((_, index) => {
                                    const pageNumber = index + 1;
                                    const totalPages = Math.ceil(orders.filter(order => order.status?.toLowerCase() === "received").length / ordersPerPage);
                                    
                                    if (totalPages <= 5 || pageNumber === 1 || pageNumber === totalPages || (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)) {
                                      return (
                                        <PaginationItem key={pageNumber}>
                                          <PaginationLink 
                                            isActive={pageNumber === currentPage}
                                            onClick={() => paginate(pageNumber, orders.filter(order => order.status?.toLowerCase() === "received"))}
                                            size="default"
                                          >
                                            {pageNumber}
                                          </PaginationLink>
                                        </PaginationItem>
                                      );
                                    }
                                    
                                    if ((pageNumber === 2 && currentPage > 3) || (pageNumber === totalPages - 1 && currentPage < totalPages - 2)) {
                                      return (
                                        <PaginationItem key={pageNumber}>
                                          <PaginationEllipsis />
                                        </PaginationItem>
                                      );
                                    }
                                    
                                    return null;
                                  })}
                                  
                                  <PaginationItem>
                                    <PaginationNext 
                                      onClick={() => paginate(currentPage + 1, orders.filter(order => order.status?.toLowerCase() === "received"))}
                                      className={currentPage === Math.ceil(orders.filter(order => order.status?.toLowerCase() === "received").length / ordersPerPage) ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                                      size="default"
                                    />
                                  </PaginationItem>
                                </PaginationContent>
                              </Pagination>
                            </div>
                          )}
                          
                          {orders.filter(order => order.status?.toLowerCase() === "received").length > ordersPerPage && (
                            <div className="text-center text-xs text-muted-foreground mt-2">
                              Showing {(currentPage - 1) * ordersPerPage + 1}-{Math.min(currentPage * ordersPerPage, orders.filter(order => order.status?.toLowerCase() === "received").length)} of {orders.filter(order => order.status?.toLowerCase() === "received").length} orders
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-10">
                          <PackageCheck className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                          <h3 className="mt-2 text-lg font-medium">No Received Orders</h3>
                          <p className="mt-1 text-muted-foreground">You don&apos;t have any received orders yet.</p>
                          <Button onClick={() => setActiveTab("all")} className="mt-4">
                            View All Orders
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "preparing" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {loading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                          <p className="mt-2 text-muted-foreground">Loading preparing orders...</p>
                        </div>
                      ) : orders.filter(order => order.status?.toLowerCase() === "preparing").length > 0 ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {getPaginatedOrders(orders.filter(order => order.status?.toLowerCase() === "preparing")).map((order) => (
                              <MotionCard key={order.id} className="overflow-hidden">
                                <CardHeader className="pb-2">
                                  <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">Order #{order.id.slice(-6)}</CardTitle>
                                    <Badge variant={getStatusColor(order.status)}>
                                      {formatStatus(order.status)}
                                    </Badge>
                                  </div>
                                  <CardDescription>{new Date(order.createdAt).toLocaleDateString()}</CardDescription>
                                </CardHeader>
                                <CardContent className="pb-3">
                                  <div className="space-y-2">
                                    {order.items.map((item) => (
                                      <div key={item.id} className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                          <div className="h-10 w-10 rounded-md overflow-hidden bg-primary/5 flex items-center justify-center">
                                            {item.product?.image ? (
                                              <Image
                                                src={item.product.image}
                                                alt={item.product?.name || "Product"}
                                                width={40}
                                                height={40}
                                                className="object-cover"
                                              />
                                            ) : (
                                              <Icons.coffee className="h-6 w-6 text-primary/50" />
                                            )}
                                          </div>
                                          <div>
                                            <span className="font-medium">{item.product?.name || item.name} × {item.quantity}</span>
                                            {item.addons && item.addons.length > 0 && (
                                              <div className="text-xs text-muted-foreground mt-0.5">
                                                + {getAddonsList(item)}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <span className="text-muted-foreground">{formatPricePHP(calculateItemTotal(item))}</span>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                                <CardFooter className="flex flex-col gap-2">
                                  <div className="border-t pt-3 flex justify-between w-full">
                                    <span className="font-medium">Total:</span>
                                    <span className="font-bold">{formatPricePHP(order.totalPrice)}</span>
                                  </div>
                                  <div className="flex flex-col xs:flex-row gap-2 w-full">
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="w-full"
                                      onClick={() => router.push(`/orders/${order.id}`)}
                                    >
                                      <Icons.fileText className="mr-2 h-4 w-4" />
                                      View Details
                                    </Button>
                                  </div>
                                </CardFooter>
                              </MotionCard>
                            ))}
                          </div>
                          
                          {/* Pagination Controls */}
                          {orders.filter(order => order.status?.toLowerCase() === "preparing").length > ordersPerPage && (
                            <div className="mt-8 flex justify-center">
                              <Pagination>
                                <PaginationContent>
                                  <PaginationItem>
                                    <PaginationPrevious 
                                      onClick={() => paginate(currentPage - 1, orders.filter(order => order.status?.toLowerCase() === "preparing"))}
                                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                                      size="default"
                                    />
                                  </PaginationItem>
                                  
                                  {Array.from({ length: Math.ceil(orders.filter(order => order.status?.toLowerCase() === "preparing").length / ordersPerPage) }).map((_, index) => {
                                    const pageNumber = index + 1;
                                    const totalPages = Math.ceil(orders.filter(order => order.status?.toLowerCase() === "preparing").length / ordersPerPage);
                                    
                                    if (totalPages <= 5 || pageNumber === 1 || pageNumber === totalPages || (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)) {
                                      return (
                                        <PaginationItem key={pageNumber}>
                                          <PaginationLink 
                                            isActive={pageNumber === currentPage}
                                            onClick={() => paginate(pageNumber, orders.filter(order => order.status?.toLowerCase() === "preparing"))}
                                            size="default"
                                          >
                                            {pageNumber}
                                          </PaginationLink>
                                        </PaginationItem>
                                      );
                                    }
                                    
                                    if ((pageNumber === 2 && currentPage > 3) || (pageNumber === totalPages - 1 && currentPage < totalPages - 2)) {
                                      return (
                                        <PaginationItem key={pageNumber}>
                                          <PaginationEllipsis />
                                        </PaginationItem>
                                      );
                                    }
                                    
                                    return null;
                                  })}
                                  
                                  <PaginationItem>
                                    <PaginationNext 
                                      onClick={() => paginate(currentPage + 1, orders.filter(order => order.status?.toLowerCase() === "preparing"))}
                                      className={currentPage === Math.ceil(orders.filter(order => order.status?.toLowerCase() === "preparing").length / ordersPerPage) ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                                      size="default"
                                    />
                                  </PaginationItem>
                                </PaginationContent>
                              </Pagination>
                            </div>
                          )}
                          
                          {orders.filter(order => order.status?.toLowerCase() === "preparing").length > ordersPerPage && (
                            <div className="text-center text-xs text-muted-foreground mt-2">
                              Showing {(currentPage - 1) * ordersPerPage + 1}-{Math.min(currentPage * ordersPerPage, orders.filter(order => order.status?.toLowerCase() === "preparing").length)} of {orders.filter(order => order.status?.toLowerCase() === "preparing").length} orders
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-10">
                          <Icons.coffee className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                          <h3 className="mt-2 text-lg font-medium">No Preparing Orders</h3>
                          <p className="mt-1 text-muted-foreground">You don&apos;t have any orders being prepared.</p>
                          <Button onClick={() => setActiveTab("all")} className="mt-4">
                            View All Orders
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "out_for_delivery" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {loading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                          <p className="mt-2 text-muted-foreground">Loading delivery orders...</p>
                        </div>
                      ) : orders.filter(order => order.status?.toLowerCase() === "out_for_delivery").length > 0 ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {getPaginatedOrders(orders.filter(order => order.status?.toLowerCase() === "out_for_delivery")).map((order) => (
                              <MotionCard key={order.id} className="overflow-hidden">
                                <CardHeader className="pb-2">
                                  <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">Order #{order.id.slice(-6)}</CardTitle>
                                    <Badge variant={getStatusColor(order.status)}>
                                      {formatStatus(order.status)}
                                    </Badge>
                                  </div>
                                  <CardDescription>{new Date(order.createdAt).toLocaleDateString()}</CardDescription>
                                </CardHeader>
                                <CardContent className="pb-3">
                                  <div className="space-y-2">
                                    {order.items.map((item) => (
                                      <div key={item.id} className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                          <div className="h-10 w-10 rounded-md overflow-hidden bg-primary/5 flex items-center justify-center">
                                            {item.product?.image ? (
                                              <Image
                                                src={item.product.image}
                                                alt={item.product?.name || "Product"}
                                                width={40}
                                                height={40}
                                                className="object-cover"
                                              />
                                            ) : (
                                              <Icons.coffee className="h-6 w-6 text-primary/50" />
                                            )}
                                          </div>
                                          <div>
                                            <span className="font-medium">{item.product?.name || item.name} × {item.quantity}</span>
                                            {item.addons && item.addons.length > 0 && (
                                              <div className="text-xs text-muted-foreground mt-0.5">
                                                + {getAddonsList(item)}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <span className="text-muted-foreground">{formatPricePHP(calculateItemTotal(item))}</span>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                                <CardFooter className="flex flex-col gap-2">
                                  <div className="border-t pt-3 flex justify-between w-full">
                                    <span className="font-medium">Total:</span>
                                    <span className="font-bold">{formatPricePHP(order.totalPrice)}</span>
                                  </div>
                                  <div className="flex flex-col xs:flex-row gap-2 w-full">
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="w-full"
                                      onClick={() => router.push(`/orders/${order.id}`)}
                                    >
                                      <Icons.fileText className="mr-2 h-4 w-4" />
                                      View Details
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="w-full"
                                      onClick={() => handleOrderReceived(order.id)}
                                      disabled={updatingOrders[order.id]}
                                    >
                                      {updatingOrders[order.id] ? (
                                        <><Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> Confirming...</>
                                      ) : (
                                        <><Icons.check className="mr-2 h-4 w-4" /> Confirm Received</>
                                      )}
                                    </Button>
                                  </div>
                                </CardFooter>
                              </MotionCard>
                            ))}
                          </div>
                          
                          {/* Pagination Controls */}
                          {orders.filter(order => order.status?.toLowerCase() === "out_for_delivery").length > ordersPerPage && (
                            <div className="mt-8 flex justify-center">
                              <Pagination>
                                <PaginationContent>
                                  <PaginationItem>
                                    <PaginationPrevious 
                                      onClick={() => paginate(currentPage - 1, orders.filter(order => order.status?.toLowerCase() === "out_for_delivery"))}
                                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                                      size="default"
                                    />
                                  </PaginationItem>
                                  
                                  {Array.from({ length: Math.ceil(orders.filter(order => order.status?.toLowerCase() === "out_for_delivery").length / ordersPerPage) }).map((_, index) => {
                                    const pageNumber = index + 1;
                                    const totalPages = Math.ceil(orders.filter(order => order.status?.toLowerCase() === "out_for_delivery").length / ordersPerPage);
                                    
                                    if (totalPages <= 5 || pageNumber === 1 || pageNumber === totalPages || (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)) {
                                      return (
                                        <PaginationItem key={pageNumber}>
                                          <PaginationLink 
                                            isActive={pageNumber === currentPage}
                                            onClick={() => paginate(pageNumber, orders.filter(order => order.status?.toLowerCase() === "out_for_delivery"))}
                                            size="default"
                                          >
                                            {pageNumber}
                                          </PaginationLink>
                                        </PaginationItem>
                                      );
                                    }
                                    
                                    if ((pageNumber === 2 && currentPage > 3) || (pageNumber === totalPages - 1 && currentPage < totalPages - 2)) {
                                      return (
                                        <PaginationItem key={pageNumber}>
                                          <PaginationEllipsis />
                                        </PaginationItem>
                                      );
                                    }
                                    
                                    return null;
                                  })}
                                  
                                  <PaginationItem>
                                    <PaginationNext 
                                      onClick={() => paginate(currentPage + 1, orders.filter(order => order.status?.toLowerCase() === "out_for_delivery"))}
                                      className={currentPage === Math.ceil(orders.filter(order => order.status?.toLowerCase() === "out_for_delivery").length / ordersPerPage) ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                                      size="default"
                                    />
                                  </PaginationItem>
                                </PaginationContent>
                              </Pagination>
                            </div>
                          )}
                          
                          {orders.filter(order => order.status?.toLowerCase() === "out_for_delivery").length > ordersPerPage && (
                            <div className="text-center text-xs text-muted-foreground mt-2">
                              Showing {(currentPage - 1) * ordersPerPage + 1}-{Math.min(currentPage * ordersPerPage, orders.filter(order => order.status?.toLowerCase() === "out_for_delivery").length)} of {orders.filter(order => order.status?.toLowerCase() === "out_for_delivery").length} orders
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-10">
                          <Icons.truck className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                          <h3 className="mt-2 text-lg font-medium">No Orders Out For Delivery</h3>
                          <p className="mt-1 text-muted-foreground">You don&apos;t have any orders out for delivery.</p>
                          <Button onClick={() => setActiveTab("all")} className="mt-4">
                            View All Orders
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "ready_for_pickup" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {loading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                          <p className="mt-2 text-muted-foreground">Loading pickup orders...</p>
                        </div>
                      ) : orders.filter(order => order.status?.toLowerCase() === "ready_for_pickup").length > 0 ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {getPaginatedOrders(orders.filter(order => order.status?.toLowerCase() === "ready_for_pickup")).map((order) => (
                              <MotionCard key={order.id} className="overflow-hidden">
                                <CardHeader className="pb-2">
                                  <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">Order #{order.id.slice(-6)}</CardTitle>
                                    <Badge variant={getStatusColor(order.status)}>
                                      {formatStatus(order.status)}
                                    </Badge>
                                  </div>
                                  <CardDescription>{new Date(order.createdAt).toLocaleDateString()}</CardDescription>
                                </CardHeader>
                                <CardContent className="pb-3">
                                  <div className="space-y-2">
                                    {order.items.map((item) => (
                                      <div key={item.id} className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                          <div className="h-10 w-10 rounded-md overflow-hidden bg-primary/5 flex items-center justify-center">
                                            {item.product?.image ? (
                                              <Image
                                                src={item.product.image}
                                                alt={item.product?.name || "Product"}
                                                width={40}
                                                height={40}
                                                className="object-cover"
                                              />
                                            ) : (
                                              <Icons.coffee className="h-6 w-6 text-primary/50" />
                                            )}
                                          </div>
                                          <div>
                                            <span className="font-medium">{item.product?.name || item.name} × {item.quantity}</span>
                                            {item.addons && item.addons.length > 0 && (
                                              <div className="text-xs text-muted-foreground mt-0.5">
                                                + {getAddonsList(item)}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <span className="text-muted-foreground">{formatPricePHP(calculateItemTotal(item))}</span>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                                <CardFooter className="flex flex-col gap-2">
                                  <div className="border-t pt-3 flex justify-between w-full">
                                    <span className="font-medium">Total:</span>
                                    <span className="font-bold">{formatPricePHP(order.totalPrice)}</span>
                                  </div>
                                  <div className="flex flex-col xs:flex-row gap-2 w-full">
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="w-full"
                                      onClick={() => router.push(`/orders/${order.id}`)}
                                    >
                                      <Icons.fileText className="mr-2 h-4 w-4" />
                                      View Details
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="w-full"
                                      onClick={() => handleOrderReceived(order.id)}
                                      disabled={updatingOrders[order.id]}
                                    >
                                      {updatingOrders[order.id] ? (
                                        <><Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> Confirming...</>
                                      ) : (
                                        <><Icons.check className="mr-2 h-4 w-4" /> Confirm Received</>
                                      )}
                                    </Button>
                                  </div>
                                </CardFooter>
                              </MotionCard>
                            ))}
                          </div>
                          
                          {/* Pagination Controls */}
                          {orders.filter(order => order.status?.toLowerCase() === "ready_for_pickup").length > ordersPerPage && (
                            <div className="mt-8 flex justify-center">
                              <Pagination>
                                <PaginationContent>
                                  <PaginationItem>
                                    <PaginationPrevious 
                                      onClick={() => paginate(currentPage - 1, orders.filter(order => order.status?.toLowerCase() === "ready_for_pickup"))}
                                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                                      size="default"
                                    />
                                  </PaginationItem>
                                  
                                  {Array.from({ length: Math.ceil(orders.filter(order => order.status?.toLowerCase() === "ready_for_pickup").length / ordersPerPage) }).map((_, index) => {
                                    const pageNumber = index + 1;
                                    const totalPages = Math.ceil(orders.filter(order => order.status?.toLowerCase() === "ready_for_pickup").length / ordersPerPage);
                                    
                                    if (totalPages <= 5 || pageNumber === 1 || pageNumber === totalPages || (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)) {
                                      return (
                                        <PaginationItem key={pageNumber}>
                                          <PaginationLink 
                                            isActive={pageNumber === currentPage}
                                            onClick={() => paginate(pageNumber, orders.filter(order => order.status?.toLowerCase() === "ready_for_pickup"))}
                                            size="default"
                                          >
                                            {pageNumber}
                                          </PaginationLink>
                                        </PaginationItem>
                                      );
                                    }
                                    
                                    if ((pageNumber === 2 && currentPage > 3) || (pageNumber === totalPages - 1 && currentPage < totalPages - 2)) {
                                      return (
                                        <PaginationItem key={pageNumber}>
                                          <PaginationEllipsis />
                                        </PaginationItem>
                                      );
                                    }
                                    
                                    return null;
                                  })}
                                  
                                  <PaginationItem>
                                    <PaginationNext 
                                      onClick={() => paginate(currentPage + 1, orders.filter(order => order.status?.toLowerCase() === "ready_for_pickup"))}
                                      className={currentPage === Math.ceil(orders.filter(order => order.status?.toLowerCase() === "ready_for_pickup").length / ordersPerPage) ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                                      size="default"
                                    />
                                  </PaginationItem>
                                </PaginationContent>
                              </Pagination>
                            </div>
                          )}
                          
                          {orders.filter(order => order.status?.toLowerCase() === "ready_for_pickup").length > ordersPerPage && (
                            <div className="text-center text-xs text-muted-foreground mt-2">
                              Showing {(currentPage - 1) * ordersPerPage + 1}-{Math.min(currentPage * ordersPerPage, orders.filter(order => order.status?.toLowerCase() === "ready_for_pickup").length)} of {orders.filter(order => order.status?.toLowerCase() === "ready_for_pickup").length} orders
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-10">
                          <Icons.bag className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                          <h3 className="mt-2 text-lg font-medium">No Pickup Orders</h3>
                          <p className="mt-1 text-muted-foreground">You don&apos;t have any orders ready for pickup.</p>
                          <Button onClick={() => setActiveTab("all")} className="mt-4">
                            View All Orders
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "completed" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {loading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                          <p className="mt-2 text-muted-foreground">Loading completed orders...</p>
                        </div>
                      ) : orders.filter(order => order.status?.toLowerCase() === "completed").length > 0 ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {getPaginatedOrders(orders.filter(order => order.status?.toLowerCase() === "completed")).map((order) => (
                              <MotionCard key={order.id} className="overflow-hidden">
                                <CardHeader className="pb-2">
                                  <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">Order #{order.id.slice(-6)}</CardTitle>
                                    <Badge variant={getStatusColor(order.status)}>
                                      {formatStatus(order.status)}
                                    </Badge>
                                  </div>
                                  <CardDescription>{new Date(order.createdAt).toLocaleDateString()}</CardDescription>
                                </CardHeader>
                                <CardContent className="pb-3">
                                  <div className="space-y-2">
                                    {order.items.map((item) => (
                                      <div key={item.id} className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                          <div className="h-10 w-10 rounded-md overflow-hidden bg-primary/5 flex items-center justify-center">
                                            {item.product?.image ? (
                                              <Image
                                                src={item.product.image}
                                                alt={item.product?.name || "Product"}
                                                width={40}
                                                height={40}
                                                className="object-cover"
                                              />
                                            ) : (
                                              <Icons.coffee className="h-6 w-6 text-primary/50" />
                                            )}
                                          </div>
                                          <div>
                                            <span className="font-medium">{item.product?.name || item.name} × {item.quantity}</span>
                                            {item.addons && item.addons.length > 0 && (
                                              <div className="text-xs text-muted-foreground mt-0.5">
                                                + {getAddonsList(item)}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <span className="text-muted-foreground">{formatPricePHP(calculateItemTotal(item))}</span>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                                <CardFooter className="flex flex-col gap-2">
                                  <div className="border-t pt-3 flex justify-between w-full">
                                    <span className="font-medium">Total:</span>
                                    <span className="font-bold">{formatPricePHP(order.totalPrice)}</span>
                                  </div>
                                  <div className="flex xs:flex-row gap-2 w-full">
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="w-full"
                                      onClick={() => router.push(`/orders/${order.id}`)}
                                    >
                                      <Icons.fileText className="mr-2 h-4 w-4" />
                                      View Details
                                    </Button>
                                  </div>
                                </CardFooter>
                              </MotionCard>
                            ))}
                          </div>
                          
                          {/* Pagination Controls */}
                          {orders.filter(order => order.status?.toLowerCase() === "completed").length > ordersPerPage && (
                            <div className="mt-8 flex justify-center">
                              <Pagination>
                                <PaginationContent>
                                  <PaginationItem>
                                    <PaginationPrevious 
                                      onClick={() => paginate(currentPage - 1, orders.filter(order => order.status?.toLowerCase() === "completed"))}
                                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                                      size="default"
                                    />
                                  </PaginationItem>
                                  
                                  {Array.from({ length: Math.ceil(orders.filter(order => order.status?.toLowerCase() === "completed").length / ordersPerPage) }).map((_, index) => {
                                    const pageNumber = index + 1;
                                    const totalPages = Math.ceil(orders.filter(order => order.status?.toLowerCase() === "completed").length / ordersPerPage);
                                    
                                    if (totalPages <= 5 || pageNumber === 1 || pageNumber === totalPages || (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)) {
                                      return (
                                        <PaginationItem key={pageNumber}>
                                          <PaginationLink 
                                            isActive={pageNumber === currentPage}
                                            onClick={() => paginate(pageNumber, orders.filter(order => order.status?.toLowerCase() === "completed"))}
                                            size="default"
                                          >
                                            {pageNumber}
                                          </PaginationLink>
                                        </PaginationItem>
                                      );
                                    }
                                    
                                    if ((pageNumber === 2 && currentPage > 3) || (pageNumber === totalPages - 1 && currentPage < totalPages - 2)) {
                                      return (
                                        <PaginationItem key={pageNumber}>
                                          <PaginationEllipsis />
                                        </PaginationItem>
                                      );
                                    }
                                    
                                    return null;
                                  })}
                                  
                                  <PaginationItem>
                                    <PaginationNext 
                                      onClick={() => paginate(currentPage + 1, orders.filter(order => order.status?.toLowerCase() === "completed"))}
                                      className={currentPage === Math.ceil(orders.filter(order => order.status?.toLowerCase() === "completed").length / ordersPerPage) ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                                      size="default"
                                    />
                                  </PaginationItem>
                                </PaginationContent>
                              </Pagination>
                            </div>
                          )}
                          
                          {orders.filter(order => order.status?.toLowerCase() === "completed").length > ordersPerPage && (
                            <div className="text-center text-xs text-muted-foreground mt-2">
                              Showing {(currentPage - 1) * ordersPerPage + 1}-{Math.min(currentPage * ordersPerPage, orders.filter(order => order.status?.toLowerCase() === "completed").length)} of {orders.filter(order => order.status?.toLowerCase() === "completed").length} orders
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-10">
                          <Icons.checkCircle className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                          <h3 className="mt-2 text-lg font-medium">No Completed Orders</h3>
                          <p className="mt-1 text-muted-foreground">You don&apos;t have any completed orders yet.</p>
                          <Button onClick={() => setActiveTab("all")} className="mt-4">
                            View All Orders
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "cancelled" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {loading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                          <p className="mt-2 text-muted-foreground">Loading cancelled orders...</p>
                        </div>
                      ) : orders.filter(order => order.status?.toLowerCase() === "cancelled").length > 0 ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {getPaginatedOrders(orders.filter(order => order.status?.toLowerCase() === "cancelled")).map((order) => (
                              <MotionCard key={order.id} className="overflow-hidden">
                                <CardHeader className="pb-2">
                                  <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">Order #{order.id.slice(-6)}</CardTitle>
                                    <Badge variant={getStatusColor(order.status)}>
                                      {formatStatus(order.status)}
                                    </Badge>
                                  </div>
                                  <CardDescription>{new Date(order.createdAt).toLocaleDateString()}</CardDescription>
                                </CardHeader>
                                <CardContent className="pb-3">
                                  <div className="space-y-2">
                                    {order.items.map((item) => (
                                      <div key={item.id} className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                          <div className="h-10 w-10 rounded-md overflow-hidden bg-primary/5 flex items-center justify-center">
                                            {item.product?.image ? (
                                              <Image
                                                src={item.product.image}
                                                alt={item.product?.name || "Product"}
                                                width={40}
                                                height={40}
                                                className="object-cover"
                                              />
                                            ) : (
                                              <Icons.coffee className="h-6 w-6 text-primary/50" />
                                            )}
                                          </div>
                                          <div>
                                            <span className="font-medium">{item.product?.name || item.name} × {item.quantity}</span>
                                            {item.addons && item.addons.length > 0 && (
                                              <div className="text-xs text-muted-foreground mt-0.5">
                                                + {getAddonsList(item)}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <span className="text-muted-foreground">{formatPricePHP(calculateItemTotal(item))}</span>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                                <CardFooter className="flex flex-col gap-2">
                                  <div className="border-t pt-3 flex justify-between w-full">
                                    <span className="font-medium">Total:</span>
                                    <span className="font-bold">{formatPricePHP(order.totalPrice)}</span>
                                  </div>
                                  <div className="flex xs:flex-row gap-2 w-full">
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="w-full"
                                      onClick={() => router.push(`/orders/${order.id}`)}
                                    >
                                      <Icons.fileText className="mr-2 h-4 w-4" />
                                      View Details
                                    </Button>
                                  </div>
                                </CardFooter>
                              </MotionCard>
                            ))}
                          </div>
                          
                          {/* Pagination Controls */}
                          {orders.filter(order => order.status?.toLowerCase() === "cancelled").length > ordersPerPage && (
                            <div className="mt-8 flex justify-center">
                              <Pagination>
                                <PaginationContent>
                                  <PaginationItem>
                                    <PaginationPrevious 
                                      onClick={() => paginate(currentPage - 1, orders.filter(order => order.status?.toLowerCase() === "cancelled"))}
                                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                                      size="default"
                                    />
                                  </PaginationItem>
                                  
                                  {Array.from({ length: Math.ceil(orders.filter(order => order.status?.toLowerCase() === "cancelled").length / ordersPerPage) }).map((_, index) => {
                                    const pageNumber = index + 1;
                                    const totalPages = Math.ceil(orders.filter(order => order.status?.toLowerCase() === "cancelled").length / ordersPerPage);
                                    
                                    if (totalPages <= 5 || pageNumber === 1 || pageNumber === totalPages || (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)) {
                                      return (
                                        <PaginationItem key={pageNumber}>
                                          <PaginationLink 
                                            isActive={pageNumber === currentPage}
                                            onClick={() => paginate(pageNumber, orders.filter(order => order.status?.toLowerCase() === "cancelled"))}
                                            size="default"
                                          >
                                            {pageNumber}
                                          </PaginationLink>
                                        </PaginationItem>
                                      );
                                    }
                                    
                                    if ((pageNumber === 2 && currentPage > 3) || (pageNumber === totalPages - 1 && currentPage < totalPages - 2)) {
                                      return (
                                        <PaginationItem key={pageNumber}>
                                          <PaginationEllipsis />
                                        </PaginationItem>
                                      );
                                    }
                                    
                                    return null;
                                  })}
                                  
                                  <PaginationItem>
                                    <PaginationNext 
                                      onClick={() => paginate(currentPage + 1, orders.filter(order => order.status?.toLowerCase() === "cancelled"))}
                                      className={currentPage === Math.ceil(orders.filter(order => order.status?.toLowerCase() === "cancelled").length / ordersPerPage) ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                                      size="default"
                                    />
                                  </PaginationItem>
                                </PaginationContent>
                              </Pagination>
                            </div>
                          )}
                          
                          {orders.filter(order => order.status?.toLowerCase() === "cancelled").length > ordersPerPage && (
                            <div className="text-center text-xs text-muted-foreground mt-2">
                              Showing {(currentPage - 1) * ordersPerPage + 1}-{Math.min(currentPage * ordersPerPage, orders.filter(order => order.status?.toLowerCase() === "cancelled").length)} of {orders.filter(order => order.status?.toLowerCase() === "cancelled").length} orders
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-10">
                          <Icons.xCircle className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                          <h3 className="mt-2 text-lg font-medium">No Cancelled Orders</h3>
                          <p className="mt-1 text-muted-foreground">You don&apos;t have any cancelled orders.</p>
                          <Button onClick={() => setActiveTab("all")} className="mt-4">
                            View All Orders
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </Tabs>
            </div>
          ) : (
            <div className="w-full">
              <Card className="border border-muted/50 overflow-hidden shadow-sm">
                <CardContent className="flex flex-col items-center py-16">
                  <div className="bg-gradient-to-r from-muted/40 to-muted/20 p-6 rounded-full mb-6">
                    <Icons.shoppingBag className="h-16 w-16 text-muted-foreground/60" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">No Orders Yet</h2>
                  <p className="text-muted-foreground text-center mb-8 max-w-md">
                    You haven't placed any orders yet. Start browsing our products and place your first order!
                  </p>
                  <Button size="lg" asChild>
                    <Link href="/menu">
                      <Icons.coffee className="h-4 w-4 mr-2" />
                      Browse Menu
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
      
      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 border-b">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-xl flex items-center">
                <Icons.star className="h-5 w-5 mr-2 text-amber-500 fill-amber-400" />
                <span className="text-amber-900 font-semibold">Review {selectedProduct?.name}</span>
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Share your experience with this product. Your feedback helps us improve!
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Star Rating */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground/90">Your Rating</label>
              <div className="flex items-center justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="focus:outline-none transition-all duration-150 hover:scale-115"
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onClick={() => setRating(star)}
                  >
                    <Icons.star 
                      className={`h-9 w-9 transition-all duration-200 ${
                        star <= (hoveredStar || rating)
                          ? "text-amber-400 fill-amber-400 scale-110"
                          : "text-muted-foreground/40"
                      }`} 
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-center text-sm font-medium text-amber-600 pt-1">
                  {rating === 1 && "Poor"}
                  {rating === 2 && "Fair"}
                  {rating === 3 && "Good"}
                  {rating === 4 && "Very Good"}
                  {rating === 5 && "Excellent"}
                </p>
              )}
            </div>
            
            {/* Comment */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/90">Comment (Optional)</label>
              <Textarea
                placeholder="Tell us what you think about this product..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="resize-none border-muted/50 focus:border-amber-300"
              />
              <p className="text-xs text-muted-foreground italic mt-1">
                All reviews are subject to approval by our admin team before being published.
              </p>
            </div>
          </div>
          
          <DialogFooter className="p-4 bg-muted/5 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowReviewDialog(false)}
              disabled={isSubmittingReview}
              className="border-muted/70"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleReviewSubmit}
              disabled={isSubmittingReview || rating === 0}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSubmittingReview ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this order? This action cannot be undone.
            </AlertDialogDescription>
            <div className="mt-4 space-y-2 text-sm border rounded-lg p-4 bg-muted/20">
              <div className="font-medium text-foreground">When you cancel this order:</div>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Your order will be marked as cancelled</li>
                {orderToCancel && hasStatus(orders.find(o => o.id === orderToCancel) || {status: ''}, "COMPLETED") && (
                  <li>Any loyalty points you earned from this order will be deducted</li>
                )}
                <li>Any loyalty points you used for this order will be refunded</li>
                <li>You'll receive a notification confirming the cancellation</li>
              </ul>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>No, Keep Order</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCancelOrder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {updatingOrders[orderToCancel || ""] ? (
                <><Icons.spinner className="h-4 w-4 mr-1.5 animate-spin" />Cancelling...</>
              ) : (
                <><Icons.xCircle className="h-4 w-4 mr-1.5" />Yes, Cancel Order</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}

// Helper function to count items in an order
function itemCount(order: Order): number {
  return order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
} 