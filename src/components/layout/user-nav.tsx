"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/icons";
import { useCartStore } from "@/store/cart-store";
import { useEffect, useState } from "react";

export function UserNav() {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  
  // Get cart store clear function
  const cartStore = useCartStore();
  const clearCart = mounted ? cartStore?.clearCart : () => {};
  
  // Check if user is admin
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  // Mark component as mounted after first render (client-side only)
  useEffect(() => {
    setMounted(true);
    
    // Debug session data for avatar troubleshooting
    if (session?.user) {
      console.log("UserNav session data:", {
        name: session.user.name,
        image: session.user.image
      });
    }
  }, [session]);

  const handleLogout = () => {
    // Clear the cart before signing out
    if (mounted && clearCart) {
      clearCart();
    }
    signOut({ callbackUrl: "/" });
  };

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login">
          <Button variant="ghost" size="sm">
            Login
          </Button>
        </Link>
        <Link href="/register">
          <Button size="sm">Register</Button>
        </Link>
      </div>
    );
  }

  const initials = session.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            {session.user.image ? (
              <AvatarImage
                src={session.user.image}
                alt={session.user.name || ""}
                onError={(e) => {
                  console.error("Error loading navbar avatar image:", e);
                  // Fallback to initials if image fails to load
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <AvatarFallback>{initials}</AvatarFallback>
            )}
            {/* Always render the fallback in case the image fails to load */}
            {session.user.image && (
              <AvatarFallback>{initials}</AvatarFallback>
            )}
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {session.user.name}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {session.user.email}
            </p>
            {isAdmin && (
              <div className="flex items-center mt-1">
                <span className={`w-2 h-2 mr-1.5 rounded-full ${
                  session.user.role === "SUPER_ADMIN" ? "bg-purple-500" : "bg-blue-500"
                }`}></span>
                <span className="text-xs text-muted-foreground">
                  {session.user.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
                </span>
              </div>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={isAdmin ? "/admin/profile" : "/profile"}>
              <Icons.user className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          {/* Only show Orders link for non-admin users */}
          {!isAdmin && (
            <DropdownMenuItem asChild>
              <Link href="/orders">
                <Icons.shoppingBag className="mr-2 h-4 w-4" />
                <span>Orders</span>
              </Link>
            </DropdownMenuItem>
          )}
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <Icons.dashboard className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer"
        >
          <Icons.logout className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 