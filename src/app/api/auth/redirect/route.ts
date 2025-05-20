import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      // If not authenticated, redirect to unauthorized page
      return NextResponse.redirect(new URL("/unauthorized", process.env.NEXTAUTH_URL));
    }

    // Create a response first
    let response;
    
    // Check user role and redirect accordingly
    if (session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN") {
      // Create response for admin redirect
      response = NextResponse.redirect(new URL("/admin", process.env.NEXTAUTH_URL));
      
      // Set a message for admin users on the response
      response.cookies.set("auth_success_message", "Successfully logged in as admin", { 
        maxAge: 5, // Short-lived cookie
        path: "/",
      });
    } else {
      // Create response for regular user redirect
      response = NextResponse.redirect(new URL("/", process.env.NEXTAUTH_URL));
      
      // Set a message for regular users on the response
      response.cookies.set("auth_success_message", "Successfully logged in", { 
        maxAge: 5, // Short-lived cookie
        path: "/",
      });
    }
    
    return response;
  } catch (error) {
    console.error("Error in auth redirect:", error);
    // Fallback to homepage on error
    return NextResponse.redirect(new URL("/", process.env.NEXTAUTH_URL));
  }
} 