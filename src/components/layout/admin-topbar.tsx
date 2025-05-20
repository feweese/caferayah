"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "@/components/ui/avatar";
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
import { NotificationDropdown } from "@/components/notification/notification-dropdown";
import { AdminNotificationDropdown } from "@/components/notification/admin-notification-dropdown";
import { cn } from "@/lib/utils";
import { Search, Command, Keyboard } from "lucide-react";
import { GlobalSearch } from "@/components/admin/global-search";
import { Toaster } from "react-hot-toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";

// Define routes for breadcrumb mapping
const routeLabels: Record<string, string> = {
  admin: "Dashboard",
  products: "Products",
  users: "Users",
  orders: "Orders",
  reviews: "Reviews",
  analytics: "Analytics",
  reports: "Reports",
  new: "New",
};

export function AdminTopbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  
  // Get cart store clear function
  const cartStore = useCartStore();
  const clearCart = mounted ? cartStore?.clearCart : () => {};
  
  // Generate breadcrumb segments from the pathname
  const breadcrumbs = pathname
    .split('/')
    .filter(Boolean)
    .map((segment, index, array) => {
      // Create path up to this segment
      const path = `/${array.slice(0, index + 1).join('/')}`;
      
      // Check if segment is an ID (starts with a non-letter)
      const isId = /^[^a-zA-Z]/.test(segment) || segment.length > 20;
      
      return {
        label: isId ? "Details" : routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
        path,
        isLast: index === array.length - 1
      };
    });
  
  // Mark component as mounted after first render (client-side only)
  useEffect(() => {
    setMounted(true);
  }, [session]);

  // Replace the existing useEffect for loading state with this:
  useEffect(() => {
    // Create a custom loading indicator for navigation
    let timeoutId: NodeJS.Timeout;
    
    const handleNavigationStart = () => {
      // Clear any existing timeout
      if (timeoutId) clearTimeout(timeoutId);
      setIsLoading(true);
    };
    
    const handleNavigationComplete = () => {
      // Add a small delay to make loading state visible for quick navigations
      timeoutId = setTimeout(() => {
        setIsLoading(false);
      }, 300);
    };
    
    // This is a simple way to detect route changes with App Router
    // by comparing the previous and current pathname
    const currentPathname = pathname;
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [pathname]);

  // Add this effect to demonstrate loading during initial page load
  useEffect(() => {
    setIsLoading(true);
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    
    return () => clearTimeout(loadingTimeout);
  }, []);

  // Add this useEffect to listen for sidebar toggle events
  useEffect(() => {
    // Initialize from localStorage
    const savedCollapsed = localStorage.getItem('admin-sidebar-collapsed');
    if (savedCollapsed) {
      setSidebarCollapsed(savedCollapsed === 'true');
    }
    
    // Listen for sidebar toggle events
    const handleSidebarToggle = (e: CustomEvent) => {
      setSidebarCollapsed(e.detail.collapsed);
    };
    
    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    
    return () => {
      window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    };
  }, []);

  const handleLogout = () => {
    // Clear the cart before signing out
    if (mounted && clearCart) {
      clearCart();
    }
    signOut({ callbackUrl: "/" });
  };

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "";

  return (
    <>
      <header className={`fixed top-0 right-0 left-0 z-20 border-b bg-white dark:bg-gradient-to-r dark:from-zinc-950 dark:to-zinc-900 border-zinc-200 dark:border-zinc-800 h-14 shadow-sm transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'md:left-16' : 'md:left-64'}`}>
        <div className={cn(
          "absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-opacity",
          isLoading ? "opacity-100" : "opacity-0"
        )}></div>
        <div className="flex h-full items-center justify-between px-4">
          {/* Breadcrumbs */}
          <div className="hidden md:flex items-center space-x-2 text-sm text-zinc-600 dark:text-zinc-400">
            {breadcrumbs.map((breadcrumb, index) => (
              <div key={breadcrumb.path} className="flex items-center">
                {index > 0 && <span className="mx-2 text-zinc-400 dark:text-zinc-600">/</span>}
                {breadcrumb.isLast ? (
                  <span className="font-medium text-zinc-900 dark:text-white">{breadcrumb.label}</span>
                ) : (
                  <Link 
                    href={breadcrumb.path}
                    className="hover:text-zinc-900 dark:hover:text-white transition-colors"
                  >
                    {breadcrumb.label}
                  </Link>
                )}
              </div>
            ))}
          </div>
          
          {/* Middle spacer to create equal distribution */}
          <div className="flex-1"></div>
          
          {/* Right section with search and user controls */}
          <div className="flex items-center gap-4">
            {/* Search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300 text-sm shadow-sm hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors duration-200"
            >
              <Search className="h-4 w-4 text-zinc-500" />
              <span className="text-zinc-600 dark:text-zinc-400">Search admin...</span>
              <div className="hidden md:flex items-center gap-1 ml-4 pl-4 border-l border-zinc-300 dark:border-zinc-700">
                <kbd className="hidden md:flex h-5 w-5 select-none items-center justify-center rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium text-zinc-500">
                  <Command className="h-3 w-3" />
                </kbd>
                <kbd className="hidden md:flex h-5 select-none items-center justify-center rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-1.5 text-[10px] font-medium text-zinc-500">
                  K
                </kbd>
              </div>
            </button>
            
            {/* Theme toggle */}
            <ThemeToggle variant="ghost" />
            
            {/* Notification dropdown */}
            <AdminNotificationDropdown />
            
            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:ring-0 focus:ring-offset-0"
                  aria-label="User menu"
                >
                  <Avatar className="h-8 w-8 border border-zinc-300 dark:border-zinc-700 transition-shadow hover:shadow-md">
                    {session?.user?.image ? (
                      <AvatarImage
                        src={session.user.image}
                        alt={session.user.name || "User"}
                        className="object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : null}
                    <AvatarFallback className="bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 mt-1 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-zinc-900 dark:text-white">
                      {session?.user?.name || "Admin User"}
                    </p>
                    <p className="text-xs leading-none text-zinc-500 dark:text-zinc-400">
                      {session?.user?.email || ""}
                    </p>
                    <div className="flex items-center mt-1">
                      <span className={cn(
                        "w-2 h-2 mr-1.5 rounded-full", 
                        session?.user?.role === "SUPER_ADMIN" ? "bg-purple-500" : "bg-blue-500"
                      )}></span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {session?.user?.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-200 dark:bg-zinc-800" />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link 
                      href="/admin/profile"
                      className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:bg-zinc-100 dark:focus:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    >
                      <Icons.user className="mr-2 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link 
                      href="/admin"
                      className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:bg-zinc-100 dark:focus:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    >
                      <Icons.dashboard className="mr-2 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.preventDefault();
                      if (typeof window !== 'undefined') {
                        window.localStorage.setItem('admin-to-store-transition', 'true');
                        window.location.href = '/';
                      }
                    }}
                    className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:bg-zinc-100 dark:focus:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                  >
                    <Icons.store className="mr-2 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                    <span>View Store</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator className="bg-zinc-200 dark:bg-zinc-800" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:bg-zinc-100 dark:focus:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                >
                  <Icons.logout className="mr-2 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Global Search Component */}
      <GlobalSearch 
        open={searchOpen} 
        onOpenChange={setSearchOpen} 
      />
      
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
            borderRadius: '8px',
          },
          duration: 3000,
        }}
      />
    </>
  );
} 