import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addMonths, isBefore } from "date-fns";
import { createLoyaltyPointsNotification } from "@/lib/notifications";

// Secret key to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET || "default_cron_secret";

// Points expire after 12 months
const POINTS_EXPIRY_MONTHS = 12;

export async function GET(req: Request) {
  try {
    // Check for authorization using API key
    const { searchParams } = new URL(req.url);
    const apiKey = searchParams.get("apiKey");

    if (apiKey !== CRON_SECRET) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all points that have an expiry date set and are expired
    const now = new Date();
    const expiredPointsHistory = await db.pointsHistory.findMany({
      where: {
        action: "EARNED",
        expiresAt: {
          lt: now,
        },
        // Only check entries that haven't been marked as expired already
        NOT: {
          id: {
            in: await db.pointsHistory.findMany({
              where: { action: "EXPIRED" },
              select: { orderId: true },
            }).then(items => items.map(item => item.orderId).filter(Boolean) as string[]),
          }
        }
      },
    });

    // Process each expired points entry
    let totalExpired = 0;
    for (const entry of expiredPointsHistory) {
      await db.$transaction(async (tx) => {
        // Get the user's current points
        const loyaltyPoints = await tx.loyaltyPoints.findUnique({
          where: { userId: entry.userId },
        });

        if (!loyaltyPoints) return;

        // Deduct points from user (with a minimum of 0)
        await tx.loyaltyPoints.update({
          where: { userId: entry.userId },
          data: {
            points: {
              decrement: Math.min(loyaltyPoints.points, entry.points),
            },
          },
        });

        // Create expiration record
        await tx.pointsHistory.create({
          data: {
            userId: entry.userId,
            action: "EXPIRED",
            points: entry.points,
            orderId: entry.orderId,
          },
        });

        // Create notification for user
        await createLoyaltyPointsNotification(
          entry.userId,
          entry.points,
          'expired',
          entry.orderId
        );

        totalExpired += entry.points;
      });
    }

    // Set expiry date for new points that don't have one
    const pointsWithoutExpiry = await db.pointsHistory.findMany({
      where: {
        action: "EARNED",
        expiresAt: null,
      },
    });

    for (const entry of pointsWithoutExpiry) {
      // Set the expiry date to 12 months from earned date
      await db.pointsHistory.update({
        where: { id: entry.id },
        data: {
          expiresAt: addMonths(new Date(entry.createdAt), POINTS_EXPIRY_MONTHS),
        },
      });
    }

    // Find points that are going to expire in the next 30 days
    const expiringPoints = await db.pointsHistory.findMany({
      where: {
        action: "EARNED",
        expiresAt: {
          lt: addMonths(now, 1), // Will expire in less than a month
          gt: now, // But has not expired yet
        },
      },
    });

    // Send notifications for points expiring soon
    for (const entry of expiringPoints) {
      // Check if notification already exists
      const existingNotification = await db.notification.findFirst({
        where: {
          userId: entry.userId,
          type: "POINTS_EXPIRING",
          link: entry.id,
        },
      });

      if (!existingNotification) {
        const notification = await db.notification.create({
          data: {
            userId: entry.userId,
            type: "POINTS_EXPIRING",
            title: "Points Expiring Soon",
            message: `${entry.points} loyalty points will expire soon. Use them before they're gone!`,
            read: false,
            link: entry.id, // Store the points history ID to avoid duplicate notifications
          },
        });
        
        // Emit real-time notification
        try {
          const { emitNotificationToUser } = await import('@/lib/socket-emitter');
          emitNotificationToUser(entry.userId, notification);
        } catch (socketError) {
          console.error("Error emitting real-time notification:", socketError);
          // Continue even if real-time notification fails
        }
      }
    }

    return NextResponse.json({
      message: "Points expiration processed successfully",
      expired: expiredPointsHistory.length,
      totalPointsExpired: totalExpired,
      pointsWithExpirySet: pointsWithoutExpiry.length,
      expiringPoints: expiringPoints.length,
    });
  } catch (error) {
    console.error("Error processing points expiration:", error);
    return NextResponse.json(
      { message: "Failed to process points expiration" },
      { status: 500 }
    );
  }
} 