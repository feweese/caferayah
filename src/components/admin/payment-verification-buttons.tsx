"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PaymentVerificationButtonsProps {
  orderId: string;
  orderStatus?: string;
}

export function PaymentVerificationButtons({ orderId, orderStatus = "RECEIVED" }: PaymentVerificationButtonsProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const updatePaymentStatus = async (status: 'VERIFIED' | 'REJECTED') => {
    const isVerification = status === 'VERIFIED';
    if (isVerification) {
      setIsVerifying(true);
    } else {
      setIsRejecting(true);
    }

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/payment-status-update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update payment status");
      }

      const result = await response.json();
      
      if (isVerification) {
        if (orderStatus === "RECEIVED") {
          toast.success("Payment verified and order status updated", {
            description: "Order status has been automatically changed to 'Preparing'"
          });
        } else {
          toast.success("Payment verified successfully!");
        }
      } else {
        toast.success("Payment rejected and order cancelled", {
          description: "The customer has been notified and any used loyalty points have been refunded."
        });
      }
      
      // Wait a brief moment then refresh the page to show the updated status
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error(`Error ${isVerification ? 'verifying' : 'rejecting'} payment:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to ${isVerification ? 'verify' : 'reject'} payment.`);
    } finally {
      if (isVerification) {
        setIsVerifying(false);
      } else {
        setIsRejecting(false);
      }
    }
  };

  return (
    <div className="mt-6 space-y-3">
      <Button 
        variant="default"
        size="lg"
        className="w-full font-medium transition-all shadow-md hover:shadow-lg"
        onClick={() => updatePaymentStatus('VERIFIED')}
        disabled={isVerifying || isRejecting}
      >
        {isVerifying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying...
          </>
        ) : (
          <>
            <Check className="h-5 w-5" />
            Verify Payment
          </>
        )}
      </Button>
      
      <Button 
        variant="destructive"
        size="lg"
        className="w-full font-medium transition-all shadow-md hover:shadow-lg"
        onClick={() => updatePaymentStatus('REJECTED')}
        disabled={isVerifying || isRejecting}
      >
        {isRejecting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Rejecting...
          </>
        ) : (
          <>
            <X className="h-5 w-5" />
            Reject & Cancel Order
          </>
        )}
      </Button>
    </div>
  );
} 