"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { UserNav } from "@/components/layout/user-nav";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { NotificationDropdown } from "@/components/notification/notification-dropdown";
import { AdminNotificationDropdown } from "@/components/notification/admin-notification-dropdown";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const routes = [
  {
    label: "Home",
    href: "/",
    active: (path: string) => path === "/",
  },
  {
    label: "Menu",
    href: "/menu",
    active: (path: string) => path === "/menu" || path.startsWith("/menu/"),
  },
  {
    label: "About",
    href: "/about",
    active: (path: string) => path === "/about",
  },
  {
    label: "Contact",
    href: "/contact",
    active: (path: string) => path === "/contact",
  },
];

export function Navbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { items = [] } = useCart();
  const itemCount = items?.length || 0;
  const { data: session } = useSession();
  
  // Check if user is admin
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  
  // Set mounted state to avoid hydration issues
  useEffect(() => {
    setMounted(true);
    
    if (typeof window !== 'undefined') {
      // Safely check localStorage with null coalescing
      const transitionFlag = window.localStorage.getItem('admin-to-store-transition') || '';
      const isTransitioningFromAdmin = transitionFlag === 'true';
      
      if (isTransitioningFromAdmin) {
        // Clear the transition flag
        window.localStorage.removeItem('admin-to-store-transition');
        
        // Force refresh the page after a moment to ensure clean state
        if (mounted) {
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      }
    }
  }, [mounted]);

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Icons.logo className="h-6 w-6" />
          <span className="text-xl font-semibold text-foreground">Caférayah</span>
        </Link>
        <nav className="mx-6 flex items-center space-x-4 lg:space-x-6">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground/80",
                pathname && route.active(pathname)
                  ? "text-foreground"
                  : "text-foreground/60"
              )}
            >
              {route.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {/* Theme toggle */}
          <ThemeToggle variant="ghost" />
          
          {isAdmin ? <AdminNotificationDropdown /> : <NotificationDropdown />}
          {/* Only show cart icon for non-admin users */}
          {mounted && !isAdmin && (
            <Button variant="ghost" size="icon" asChild>
              <Link href="/cart" className="relative">
                <Icons.cart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
                <span className="sr-only">Shopping cart</span>
              </Link>
            </Button>
          )}
          <UserNav />
        </div>
      </div>
    </header>
  );
} 