import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const redeemSchema = z.object({
  points: z.number().min(1, "Must redeem at least 1 point"),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { points } = redeemSchema.parse(body);

    // Begin a transaction to ensure data consistency
    return await db.$transaction(async (tx) => {
      // Get the user's current loyalty points
      const loyaltyPoints = await tx.loyaltyPoints.findUnique({
        where: {
          userId: session.user.id,
        },
      });

      if (!loyaltyPoints) {
        return NextResponse.json(
          { message: "Loyalty points record not found" },
          { status: 404 }
        );
      }

      // Check if the user has enough points to redeem
      if (loyaltyPoints.points < points) {
        return NextResponse.json(
          { message: "Insufficient points" },
          { status: 400 }
        );
      }

      // Update the user's loyalty points
      const updatedLoyaltyPoints = await tx.loyaltyPoints.update({
        where: {
          userId: session.user.id,
        },
        data: {
          points: {
            decrement: points,
          },
        },
      });

      // Record the redemption in the points history
      await tx.pointsHistory.create({
        data: {
          userId: session.user.id,
          action: "REDEEMED",
          points: points,
        },
      });

      return NextResponse.json({
        message: "Points redeemed successfully",
        currentPoints: updatedLoyaltyPoints.points,
      });
    });
  } catch (error) {
    console.error("Error redeeming points:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid input data", errors: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
} 