"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ConfirmOrderButtonProps {
  orderId: string;
}

export default function ConfirmOrderButton({ orderId }: ConfirmOrderButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleConfirmOrder = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/orders/confirm`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to confirm order");
      }

      toast.success("Order confirmed successfully!");
      router.refresh();
    } catch (error) {
      console.error("Error confirming order:", error);
      toast.error(error instanceof Error ? error.message : "Failed to confirm order");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleConfirmOrder}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Icons.spinner className="h-4 w-4 mr-2 animate-spin" />
          Confirming...
        </>
      ) : (
        <>
          <Icons.check className="h-4 w-4 mr-2" />
          Confirm Order
        </>
      )}
    </Button>
  );
} 