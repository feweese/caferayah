"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { getImagePath } from "@/lib/products";
import ReviewProductButton from "@/components/order/review-product-button";
import ConfirmOrderButton from "@/components/order/confirm-order-button";
import { 
  User, 
  ShoppingBag, 
  FileText,
  CreditCard,
  Clock, 
  Truck,
  Home,
  Plus,
  Check,
  CheckCircle,
  CheckCircle2, 
  ChevronLeft,
  ArrowRight,
  Loader2,
  Trash2,
  Receipt,
  Coffee,
  XCircle,
  Add,
  Trash,
  Sun,
  Moon,
  Warning,
  ListOrdered,
  MapPin,
  Banknote,
  Store,
  Calendar,
  AlertTriangle,
  Phone,
  ClipboardList,
  Clipboard,
  Package,
  X,
} from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { toast } from "sonner";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Icons } from "@/components/icons";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { useEffect as ReactUseEffect } from "react";
import { socketClient } from "@/lib/client-socket";
import { calculateItemTotal, formatPricePHP, calculateTotal, calculateSubtotal, parseAddons, hasDeliveryFee } from "@/lib/price-utils";

interface OrderItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    images: string[];
  };
  price: number;
  quantity: number;
  size: string;
  temperature: string;
  addons: string | null | any[];
  addonsJson?: string | null;
  processedAddons?: any[];
}

interface Order {
  id: string;
  status: string;
  total: number;
  paymentMethod: string;
  paymentStatus?: string;
  paymentProofUrl?: string;
  createdAt: string;
  addressLine1?: string;
  addressLine2?: string;
  contactNumber?: string;
  items: OrderItem[];
  number: string;
  customer?: {
    name: string;
    email: string;
  };
  addressNotes?: string;
  pointsUsed: number;
  pointsEarned: number;
  subtotal?: number;
  deliveryFee?: number;
  deliveryAddress?: string;
  completedAt?: string;
  updatedAt?: string;
  cancelledAt?: string;
  statusHistory?: {
    status: string;
    createdAt: string;
  }[];
}

export default function OrderDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  // Unwrap the params object using React.use()
  const resolvedParams = React.use(params);
  const orderId = resolvedParams.id;
  
  const { data: session, status } = useSession({
    required: false,
    onUnauthenticated() {
      router.push('/login');
    },
  });
  const router = useRouter();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [reviewStatusMap, setReviewStatusMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [sessionRetries, setSessionRetries] = useState(0);
  const [apiRetries, setApiRetries] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [statusHistory, setStatusHistory] = useState([]);
  
  // Check if user is admin
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  // Mark component as mounted after first render (client-side only)
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Redirect admin users to the menu page
  useEffect(() => {
    if (mounted && isAdmin) {
      toast.info("Order details are disabled in admin preview mode", {
        description: "To view order details, please use the admin dashboard",
        action: {
          label: "Go to Dashboard",
          onClick: () => router.push("/admin/orders"),
        },
      });
      router.push("/menu");
    }
  }, [mounted, isAdmin, router]);

  useEffect(() => {
    // If we get a session fetch error and haven't tried too many times yet, retry
    if (status === 'loading' && sessionRetries < 3) {
      const retryTimer = setTimeout(() => {
        console.log(`Retrying session fetch (attempt ${sessionRetries + 1})`);
        setSessionRetries(prev => prev + 1);
        // Force a session refresh by manipulating the URL slightly
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('_r', String(Date.now()));
        window.history.replaceState({}, '', currentUrl.toString());
        window.location.reload();
      }, 2000); // Wait 2 seconds between retries
      
      return () => clearTimeout(retryTimer);
    }
  }, [status, sessionRetries]);

  useEffect(() => {
    // Only fetch order details if we have a valid session or are still loading session
    // This helps prevent unnecessary API calls when unauthenticated
    if ((status === "authenticated" || status === "loading") && orderId) {
      fetchOrderDetails();
    }
    
    // Handle unauthenticated case without router.push to avoid redundant redirects
    // since we're using onUnauthenticated callback above
  }, [status, orderId]);

  // Add debugging to check payment method 
  useEffect(() => {
    if (order) {
      console.log("Order payment method:", order.paymentMethod);
      console.log("Order payment status:", order.paymentStatus);
      console.log("Has delivery address:", !!(order.addressLine1 || order.deliveryAddress));
      console.log("Should show pickup timeline:", order.paymentMethod === "IN_STORE" || !(order.addressLine1 || order.deliveryAddress));
      console.log("Is GCash payment:", order.paymentMethod === "GCASH");
    }
  }, [order]);

  // Add effect to check review status for all products in the order
  ReactUseEffect(() => {
    if (order?.status === "COMPLETED" && order.items.length > 0) {
      const checkReviewStatus = async () => {
        try {
          // Create a map of product IDs to track review status
          const productIds = order.items.map(item => item.productId || item.product?.id).filter(Boolean);
          
          // Skip if no valid product IDs
          if (productIds.length === 0) return;
          
          // Make a single API call to check all products at once
          // Include the orderId to check reviews for this specific order
          const queryString = productIds.map(id => `productId=${id}`).join('&') + `&orderId=${order.id}`;
          const response = await fetch(`/api/reviews/check-batch?${queryString}`);
          
          if (response.ok) {
            const data = await response.json();
            setReviewStatusMap(data.reviewStatusMap || {});
          }
        } catch (error) {
          console.error("Error checking review status:", error);
        }
      };
      
      checkReviewStatus();
    }
  }, [order]);

  // Socket initialization for real-time updates
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id && orderId) {
      console.log("Initializing socket for order updates:", orderId);
      
      let pollingInterval: NodeJS.Timeout | null = null;
      let socketConnected = false;
      
      const setupSocket = async () => {
        try {
          const socket = await socketClient.initialize(session.user.id);
          
          // Listen for order status and payment notifications
          socket.on('notification', (notification) => {
            console.log("Received notification:", notification);
            if ((notification.type === 'ORDER_STATUS' || notification.type === 'PAYMENT_VERIFICATION') && 
                notification.link && 
                notification.link.includes(orderId)) {
              console.log('Received order or payment update notification, refreshing data');
              fetchOrderDetails();
            }
          });
          
          socket.on('connect', () => {
            console.log('Socket connected for order updates');
            socketConnected = true;
            
            // If polling was started as a fallback, we can stop it now
            if (pollingInterval) {
              console.log('Socket connected, stopping polling fallback');
              clearInterval(pollingInterval);
              pollingInterval = null;
            }
          });
          
          socket.on('connect_error', (error) => {
            console.error('Socket connect error:', error.message);
            
            // Start polling if socket fails to connect and polling isn't already active
            if (!pollingInterval && !socketConnected) {
              console.log('Starting polling fallback for order updates');
              pollingInterval = setInterval(() => {
                console.log('Polling for order updates');
                fetchOrderDetails();
              }, 10000); // Poll every 10 seconds
            }
          });
          
          // Start polling as a fallback anyway if we're on Vercel
          // This ensures updates even if the socket connection seems fine but isn't working
          const isVercelDeployment = window.location.origin.includes('vercel.app') || 
                                    window.location.origin.includes('caferayah');
          
          if (isVercelDeployment) {
            console.log('Vercel deployment detected, starting polling fallback');
            pollingInterval = setInterval(() => {
              console.log('Polling for order updates (Vercel fallback)');
              fetchOrderDetails();
            }, 10000); // Poll every 10 seconds on Vercel
          }
          
          return () => {
            console.log("Cleaning up socket listeners and polling interval");
            socket.off('notification');
            socket.off('connect');
            socket.off('connect_error');
            
            if (pollingInterval) {
              clearInterval(pollingInterval);
              pollingInterval = null;
            }
          };
        } catch (error) {
          console.error('Error initializing socket:', error);
          
          // Start polling as fallback if socket initialization fails
          console.log('Starting polling fallback due to socket initialization failure');
          pollingInterval = setInterval(() => {
            console.log('Polling for order updates (fallback)');
            fetchOrderDetails();
          }, 10000); // Poll every 10 seconds
          
          return () => {
            if (pollingInterval) {
              clearInterval(pollingInterval);
              pollingInterval = null;
            }
          };
        }
      };
      
      const cleanup = setupSocket();
      return () => {
        if (cleanup && typeof cleanup === 'function') {
          cleanup();
        }
      };
    }
  }, [status, session, orderId]);

  const fetchOrderDetails = async () => {
    try {
      console.log(`[Client] Fetching order details for ID: ${orderId}`);
      setIsLoading(true);
      setError(null);
      
      // Don't attempt to fetch if not authenticated
      if (status === "unauthenticated") {
        throw new Error("You need to be logged in to view order details");
      }

      // Create an AbortController to handle timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for slower connections
      
      try {
        console.log(`[Client] Making API request to /api/orders/${orderId}`);
        const response = await fetch(`/api/orders/${orderId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          cache: 'no-store', // Prevent caching issues
        });
        
        // Clear the timeout since we got a response
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          console.error(`[Client] Error fetching order: ${response.status} ${response.statusText}`);
          let errorMessage;
          
          try {
            const errorText = await response.text();
            console.error(`[Client] Error response body:`, errorText);
            
            try {
              // Try to parse as JSON
              const errorData = JSON.parse(errorText);
              errorMessage = errorData.error || errorData.message || `Failed to fetch order: ${response.statusText}`;
            } catch (parseError) {
              // If not JSON, use the raw text
              errorMessage = errorText || `Failed to fetch order: ${response.statusText}`;
            }
          } catch (e) {
            errorMessage = `Failed to fetch order: ${response.statusText}`;
          }
          
          throw new Error(errorMessage);
        }

        let data;
        try {
          const responseText = await response.text();
          console.log(`[Client] Received response length: ${responseText.length} characters`);
          try {
            data = JSON.parse(responseText);
            console.log(`[Client] Successfully parsed JSON response`);
          } catch (parseError) {
            console.error(`[Client] Error parsing JSON response:`, parseError);
            console.error(`[Client] Response text (first 200 chars): ${responseText.substring(0, 200)}...`);
            throw new Error("Invalid JSON response from server");
          }
        } catch (textError) {
          console.error(`[Client] Error reading response text:`, textError);
          throw new Error("Could not read server response");
        }

        // Reset retry counter on success
        setApiRetries(0);

        if (!data || typeof data !== 'object') {
          console.error(`[Client] Invalid data structure:`, data);
          throw new Error("Invalid data received from server");
        }

        // Verify order structure - handle both possible response formats
        let orderData;
        if (data.order) {
          // Format: { order: {...} }
          orderData = data.order;
        } else if (data.id) {
          // Format: { id: ..., status: ..., etc. } - direct order object
          orderData = data;
        } else {
          console.error(`[Client] Invalid order data structure:`, data);
          throw new Error("Invalid order data received");
        }
        
        console.log(`[Client] Processing order data with ID: ${orderData.id}`);
        
        // Calculate the correct total based on the cart formula
        const orderSubtotal = orderData.subtotal || 
          orderData.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
        
        const orderDeliveryFee = hasDeliveryFee(orderData) ? (orderData.deliveryFee || 50) : 0;
        const orderPointsUsed = orderData.pointsUsed || 0;
        const calculatedTotal = orderSubtotal + orderDeliveryFee - orderPointsUsed;
        
        // Ensure we always use the correct subtotal and calculated total
        orderData.subtotal = orderSubtotal;
        orderData.deliveryFee = orderDeliveryFee; // Make sure deliveryFee is set
        orderData.total = calculatedTotal;
        
        // Process the order items to ensure proper addon formatting
        if (orderData.items && Array.isArray(orderData.items)) {
          console.log(`[Client] Processing ${orderData.items.length} order items`);
          orderData.items = orderData.items.map((item: any) => {
            let processedAddons: any[] = [];

            try {
              // Try to extract addons from addonsJson if available
              if (item.addonsJson) {
                try {
                  // Handle possible string escaping
                  const jsonStr = typeof item.addonsJson === 'string' ? item.addonsJson.replace(/\\/g, '') : JSON.stringify(item.addonsJson);
                  const parsedAddons = JSON.parse(jsonStr);
                  if (Array.isArray(parsedAddons)) {
                    processedAddons = parsedAddons;
                  }
                } catch (error) {
                  console.error(`[Client] Error parsing addonsJson:`, error);
                }
              }

              // Try to use processedAddons if already available from the server
              if (processedAddons.length === 0 && item.processedAddons && Array.isArray(item.processedAddons)) {
                processedAddons = item.processedAddons;
              }

              // Fallback to addons field if no addons found yet
              if (processedAddons.length === 0 && item.addons) {
                if (typeof item.addons === 'string') {
                  // Try to parse as JSON
                  try {
                    const parsedAddons = JSON.parse(item.addons);
                    processedAddons = Array.isArray(parsedAddons) ? parsedAddons : [];
                  } catch (e) {
                    // If not JSON, it might be a comma-separated list
                    processedAddons = item.addons.split(',').map(addon => addon.trim());
                  }
                } else if (Array.isArray(item.addons)) {
                  processedAddons = item.addons;
                }
              }
            } catch (error) {
              console.error(`[Client] Error processing addons for item:`, error);
            }

            // Add processed addons to the item
            return {
              ...item,
              processedAddons
            };
          });
        } else {
          console.error(`[Client] Order items missing or not an array:`, orderData);
          orderData.items = [];
        }

        // Ensure statusHistory is always available and is an array
        if (!orderData.statusHistory || !Array.isArray(orderData.statusHistory)) {
          console.log(`[Client] No statusHistory found, using empty array`);
          orderData.statusHistory = [];
        }
        
        // Clean up the payment method if needed
        if (orderData.paymentMethod) {
          // Handle any case variations and ensure proper format
          orderData.paymentMethod = orderData.paymentMethod.trim().toUpperCase();
        }

        console.log(`[Client] Order processed successfully with status: ${orderData.status}`);

        // Set the order state
        setOrder(orderData);

        // Sort status history by creation date
        if (orderData.statusHistory && Array.isArray(orderData.statusHistory)) {
          setStatusHistory(orderData.statusHistory.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          ));
        } else {
          setStatusHistory([]);
        }

        setIsLoading(false);
      } catch (fetchError) {
        // Clear the timeout to prevent it from firing
        clearTimeout(timeoutId);
        
        // Re-throw the error to be caught by the outer try-catch
        throw fetchError;
      }
    } catch (error) {
      console.error(`[Client] Error in fetchOrderDetails:`, error);
      
      // Handle timeout error
      if (error.name === 'AbortError') {
        setError("Request timed out. The server is taking too long to respond.");
      } else {
        setError(error instanceof Error ? error.message : "Failed to fetch order details");
      }
      
      // Implement retry mechanism for API request
      if (apiRetries < 2) {  // Try up to 2 more times (3 total attempts)
        console.log(`[Client] API request failed, attempting retry ${apiRetries + 1}/2`);
        setApiRetries(prev => prev + 1);
        
        // Wait a bit longer each retry
        const retryDelay = (apiRetries + 1) * 2000;
        setTimeout(() => {
          console.log(`[Client] Retrying API request after ${retryDelay}ms delay`);
          fetchOrderDetails();
        }, retryDelay);
      } else {
        console.log(`[Client] Max API retries reached`);
        setIsLoading(false);
      }
    }
  };

  // Add a wrapper function for getAddonsSummary to keep its API
  const getAddonsSummary = (item: OrderItem): string => {
    const addons = parseAddons(item);
    return addons.map(addon => addon.name || "Add-on").join(", ");
  };

  // Get the appropriate status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
      case "RECEIVED":
        return "bg-blue-100 text-blue-800";
      case "PREPARING":
        return "bg-yellow-100 text-yellow-800";
      case "OUT_FOR_DELIVERY":
        return "bg-purple-100 text-purple-800";
      case "READY_FOR_PICKUP":
        return "bg-green-100 text-green-800";
      case "COMPLETED":
        return "bg-teal-100 text-teal-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Check if payment method is cash on delivery with more flexible matching
  const isCashOnDelivery = (method) => {
    if (!method) return false;
    const methodStr = method.toString().toUpperCase();
    return methodStr === "CASH_ON_DELIVERY" || 
           methodStr.includes("CASH") || 
           methodStr.includes("COD") ||
           methodStr.includes("DELIVERY");
  };

  // Check if payment method is in-store with more flexible matching
  const isInStore = (method) => {
    if (!method) return false;
    const methodStr = method.toString().toUpperCase();
    return methodStr === "IN_STORE" || 
           methodStr.includes("STORE") || 
           methodStr.includes("IN-STORE") ||
           methodStr.includes("INSTORE");
  };

  // Check if payment method is GCash
  const isGCash = (method) => {
    if (!method) return false;
    const methodStr = method.toString().toUpperCase();
    return methodStr === "GCASH";
  };

  // Get payment status display information
  const getPaymentStatusInfo = (status) => {
    if (!status) return {
      color: "bg-amber-100 text-amber-800",
      label: "Payment Pending Verification",
      icon: <AlertTriangle className="h-4 w-4" />,
    };
    
    status = status.toUpperCase();
    
    if (status === "VERIFIED") {
      return {
        color: "bg-green-100 text-green-800",
        label: "Payment Verified",
        icon: <CheckCircle2 className="h-4 w-4" />,
      };
    } else if (status === "REJECTED") {
      return {
        color: "bg-red-100 text-red-800",
        label: "Payment Rejected",
        icon: <XCircle className="h-4 w-4" />,
      };
    } else {
      return {
        color: "bg-amber-100 text-amber-800",
        label: "Payment Pending Verification",
        icon: <AlertTriangle className="h-4 w-4" />,
      };
    }
  };

  // Function to determine completion time based on order data
  const getCompletionTime = (order) => {
    if (order?.status !== "COMPLETED") return null;
    
    // Use completedAt if available, otherwise fallback to updatedAt
    return order.completedAt || order.updatedAt;
  };

  // Function to determine cancellation time based on order data
  const getCancellationTime = (order) => {
    if (order?.status !== "CANCELLED") return null;
    
    // Use cancelledAt if available, otherwise fallback to updatedAt
    return order.cancelledAt || order.updatedAt;
  };

  // Format status text for display
  const formatStatus = (status: string) => {
    return status
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Get timestamps if available
  const completionTime = getCompletionTime(order);
  const cancellationTime = getCancellationTime(order);

  // API action handlers
  const handleOrderReceived = async (orderId: string) => {
    try {
      setIsUpdating(true);
      toast.loading("Updating order status...");
      
      const response = await fetch(`/api/orders/confirm`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
        }),
        cache: "no-store",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to confirm order");
      }

      toast.success("Order confirmed successfully!");
      await new Promise(resolve => setTimeout(resolve, 600));
      window.location.reload();
    } catch (error) {
      console.error("Error confirming order:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update order");
      setIsUpdating(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    setOrderToCancel(orderId);
    setShowCancelConfirm(true);
  };

  const confirmCancelOrder = async () => {
    if (!orderToCancel) return;
    
    try {
      setIsUpdating(true);
      toast.loading("Cancelling your order...");
      
      const response = await fetch(`/api/orders/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: orderToCancel,
        }),
        cache: "no-store",
      });

      let data;
      const text = await response.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        console.error("Failed to parse response:", text);
        data = {};
      }

      if (!response.ok) {
        console.error("Error response:", { status: response.status, data });
        throw new Error(data.error || "Failed to cancel order");
      }

      toast.success(data.message || "Order cancelled successfully");
      await new Promise(resolve => setTimeout(resolve, 600));
      window.location.reload();
      
      setShowCancelConfirm(false);
      setOrderToCancel(null);
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error(error instanceof Error ? error.message : "Failed to cancel order");
      setIsUpdating(false);
      setShowCancelConfirm(false);
      setOrderToCancel(null);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (status === "unauthenticated" || error?.includes("logged in")) {
    return (
      <MainLayout>
        <div className="container py-8">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Authentication Required</h1>
            <p className="text-muted-foreground">Please login to view your order details.</p>
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !order) {
    return (
      <MainLayout>
        <div className="container py-8">
          <div className="text-center">
            <h1 className="text-xl font-bold mb-4">Error Loading Order</h1>
            <p className="text-muted-foreground mb-4">{error || "Order not found"}</p>
            <Button onClick={() => fetchOrderDetails()} variant="default">
              Try Again
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Update the getTimelineActiveColor function to match admin colors
  const getTimelineActiveColor = (status: string) => {
    switch (status) {
      case "RECEIVED":
        return "bg-blue-500 text-white";
      case "PREPARING":
        return "bg-yellow-500 text-white";
      case "OUT_FOR_DELIVERY":
        return "bg-purple-500 text-white";
      case "READY_FOR_PICKUP":
        return "bg-green-500 text-white";
      case "COMPLETED":
        return "bg-teal-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  // Update the getStatusIcon function to match admin implementation
  const getStatusIcon = (status: string, isActive: boolean) => {
    const color = isActive ? "text-white" : "text-gray-400";
    
    switch (status) {
      case "RECEIVED":
        return <Package className={`h-4 w-4 ${color}`} />;
      case "PREPARING":
        return <Coffee className={`h-4 w-4 ${color}`} />;
      case "OUT_FOR_DELIVERY":
        return <Truck className={`h-4 w-4 ${color}`} />;
      case "READY_FOR_PICKUP":
        return <ShoppingBag className={`h-4 w-4 ${color}`} />;
      case "COMPLETED":
        return <CheckCircle className={`h-4 w-4 ${color}`} />;
      default:
        return <Package className={`h-4 w-4 ${color}`} />;
    }
  };

  // Update StatusSteps component to match admin timeline exactly
  const StatusSteps = () => {
    const statusSteps = isCashOnDelivery(order.paymentMethod) || order.status === "OUT_FOR_DELIVERY" 
      ? ["RECEIVED", "PREPARING", "OUT_FOR_DELIVERY", "COMPLETED"] 
      : ["RECEIVED", "PREPARING", "READY_FOR_PICKUP", "COMPLETED"];
    
    const currentStepIndex = statusSteps.indexOf(order.status);
    const statusOptions = [
      { value: "RECEIVED", label: "Received" },
      { value: "PREPARING", label: "Preparing" },
      { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
      { value: "READY_FOR_PICKUP", label: "Ready for Pickup" },
      { value: "COMPLETED", label: "Completed" },
      { value: "CANCELLED", label: "Cancelled" },
    ];
    
    if (order.status === "CANCELLED") {
      return (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" /> 
              Order Status Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center mx-auto">
              <div className="rounded-full w-10 h-10 flex items-center justify-center mb-1 bg-red-100 text-red-500">
                <XCircle className="h-6 w-6" />
              </div>
              <span className="text-sm font-semibold text-red-500">Order Cancelled</span>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    // Calculate timeline progress
    const calculateTimelineProgress = (status: string, deliveryMethod: boolean): number => {
      // For delivery orders
      if (deliveryMethod) {
        switch (status) {
          case "RECEIVED":
            return 0;
          case "PREPARING":
            return 33;
          case "OUT_FOR_DELIVERY":
            return 66;
          case "COMPLETED":
            return 100;
          default:
            return 0;
        }
      }
      // For pickup orders
      else {
        switch (status) {
          case "RECEIVED":
            return 0;
          case "PREPARING":
            return 33;
          case "READY_FOR_PICKUP":
            return 66;
          case "COMPLETED":
            return 100;
          default:
            return 0;
        }
      }
    };
    
    return (
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" /> 
            Order Status Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center">
            <div className="flex items-center justify-between w-full relative">
              {/* Show appropriate timeline based on delivery method */}
              {statusSteps.map((statusValue, index) => {
                const statusOption = statusOptions.find(s => s.value === statusValue);
                if (!statusOption) return null;
                
                const statusIndex = statusOptions.findIndex(s => s.value === statusValue);
                const currentStatusIndex = statusOptions.findIndex(s => s.value === order.status);
                
                const isActive = statusIndex <= currentStatusIndex && order.status !== "CANCELLED";
                const isCurrent = statusValue === order.status;
                
                // Find timestamp for this status from history
                const statusRecord = statusHistory.find(h => h.status === statusValue);
                
                // For RECEIVED status, always show a timestamp (fallback to order creation date)
                let statusTime = null;
                if (statusValue === "RECEIVED") {
                  // Use the received status record if available, otherwise use order creation date
                  statusTime = statusRecord 
                    ? new Date(statusRecord.createdAt) 
                    : new Date(order.createdAt);
                } else if (statusValue === "COMPLETED" && order.status === "COMPLETED") {
                  // For COMPLETED status, use history record if available, otherwise fall back to completedAt field
                  statusTime = statusRecord 
                    ? new Date(statusRecord.createdAt) 
                    : (order.completedAt ? new Date(order.completedAt) : null);
                } else if (statusValue === "CANCELLED" && order.status === "CANCELLED") {
                  // For CANCELLED status, use history record if available, otherwise fall back to cancelledAt field
                  statusTime = statusRecord 
                    ? new Date(statusRecord.createdAt) 
                    : (order.cancelledAt ? new Date(order.cancelledAt) : null);
                } else if (statusRecord) {
                  statusTime = new Date(statusRecord.createdAt);
                }
                
                return (
                  <div key={statusValue} className="flex flex-col items-center relative z-10 min-h-[100px]">
                    <div 
                      className={`rounded-full w-8 h-8 flex items-center justify-center mb-1 
                      ${isCurrent ? 'ring-2 ring-offset-2 ring-primary' : ''} 
                      ${isActive ? getTimelineActiveColor(statusValue) : 'bg-gray-100 text-gray-400'}`}
                    >
                      {getStatusIcon(statusValue, isActive)}
                    </div>
                    <div className="h-[32px] flex items-center">
                      <span className={`text-xs font-semibold text-center w-[80px] ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {statusOption.label}
                      </span>
                    </div>
                    {/* Display timestamp for RECEIVED, COMPLETED or any active status with timestamps */}
                    <div className="min-h-[40px] flex flex-col justify-start">
                      {(statusValue === "RECEIVED" || 
                        (statusValue === "COMPLETED" && order.status === "COMPLETED") || 
                        (statusTime && isActive)) && (
                        <div className="text-[10px] text-muted-foreground mt-1 text-center">
                          {statusTime ? statusTime.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          }) : ""}
                          <br />
                          {statusTime ? statusTime.toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          }) : ""}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Timeline connector */}
              <div className="absolute top-4 left-0 h-[2px] bg-gray-100 w-full -z-0">
                <div 
                  className="h-full bg-primary transition-all" 
                  style={{ 
                    width: `${calculateTimelineProgress(order.status, isCashOnDelivery(order.paymentMethod) || order.status === "OUT_FOR_DELIVERY")}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto py-6 px-4">
        <div className="mb-8">
          <Button variant="ghost" asChild className="p-0 h-auto mb-3 hover:bg-transparent">
            <Link href="/orders" className="flex items-center text-sm text-muted-foreground">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to orders
            </Link>
          </Button>
          
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <Breadcrumb className="mb-2">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/">Home</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/orders">Orders</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbPage>Order Details</BreadcrumbPage>
                </BreadcrumbList>
              </Breadcrumb>
              <h1 className="text-2xl font-bold">Order #{order.number || order.id.slice(0, 8)}</h1>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {new Date(order.createdAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              </p>
              
              {/* Show completion timestamp if completed */}
              {completionTime && (
                <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Completed on {new Date(completionTime).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })} at {new Date(completionTime).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>
              )}
              
              {/* Show cancellation timestamp if cancelled */}
              {cancellationTime && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <XCircle className="h-4 w-4" />
                  Cancelled on {new Date(cancellationTime).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })} at {new Date(cancellationTime).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>
              )}
            </div>
            <Badge
              className={`text-sm px-3 py-1 ${getStatusColor(order.status)}`}
            >
              {formatStatus(order.status)}
            </Badge>
          </div>
        </div>

        {/* Order Progress */}
        <div className="mb-8">
          <StatusSteps />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Coffee className="h-5 w-5 text-primary mr-2" />
                  Order Items
                  <Badge variant="outline" className="ml-2 font-normal">
                    {order.items.length} {order.items.length === 1 ? "item" : "items"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <div className="divide-y">
                  {order.items.map((item) => (
                    <div key={item.id} className="p-4 sm:p-5 flex items-start gap-3 group hover:bg-muted/10 transition-colors">
                      <div className="h-16 w-16 rounded overflow-hidden flex-shrink-0 bg-muted/10 flex items-center justify-center border">
                        {item.product?.images?.[0] ? (
                          <Image
                            src={item.product.images[0]}
                            alt={item.product.name}
                            width={64}
                            height={64}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <Coffee className="h-6 w-6 text-muted" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1">
                          <h3 className="font-medium truncate pr-4">
                            {item.product?.name || "Unknown Product"}
                            {item.quantity > 1 && <span className="text-muted-foreground ml-1">×{item.quantity}</span>}
                          </h3>
                          <p className="font-medium text-right mt-1 sm:mt-0">{formatPricePHP(calculateItemTotal(item))}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge variant="outline" className="bg-muted/10 text-xs font-normal">
                            {item.size === "SIXTEEN_OZ" ? "16oz" : "22oz"}
                          </Badge>
                          <Badge variant="outline" className="bg-muted/10 text-xs font-normal">
                            {item.temperature.toLowerCase()}
                          </Badge>
                        </div>
                        {parseAddons(item).length > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Add-ons: {getAddonsSummary(item)}
                          </p>
                        )}
                        
                        {order.status === "COMPLETED" && !reviewStatusMap[item.productId || item.product?.id] && (
                          <div className="mt-3 pt-3 border-t border-dashed border-muted">
                            <ReviewProductButton
                              productId={item.productId || item.product?.id}
                              orderId={order.id}
                              productName={item.product?.name || "Product"}
                              reviewed={reviewStatusMap[item.productId || item.product?.id] || false}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Delivery & Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 text-primary mr-2" />
                  Delivery & Customer Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-muted/50 p-3 rounded-lg shadow-sm">
                      <p className="text-sm text-muted-foreground mb-1 flex items-center">
                        <User className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        Customer
                      </p>
                      <p className="font-medium">{order.customer?.name || session?.user?.name || "Guest"}</p>
                    </div>
                    {order.contactNumber && (
                      <div className="bg-muted/50 p-3 rounded-lg shadow-sm">
                        <p className="text-sm text-muted-foreground mb-1 flex items-center">
                          <Phone className="h-4 w-4 mr-1.5 text-muted-foreground" />
                          Contact
                        </p>
                        <p className="font-medium">{order.contactNumber}</p>
                      </div>
                    )}
                  </div>
                  
                  {order.deliveryMethod === "DELIVERY" && (
                    <div className="bg-muted/50 p-3 rounded-lg shadow-sm">
                      <p className="text-sm text-muted-foreground mb-1 flex items-center">
                        <MapPin className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        Delivery Address
                      </p>
                      {order.addressLine1 || order.deliveryAddress ? (
                        <p className="font-medium">
                          {order.addressLine1 || order.deliveryAddress}
                          {order.addressLine2 && `, ${order.addressLine2}`}
                        </p>
                      ) : (
                        <p className="text-amber-600 font-medium">
                          Address required for delivery but not provided.
                        </p>
                      )}
                      {order.addressNotes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          Note: {order.addressNotes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Delivery Method */}
                  <div className="bg-muted/50 p-3 rounded-lg shadow-sm">
                    <p className="text-sm text-muted-foreground mb-1 flex items-center">
                      {order.deliveryMethod === "DELIVERY" ? (
                        <Truck className="h-4 w-4 mr-1.5 text-muted-foreground" />
                      ) : (
                        <ShoppingBag className="h-4 w-4 mr-1.5 text-muted-foreground" />
                      )}
                      Delivery Method
                    </p>
                    <p className="font-medium">
                      {order.deliveryMethod === "DELIVERY" ? "Delivery" : "Pickup"}
                    </p>
                  </div>

                  {/* Payment Method */}
                  <div className="bg-muted/50 p-3 rounded-lg shadow-sm">
                    <p className="text-sm text-muted-foreground mb-1 flex items-center">
                      {isCashOnDelivery(order.paymentMethod) ? (
                        <Banknote className="h-4 w-4 mr-1.5 text-muted-foreground" />
                      ) : isGCash(order.paymentMethod) ? (
                        <CreditCard className="h-4 w-4 mr-1.5 text-muted-foreground" />
                      ) : (
                        <Store className="h-4 w-4 mr-1.5 text-muted-foreground" />
                      )}
                      Payment Method
                    </p>
                    <div className="flex flex-col gap-1">
                      <p className="font-medium">
                        {isGCash(order.paymentMethod) ? "GCash" : 
                         isCashOnDelivery(order.paymentMethod) ? "Cash on Delivery" : 
                         "In-store Payment"}
                      </p>
                      
                      {/* Show GCash payment status if applicable */}
                      {isGCash(order.paymentMethod) && (
                        <div className="mt-1">
                          <Badge className={`text-xs ${getPaymentStatusInfo(order.paymentStatus).color}`}>
                            <span className="flex items-center gap-1">
                              {getPaymentStatusInfo(order.paymentStatus).icon}
                              {getPaymentStatusInfo(order.paymentStatus).label}
                            </span>
                          </Badge>
                          
                          {/* Payment rejection message removed */}
                          
                          {order.paymentProofUrl && (
                            <div className="mt-2 relative">
                              <p className="text-xs text-muted-foreground mb-1">Payment Proof:</p>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <div className="rounded-md border overflow-hidden bg-gray-50 relative cursor-pointer hover:opacity-95 transition-opacity">
                                    <div className="relative h-40 w-full">
                                      <Image 
                                        src={order.paymentProofUrl} 
                                        alt="Payment proof" 
                                        fill
                                        className="object-contain"
                                      />
                                      <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                        <span className="bg-primary/90 text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">Click to enlarge</span>
                                      </div>
                                    </div>
                                    <div className="p-1 bg-white text-center">
                                      <span className="text-xs text-blue-600">
                                        View Full Size
                                      </span>
                                    </div>
                                  </div>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-lg">
                                  <DialogHeader>
                                    <DialogTitle>Payment Proof</DialogTitle>
                                  </DialogHeader>
                                  <div className="relative w-full h-[500px] mx-auto">
                                    <Image 
                                      src={order.paymentProofUrl} 
                                      alt="Payment proof" 
                                      fill
                                      className="object-contain"
                                    />
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          )}
                          
                          {isGCash(order.paymentMethod) && (
                            <div className="mt-2 text-xs">
                              <p className="text-muted-foreground">GCash Number:</p>
                              <p className="font-medium">09060057323</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
              
              {/* Order Actions */}
              {(order.status === "RECEIVED" || order.status === "OUT_FOR_DELIVERY" || order.status === "READY_FOR_PICKUP") && (
                <CardFooter className="flex-col gap-3">
                  {order.status === "RECEIVED" && (
                    <Button 
                      onClick={() => handleCancelOrder(order.id)}
                      variant="outline"
                      className="w-full border-red-200 text-red-600 hover:bg-red-50"
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Cancel Order
                        </>
                      )}
                    </Button>
                  )}
                  
                  {(order.status === "OUT_FOR_DELIVERY" || order.status === "READY_FOR_PICKUP") && (
                    <Button
                      onClick={() => handleOrderReceived(order.id)}
                      disabled={isUpdating}
                      className="w-full"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          {order.status === "OUT_FOR_DELIVERY" ? "Confirm Order Received" : "Confirm Order Pickup"}
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              )}
            </Card>
          </div>
          
          {/* Order Summary */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ClipboardList className="h-5 w-5 text-primary mr-2" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Condensed product list */}
                <div className="space-y-2 mb-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm py-1.5 border-b border-dashed border-muted last:border-0">
                      <div className="flex-1 pr-2">
                        <div className="flex items-start justify-between">
                          <p className="font-medium">
                            {item.product?.name || "Unknown Product"}
                            {item.quantity > 1 && <span className="text-muted-foreground ml-1">×{item.quantity}</span>}
                          </p>
                          <p className="font-medium whitespace-nowrap">{formatPricePHP(calculateItemTotal(item))}</p>
                        </div>
                                                  <div className="flex flex-wrap gap-1 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {item.size === "SIXTEEN_OZ" ? "16oz" : "22oz"}, {item.temperature === "HOT" ? "hot" : "iced"}
                          </span>
                        </div>
                        {parseAddons(item).length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic">
                            + {getAddonsSummary(item)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Separator */}
                <div className="h-px bg-border my-2"></div>

                {/* Totals */}
                <div className="flex justify-between text-sm">
                  <p className="text-muted-foreground">Subtotal</p>
                  <p>{formatPricePHP(order.subtotal || 0)}</p>
                </div>
                
                {hasDeliveryFee(order) && (
                  <div className="flex justify-between text-sm">
                    <p className="text-muted-foreground">Delivery Fee</p>
                    <p>{formatPricePHP(order.deliveryFee || 50)}</p>
                  </div>
                )}
                
                {order.pointsUsed > 0 && (
                  <div className="flex justify-between text-sm">
                    <p className="text-muted-foreground">Points Discount</p>
                    <p className="text-green-600">-{formatPricePHP(order.pointsUsed)}</p>
                  </div>
                )}
                
                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <p className="font-medium">Total</p>
                    <p className="font-bold text-lg text-primary">{formatPricePHP(order.total)}</p>
                  </div>
                </div>
                
                {order.status === "COMPLETED" && order.pointsEarned > 0 && (
                  <div className="bg-primary/5 p-3 rounded-lg flex justify-between items-center border border-primary/10 shadow-sm mt-2">
                    <p className="font-medium text-sm flex items-center">
                      <Icons.star className="h-4 w-4 mr-1.5 text-amber-500 fill-amber-400" />
                      Points Earned
                    </p>
                    <p className="font-medium text-primary">+{order.pointsEarned} pts</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Cancel confirmation dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this order? This action cannot be undone.
            </AlertDialogDescription>
            
            <div className="mt-4 space-y-2 text-sm border rounded-lg p-4 bg-muted/10">
              <p className="font-medium text-foreground flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1.5 text-amber-500" />
                When you cancel this order:
              </p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1.5">
                <li>Your order will be marked as cancelled</li>
                {order.pointsUsed > 0 && (
                  <li>Any loyalty points you used for this order will be refunded</li>
                )}
                <li>You'll receive a notification confirming cancellation</li>
              </ul>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Keep Order</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCancelOrder}
              className="bg-destructive text-destructive-foreground"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Cancel Order
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
} 