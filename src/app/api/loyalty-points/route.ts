import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Get user's loyalty points and history
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the user's loyalty points
    const loyaltyPoints = await db.loyaltyPoints.findUnique({
      where: {
        userId: session.user.id,
      },
    });

    // If no loyalty points record exists, create one
    if (!loyaltyPoints) {
      const newLoyaltyPoints = await db.loyaltyPoints.create({
        data: {
          userId: session.user.id,
          points: 0,
        },
      });

      return NextResponse.json({
        points: newLoyaltyPoints.points,
        history: [],
      });
    }

    // Get the user's points history
    const pointsHistory = await db.pointsHistory.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      points: loyaltyPoints.points,
      history: pointsHistory,
    });
  } catch (error) {
    console.error("Error fetching loyalty points:", error);
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
} 