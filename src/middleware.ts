import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Routes that require admin privileges
const adminRoutes = [
  "/admin",
  "/admin/dashboard",
  "/admin/products",
  "/admin/users",
  "/admin/orders",
  "/admin/reviews",
  "/admin/analytics",
  "/admin/reports",
  "/admin/profile",
];

// Routes that require authentication
const authRoutes = [
  "/profile",
  "/orders",
  "/cart/checkout",
  "/notifications",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if user is authenticated
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // For admin routes, check if user has admin privileges
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  
  if (isAdminRoute) {
    // If not authenticated, redirect to unauthorized page
    if (!token) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    
    // If not an admin, redirect to 403 forbidden page
    if (token.role !== "ADMIN" && token.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/forbidden", request.url));
    }
  }
  
  // For auth routes, check if user is authenticated
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
  
  if (isAuthRoute && !token) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }
  
  // Continue processing the request
  return NextResponse.next();
}

// Configure matcher to apply middleware only to relevant routes
export const config = {
  matcher: [
    "/admin/:path*",
    "/profile/:path*",
    "/orders/:path*",
    "/cart/checkout/:path*",
    "/notifications/:path*",
  ],
}; 