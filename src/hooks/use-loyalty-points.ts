"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

export interface PointsHistoryItem {
  id: string;
  action: "EARNED" | "REDEEMED" | "EXPIRED" | "REFUNDED";
  points: number;
  orderId?: string;
  createdAt: string;
}

export interface LoyaltyPointsData {
  points: number;
  history: PointsHistoryItem[];
  isLoading: boolean;
  error: string | null;
}

export function useLoyaltyPoints() {
  const { data: session } = useSession();
  const [data, setData] = useState<LoyaltyPointsData>({
    points: 0,
    history: [],
    isLoading: false,
    error: null,
  });

  const fetchPoints = async () => {
    if (!session?.user?.id) return;

    setData(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await fetch('/api/loyalty-points');
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch loyalty points");
      }
      
      const result = await response.json();
      
      setData({
        points: result.points,
        history: result.history || [],
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("Error fetching loyalty points:", error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to fetch loyalty points",
      }));
    }
  };

  const redeemPoints = async (pointsToRedeem: number) => {
    if (!session?.user?.id) {
      toast.error("You must be logged in to redeem points");
      return false;
    }

    if (pointsToRedeem <= 0) {
      toast.error("Please enter a valid number of points to redeem");
      return false;
    }

    if (pointsToRedeem > data.points) {
      toast.error(`You only have ${data.points} points available to redeem`);
      return false;
    }

    try {
      const response = await fetch('/api/loyalty-points/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ points: pointsToRedeem }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to redeem points");
      }

      // Refetch points after successful redemption
      await fetchPoints();
      toast.success(`Successfully redeemed ${pointsToRedeem} points`);
      return true;
    } catch (error) {
      console.error("Error redeeming points:", error);
      toast.error(error instanceof Error ? error.message : "Failed to redeem points");
      return false;
    }
  };

  // Fetch points data when the session is available
  useEffect(() => {
    if (session?.user?.id) {
      fetchPoints();
    }
  }, [session?.user?.id]);

  return {
    ...data,
    fetchPoints,
    redeemPoints,
  };
} 