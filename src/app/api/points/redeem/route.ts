import { createLoyaltyPointsNotification } from "@/lib/notifications";

// ... existing code ...

// After successfully redeeming points, add:
await tx.pointsHistory.create({
  data: {
    userId: session.user.id,
    action: "REDEEMED",
    points: pointsToRedeem,
    // Add any other relevant fields
  }
});

// Create a notification for the points redemption
await createLoyaltyPointsNotification(
  session.user.id,
  pointsToRedeem,
  'redeemed'
);

// ... rest of code ... 