import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import Image from "next/image";
import { format, formatDistanceToNow } from "date-fns";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminLayout } from "@/components/layout/admin-layout";
import { OrderDetailsLiveUpdater } from "@/components/admin/order-details-live-updater";
import { PaymentVerificationButtons } from "@/components/admin/payment-verification-buttons";
import { PaymentProofDialog } from "@/components/admin/payment-proof-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PaymentMethod, PaymentStatus } from "@/types/types";
import { OrderStatus } from "@/generated/prisma";
import {
  CalendarIcon,
  Clock,
  CreditCard,
  FileText,
  MapPin,
  Package,
  Phone,
  ShoppingBag,
  Truck,
  User,
  CheckCircle2,
  XCircle,
  Coffee,
  ArrowLeft,
  Check,
  X,
  AlertCircle,
  ImageIcon,
  Banknote,
  Store,
} from "lucide-react";
import { 
  calculateItemTotal, 
  calculateSubtotal, 
  calculateTotal, 
  formatPricePHP 
} from "@/lib/price-utils";

// Add this to the order type definition
type Order = {
  // Existing fields...
  statusHistory?: {
    status: string;
    createdAt: string;
  }[];
  paymentMethod: string;
  paymentStatus?: string;
  paymentProofUrl?: string | null;
  // Other existing fields...
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Remove the unnecessary awaiting of params
  const orderId = params.id;
  
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  const order = await db.order.findUnique({
    where: {
      id: orderId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          address: true,
        },
      },
      items: {
        include: {
          product: true,
          addons: true
        },
      },
      statusHistory: {
        select: {
          status: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  // Debug order data to see all available fields
  console.log("Order fields:", Object.keys(order));
  console.log("Order contact data:", {
    deliveryMethod: order.deliveryMethod,
    paymentMethod: order.paymentMethod,
    contactNumber: order.contactNumber,
    userPhoneNumber: order.user?.phoneNumber,
  });

  // Debug raw order data to see what's coming from the database
  console.log("Raw order data temperature values:", 
    order.items.map(item => ({
      id: item.id,
      temperature: item.temperature,
      temperatureType: typeof item.temperature,
      temperatureValue: String(item.temperature),
      temperatureInspect: JSON.stringify(item.temperature)
    }))
  );

  // Parse product data for easier access
  const processedItems = order.items.map(item => {
    // Detailed temperature handling with multiple fallbacks
    let tempValue = "ICED"; // Default fallback
    
    if (item.temperature !== null && item.temperature !== undefined) {
      // Handle all possible temperature value formats
      if (typeof item.temperature === 'string') {
        tempValue = item.temperature;
      } 
      else if (typeof item.temperature === 'object') {
        tempValue = String(item.temperature);
      }
      else {
        tempValue = String(item.temperature);
      }
    }
    
    // Normalize to uppercase for consistent comparison
    tempValue = tempValue.toUpperCase();
    
    // Ensure addons are properly handled
    let processedAddons = [];
    try {
      if (item.addons) {
        if (typeof item.addons === 'string') {
          processedAddons = JSON.parse(item.addons);
        } else if (Array.isArray(item.addons)) {
          processedAddons = item.addons;
        }
      }
    } catch (e) {
      console.error("Error processing addons:", e);
    }
    
    return {
      ...item,
      temperature: tempValue,
      processedAddons
    };
  });
  
  // Debug the processed data
  console.log("Processed items:", JSON.stringify(processedItems.map(item => ({
    id: item.id,
    temperature: item.temperature,
    processedAddons: item.processedAddons
  })), null, 2));

  // Map status enum values to display names
  const statusOptions = [
    { value: "RECEIVED", label: "Received" },
    { value: "PREPARING", label: "Preparing" },
    { value: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
    { value: "READY_FOR_PICKUP", label: "Ready for Pickup" },
    { value: "COMPLETED", label: "Completed" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  // Calculate totals
  const orderWithProcessedItems = {
    ...order,
    items: processedItems
  };
  const subtotal = calculateSubtotal(orderWithProcessedItems);
  
  // Calculate the total manually to ensure it's correct (164 + 50 - 2 = 212)
  const deliveryFee = order.deliveryFee || 0;
  const pointsDiscount = order.pointsUsed || 0;
  const finalTotal = subtotal + deliveryFee - pointsDiscount;
  
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  
  // Get current status index for timeline
  const currentStatusIndex = statusOptions.findIndex(s => s.value === order.status);

  // Determine if we have a completion timestamp
  const completedAt = order.status === "COMPLETED" ? 
    // Check if order has a completedAt field, otherwise fallback to updatedAt
    order.completedAt || order.updatedAt 
    : null;
  
  // Determine if we have a cancellation timestamp
  const cancelledAt = order.status === "CANCELLED" ?
    // Check if order has a cancelledAt field, otherwise fallback to updatedAt
    order.cancelledAt || order.updatedAt
    : null;
    
  // Check if the order has GCash payment
  const isGCashPayment = order.paymentMethod === "GCASH";
  
  // Get payment status information
  const paymentStatus = order.paymentStatus || "PENDING";
  const paymentStatusDisplayInfo = {
    PENDING: {
      color: "bg-amber-100 text-amber-800 hover:bg-amber-100",
      label: "Payment Pending Verification",
      icon: <AlertCircle className="h-4 w-4" />,
    },
    VERIFIED: {
      color: "bg-green-100 text-green-800 hover:bg-green-100",
      label: "Payment Verified",
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    REJECTED: {
      color: "bg-red-100 text-red-800 hover:bg-red-100",
      label: "Payment Rejected",
      icon: <XCircle className="h-4 w-4" />,
    },
  }[paymentStatus];

  return (
    <AdminLayout>
      <div className="container px-0">
        <div className="mb-6">
          <Link href="/admin/orders" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
            <ArrowLeft className="h-4 w-4" /> Back to Orders
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">Order #{order.id.substring(0, 8)}</h1>
                <Badge className={`text-sm px-3 py-1 ${getStatusColor(order.status)}`}>
                  {statusOptions.find(s => s.value === order.status)?.label}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground mt-1">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{format(new Date(order.createdAt), "MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{format(new Date(order.createdAt), "h:mm a")}</span>
                </div>
                <div className="text-xs">
                  ({formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })})
                </div>
              </div>
              {completedAt && (
                <div className="flex items-center gap-1 text-green-600 mt-1 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Completed on {format(new Date(completedAt), "MMM d, yyyy")} at {format(new Date(completedAt), "h:mm a")}</span>
                </div>
              )}
              {cancelledAt && (
                <div className="flex items-center gap-1 text-red-600 mt-1 text-sm">
                  <XCircle className="h-4 w-4" />
                  <span>Cancelled on {format(new Date(cancelledAt), "MMM d, yyyy")} at {format(new Date(cancelledAt), "h:mm a")}</span>
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
              {order.status !== "CANCELLED" && order.status !== "COMPLETED" && (
                <Link href={`/admin/orders/${order.id}/update`}>
                  <Button variant="default">
                    Update Order Status
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
        
        {/* GCash Payment Verification Section */}
        {isGCashPayment && (
          <Card className="mb-6 border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-blue-500" />
                    GCash Payment Verification
                  </div>
                </CardTitle>
                <Badge className={`${paymentStatusDisplayInfo.color}`}>
                  <span className="flex items-center gap-1">
                    {paymentStatusDisplayInfo.icon}
                    {paymentStatusDisplayInfo.label}
                  </span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="font-medium mb-2 text-sm text-muted-foreground">Payment Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-border pb-2">
                      <span className="text-sm">Status</span>
                      <span className="font-medium">{paymentStatusDisplayInfo.label}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-border pb-2">
                      <span className="text-sm">Amount</span>
                      <span className="font-medium">{formatPricePHP(order.total)}</span>
                    </div>
{/* GCash Number removed to avoid confusion */}
                  </div>
                  
                  {paymentStatus === "PENDING" && (
                    <PaymentVerificationButtons orderId={order.id} orderStatus={order.status} />
                  )}
                </div>
                
                <div>
                  <h3 className="font-medium mb-2 text-sm text-muted-foreground">Payment Proof</h3>
                  {order.paymentProofUrl ? (
                    <div className="rounded-md border overflow-hidden bg-gray-50 relative">
                      <PaymentProofDialog imageUrl={order.paymentProofUrl} />
                      <div className="p-2 bg-white text-center">
                        <span className="text-sm text-muted-foreground">
                          Click on the image to enlarge
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border p-12 flex flex-col items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-12 w-12 mb-2 opacity-20" />
                      <p>No payment proof uploaded</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Status Timeline */}
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
                {!["CANCELLED"].includes(order.status) ? (
                  <>
                    {/* Determine which status options to display based on delivery method */}
                    {order.deliveryMethod === "DELIVERY" ? (
                      // For delivery orders: Received, Preparing, Out for Delivery, Completed
                      <>
                        {["RECEIVED", "PREPARING", "OUT_FOR_DELIVERY", "COMPLETED"].map((statusValue, index) => {
                          const statusOption = statusOptions.find(s => s.value === statusValue);
                          if (!statusOption) return null;
                          
                          const statusIndex = statusOptions.findIndex(s => s.value === statusValue);
                          const currentStatusIndex = statusOptions.findIndex(s => s.value === order.status);
                          
                          const isActive = statusIndex <= currentStatusIndex && order.status !== "CANCELLED";
                          const isCurrent = statusValue === order.status;
                          
                          // Find timestamp for this status from history
                          const statusRecord = order.statusHistory?.find(h => h.status === statusValue);
                          
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
                              {/* Always show timestamp for RECEIVED status or active statuses with timestamps */}
                              <div className="min-h-[40px] flex flex-col justify-start">
                                {(statusValue === "RECEIVED" || 
                                  (statusValue === "COMPLETED" && order.status === "COMPLETED") || 
                                  (statusTime && isActive)) && (
                                  <div className="text-[10px] text-muted-foreground mt-1 text-center">
                                    {statusTime ? format(statusTime, "MMM d") : ""}
                                    <br />
                                    {statusTime ? format(statusTime, "h:mm a") : ""}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {/* Timeline connector for delivery */}
                        <div className="absolute top-4 left-0 h-[2px] bg-gray-100 w-full -z-0">
                          <div 
                            className="h-full bg-primary transition-all" 
                            style={{ 
                              width: `${calculateTimelineProgress(order.status, "DELIVERY")}%`
                            }}
                          />
                        </div>
                      </>
                    ) : (
                      // For pickup orders: Received, Preparing, Ready for Pickup, Completed
                      <>
                        {["RECEIVED", "PREPARING", "READY_FOR_PICKUP", "COMPLETED"].map((statusValue, index) => {
                          const statusOption = statusOptions.find(s => s.value === statusValue);
                          if (!statusOption) return null;
                          
                          const statusIndex = statusOptions.findIndex(s => s.value === statusValue);
                          const currentStatusIndex = statusOptions.findIndex(s => s.value === order.status);
                          
                          const isActive = statusIndex <= currentStatusIndex && order.status !== "CANCELLED";
                          const isCurrent = statusValue === order.status;
                          
                          // Find timestamp for this status from history
                          const statusRecord = order.statusHistory?.find(h => h.status === statusValue);
                          
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
                              {/* Always show timestamp for RECEIVED status or active statuses with timestamps */}
                              <div className="min-h-[40px] flex flex-col justify-start">
                                {(statusValue === "RECEIVED" || 
                                  (statusValue === "COMPLETED" && order.status === "COMPLETED") || 
                                  (statusTime && isActive)) && (
                                  <div className="text-[10px] text-muted-foreground mt-1 text-center">
                                    {statusTime ? format(statusTime, "MMM d") : ""}
                                    <br />
                                    {statusTime ? format(statusTime, "h:mm a") : ""}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {/* Timeline connector for pickup */}
                        <div className="absolute top-4 left-0 h-[2px] bg-gray-100 w-full -z-0">
                          <div 
                            className="h-full bg-primary transition-all" 
                            style={{ 
                              width: `${calculateTimelineProgress(order.status, "PICKUP")}%` 
                            }}
                          />
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center mx-auto">
                    <div className="rounded-full w-10 h-10 flex items-center justify-center mb-1 bg-red-100 text-red-500">
                      <XCircle className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-semibold text-red-500">Order Cancelled</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Order Summary */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Order Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Order ID</div>
                    <div className="font-medium flex items-center gap-1">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {order.id}
                    </div>
                  </div>
                  
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Payment Method</div>
                    <div className="font-medium flex items-center gap-1">
                      {order.paymentMethod === "GCASH" ? (
                        <>
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          GCash
                        </>
                      ) : order.paymentMethod === "CASH_ON_DELIVERY" ? (
                        <>
                          <Banknote className="h-4 w-4 text-muted-foreground" />
                          Cash on Delivery
                        </>
                      ) : (
                        <>
                          <Store className="h-4 w-4 text-muted-foreground" />
                          In Store
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Delivery Method</div>
                    <div className="font-medium flex items-center gap-1">
                      {order.deliveryMethod === "DELIVERY" ? (
                        <>
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          Delivery
                        </>
                      ) : (
                        <>
                          <Package className="h-4 w-4 text-muted-foreground" />
                          Pickup
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Items</div>
                    <div className="font-medium flex items-center gap-1">
                      <Coffee className="h-4 w-4 text-muted-foreground" />
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </div>
                  </div>
                </div>
                
                {order.deliveryMethod === "DELIVERY" && order.deliveryAddress && (
                  <div className="bg-muted/50 p-3 rounded-lg mt-4">
                    <div className="text-sm text-muted-foreground mb-1">Delivery Address</div>
                    <div className="font-medium flex items-start gap-1">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span>{order.deliveryAddress}</span>
                    </div>
                  </div>
                )}
                
                {order.deliveryMethod === "DELIVERY" && (
                  <div className="bg-muted/50 p-3 rounded-lg mt-4">
                    <div className="text-sm text-muted-foreground mb-1">Contact Number</div>
                    <div className="font-medium flex items-start gap-1">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span>
                        {order.contactNumber ? formatPhoneNumber(order.contactNumber) : 
                         (order.user?.phoneNumber ? formatPhoneNumber(order.user?.phoneNumber) : 
                         "Not provided")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Name</div>
                  <div className="font-medium flex items-center gap-1">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {order.user?.name || "Guest"}
                  </div>
                  {order.user?.email && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {order.user.email}
                    </div>
                  )}
                </div>
                
                {order.user?.phoneNumber && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Contact</div>
                    <div className="font-medium flex items-center gap-1">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {order.user.phoneNumber}
                    </div>
                  </div>
                )}
                
                {order.user?.address && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Address</div>
                    <div className="font-medium flex items-start gap-1">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span>{order.user.address}</span>
                    </div>
                  </div>
                )}
                
                {order.user?.id && (
                  <Link href={`/admin/users/${order.user.id}`} className="mt-3 block">
                    <Button variant="outline" size="sm" className="w-full">
                      View Customer Profile
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Order Items
              </CardTitle>
              <CardDescription>
                {itemCount} {itemCount === 1 ? 'item' : 'items'} in this order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[280px]">Product</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Temperature</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedItems.map((item) => {
                      // Helper to determine temperature display
                      const isHot = item.temperature && item.temperature.includes("HOT");
                      const tempDisplay = isHot ? "Hot" : "Iced";
                      
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {item.product?.images && item.product.images[0] ? (
                                <div className="relative h-12 w-12 overflow-hidden rounded bg-muted">
                                  <img
                                    src={item.product.images[0]}
                                    alt={item.product?.name || "Product"}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                                  <Coffee className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium">{item.product?.name || "Unknown Product"}</div>
                                {item.processedAddons.length > 0 && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    <Badge variant="outline" className="mr-1">Add-ons</Badge> 
                                    {item.processedAddons.map((a: any) => a.name).join(", ")}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {item.size === "SIXTEEN_OZ" ? "16oz" : "22oz"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <strong className={item.temperature?.includes("HOT") ? "text-red-600" : "text-blue-600"}>
                              {item.temperature?.includes("HOT") ? "Hot" : "Iced"}
                            </strong>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-primary/5">
                              {item.quantity}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">{formatPricePHP(item.price)}</TableCell>
                          <TableCell className="text-right font-medium font-mono">{formatPricePHP(calculateItemTotal(item))}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="border-t p-6">
              <div className="w-full md:w-1/3 space-y-2 ml-auto">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatPricePHP(subtotal)}</span>
                </div>
                {order.deliveryFee > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery Fee:</span>
                    <span className="font-mono">{formatPricePHP(order.deliveryFee)}</span>
                  </div>
                )}
                {order.pointsUsed > 0 && (
                  <div className="flex justify-between text-muted-foreground text-green-600">
                    <span>Points Discount:</span>
                    <span className="font-mono">-{formatPricePHP(order.pointsUsed)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg pt-2">
                  <span>Total:</span>
                  <span className="font-mono">{formatPricePHP(finalTotal)}</span>
                </div>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

function getStatusColor(status: string) {
  switch (status) {
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
}

function getTimelineActiveColor(status: string) {
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
}

function getStatusIcon(status: string, isActive: boolean) {
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
      return <CheckCircle2 className={`h-4 w-4 ${color}`} />;
    default:
      return <Package className={`h-4 w-4 ${color}`} />;
  }
}

// Helper function to format phone numbers consistently
function formatPhoneNumber(phoneNumber?: string | null): string | null {
  if (!phoneNumber) return null;
  
  // Remove any non-digit characters except for + at the beginning
  let formattedNumber = phoneNumber.trim();
  
  // If the number doesn't start with +63 or 0, add the 0 prefix
  if (!formattedNumber.startsWith('+63') && !formattedNumber.startsWith('0')) {
    formattedNumber = '0' + formattedNumber;
  }
  
  // If the number starts with +63, convert to local format with 0
  if (formattedNumber.startsWith('+63')) {
    formattedNumber = '0' + formattedNumber.substring(3);
  }
  
  return formattedNumber;
}

/**
 * Calculate the timeline progress percentage based on the current status and delivery method
 */
function calculateTimelineProgress(status: string, deliveryMethod: string): number {
  // For delivery orders
  if (deliveryMethod === "DELIVERY") {
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
} 