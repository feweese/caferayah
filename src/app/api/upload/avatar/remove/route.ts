import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST() {
  console.log("Avatar removal API route called");
  
  try {
    const session = await getServerSession(authOptions);
    console.log("Session check completed", { authenticated: !!session?.user });
    
    if (!session?.user) {
      console.log("User not authenticated for avatar removal");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // Check if user has an avatar before removing
    const currentUser = await db.user.findUnique({
      where: { id: userId },
      select: { image: true }
    });
    
    console.log("Current user avatar status:", { hasAvatar: !!currentUser?.image });
    
    try {
      // Update user to remove image
      await db.user.update({
        where: { id: userId },
        data: { image: null },
      });
      
      console.log("Avatar successfully removed for user:", userId);
      return NextResponse.json({ success: true, message: "Avatar removed successfully" });
    } catch (dbError) {
      console.error("Database error during avatar removal:", dbError);
      return NextResponse.json(
        { error: "Database error", details: (dbError as Error).message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Server error during avatar removal:", error);
    return NextResponse.json(
      { error: "Server error", details: (error as Error).message },
      { status: 500 }
    );
  }
} 