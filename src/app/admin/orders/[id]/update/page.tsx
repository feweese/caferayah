"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { formatPricePHP } from "@/lib/price-utils";

export default function UpdateOrderStatusPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingOrder, setFetchingOrder] = useState(true);
  const [status, setStatus] = useState<string>("");
  const [currentStatus, setCurrentStatus] = useState<string>("");
  const [deliveryMethod, setDeliveryMethod] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");
  const [isTerminalState, setIsTerminalState] = useState(false);
  const [isParamsReady, setIsParamsReady] = useState(false);
  const [validNextStatuses, setValidNextStatuses] = useState<string[]>([]);
  
  useEffect(() => {
    const getParams = async () => {
      try {
        if (!params) return;
        
        // Handle if params is a Promise
        const resolvedParams = ('then' in params) ? await params : params;
        
        if (resolvedParams && resolvedParams.id) {
          setOrderId(resolvedParams.id);
          setIsParamsReady(true);
        }
      } catch (error) {
        console.error("Error resolving params:", error);
      }
    };
    
    getParams();
  }, [params]);
  
  // Fetch the order to check its current status
  useEffect(() => {
    if (!orderId) return;
    
    const fetchOrder = async () => {
      setFetchingOrder(true);
      try {
        const response = await fetch(`/api/admin/orders/${orderId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch order");
        }
        
        const order = await response.json();
        setCurrentStatus(order.status);
        setDeliveryMethod(order.deliveryMethod);
        
        // Use the valid next statuses from the API response
        if (order._validNextStatuses && Array.isArray(order._validNextStatuses)) {
          setValidNextStatuses(order._validNextStatuses);
        }
        
        // Check if order is in a terminal state
        if (order.status === "COMPLETED" || order.status === "CANCELLED") {
          setIsTerminalState(true);
        }
        
      } catch (error) {
        console.error("Error fetching order:", error);
        toast.error("Could not fetch order information");
      } finally {
        setFetchingOrder(false);
      }
    };
    
    fetchOrder();
  }, [orderId]);

  // All possible status options with descriptions
  const allStatusOptions = [
    { 
      value: "RECEIVED", 
      label: "Received", 
      description: "Order has been received but not yet started",
      availableFor: ["DELIVERY", "PICKUP"] // Available for all delivery methods
    },
    { 
      value: "PREPARING", 
      label: "Preparing", 
      description: "Order is being prepared in the kitchen",
      availableFor: ["DELIVERY", "PICKUP"] // Available for all delivery methods
    },
    { 
      value: "OUT_FOR_DELIVERY", 
      label: "Out for Delivery", 
      description: "Order has been dispatched for delivery",
      availableFor: ["DELIVERY"] // Only available for delivery orders
    },
    { 
      value: "READY_FOR_PICKUP", 
      label: "Ready for Pickup", 
      description: "Order is ready for customer pickup",
      availableFor: ["PICKUP"] // Only available for pickup orders
    },
    { 
      value: "COMPLETED", 
      label: "Completed", 
      description: "Order has been picked up/delivered and completed",
      availableFor: ["DELIVERY", "PICKUP"] // Available for all delivery methods
    },
    { 
      value: "CANCELLED", 
      label: "Cancelled", 
      description: "Order has been cancelled",
      availableFor: ["DELIVERY", "PICKUP"] // Available for all delivery methods
    },
  ];

  // Filter status options based on valid next statuses and delivery method
  const filteredStatusOptions = allStatusOptions.filter(option => 
    validNextStatuses.includes(option.value) && option.availableFor.includes(deliveryMethod)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!status || !orderId) {
      toast.error("Please select a status");
      return;
    }
    
    // Double-check to prevent terminal state updates
    if (isTerminalState) {
      toast.error("Cannot update orders that are already completed or cancelled");
      return;
    }
    
    // Validate that the status is in the list of valid next statuses
    if (!validNextStatuses.includes(status)) {
      toast.error(`Invalid status transition from "${currentStatus}" to "${status}"`);
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        
        // Special handling for GCash payment verification requirement
        if (error.requiresVerification) {
          toast.error(
            <div className="space-y-2">
              <p>{error.message}</p>
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => router.push(`/admin/orders/${orderId}`)}
                >
                  Go to Payment Verification
                </Button>
              </div>
            </div>,
            {
              duration: 5000,
            }
          );
        } else {
          throw new Error(error.message || "Failed to update order status");
        }
      } else {
        toast.success("Order status updated successfully");
        router.push(`/admin/orders/${orderId}`);
        router.refresh();
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update order status");
    } finally {
      setLoading(false);
    }
  };

  if (!isParamsReady || !orderId || fetchingOrder) {
    return (
      <AdminLayout>
        <div className="container px-0">
          <div className="flex justify-center items-center h-64">
            <p>Loading...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container px-0">
        <div className="mb-8">
          <Link
            href={`/admin/orders/${orderId}`}
            className="text-sm text-muted-foreground hover:text-primary hover:underline"
          >
            &larr; Back to Order Details
          </Link>
          <h1 className="text-3xl font-bold mt-2">Update Order Status</h1>
          <p className="text-muted-foreground">
            Change the status of order #{orderId.substring(0, 8)}
          </p>
        </div>

        {isTerminalState ? (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Cannot Update</AlertTitle>
            <AlertDescription>
              This order is already {currentStatus.toLowerCase()} and cannot be updated further.
            </AlertDescription>
          </Alert>
        ) : (
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Update Status</CardTitle>
              <CardDescription>
                Current status: <span className="font-medium">{currentStatus}</span>
              </CardDescription>
              {validNextStatuses.length === 0 && !fetchingOrder && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No Valid Transitions</AlertTitle>
                  <AlertDescription>
                    There are no valid status transitions available from the current status.
                  </AlertDescription>
                </Alert>
              )}
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent>
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <label htmlFor="status">New Status</label>
                    <Select
                      value={status}
                      onValueChange={setStatus}
                      disabled={isTerminalState || validNextStatuses.length === 0}
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select new status" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredStatusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div>
                              <span>{option.label}</span>
                              <span className="block text-xs text-muted-foreground mt-1">
                                {option.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>
                      <strong>Note:</strong> Order status can only be updated in sequence.
                      {currentStatus === "RECEIVED" && ` The order must be marked as "Preparing" before it can be marked as delivered or completed.`}
                      {currentStatus === "PREPARING" && ` The order must be marked as "${deliveryMethod === "PICKUP" ? "Ready for Pickup" : "Out for Delivery"}" before it can be completed.`}
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Link href={`/admin/orders/${orderId}`}>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    !status ||
                    isTerminalState ||
                    validNextStatuses.length === 0
                  }
                >
                  {loading ? "Updating..." : "Update Status"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
} 