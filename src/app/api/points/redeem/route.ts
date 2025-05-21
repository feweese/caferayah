import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createLoyaltyPointsNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "You must be logged in to redeem points" },
        { status: 401 }
      );
    }

    const { pointsToRedeem } = await request.json();

    if (!pointsToRedeem || pointsToRedeem <= 0) {
      return NextResponse.json(
        { error: "Invalid points amount" },
        { status: 400 }
      );
    }

    // Get the user's current points
    const loyaltyPoints = await db.loyaltyPoints.findUnique({
      where: { userId: session.user.id },
    });

    if (!loyaltyPoints) {
      return NextResponse.json(
        { error: "No loyalty points found for this user" },
        { status: 404 }
      );
    }

    if (loyaltyPoints.points < pointsToRedeem) {
      return NextResponse.json(
        { error: "Not enough points to redeem" },
        { status: 400 }
      );
    }

    // Use a transaction to ensure all operations succeed or fail together
    const result = await db.$transaction(async (tx) => {
      // Update the user's loyalty points
      const updatedPoints = await tx.loyaltyPoints.update({
        where: { userId: session.user.id },
        data: {
          points: {
            decrement: pointsToRedeem,
          },
        },
      });

      // Record the points redemption in the history
      await tx.pointsHistory.create({
        data: {
          userId: session.user.id,
          action: "REDEEMED",
          points: pointsToRedeem,
        }
      });

      return updatedPoints;
    });

    // Create a notification for the points redemption
    await createLoyaltyPointsNotification(
      session.user.id,
      pointsToRedeem,
      'redeemed'
    );

    return NextResponse.json({ 
      success: true, 
      message: "Points redeemed successfully",
      points: result.points 
    });
  } catch (error) {
    console.error("Error redeeming points:", error);
    return NextResponse.json(
      { error: "Failed to redeem points" },
      { status: 500 }
    );
  }
} 