"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { StoreLink } from "@/components/layout/store-link";

// Define navigation groups with sections
const adminNavItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/admin",
    icon: Icons.dashboard,
    exact: true,
    group: "main",
  },
  {
    id: "products",
    label: "Products",
    href: "/admin/products",
    icon: Icons.products,
    exact: false,
    group: "content",
  },
  {
    id: "users",
    label: "Users",
    href: "/admin/users",
    icon: Icons.users,
    exact: false,
    group: "content",
  },
  {
    id: "orders",
    label: "Orders",
    href: "/admin/orders",
    icon: Icons.shoppingBag,
    exact: false,
    group: "content",
  },
  {
    id: "reviews",
    label: "Reviews",
    href: "/admin/reviews",
    icon: Icons.star,
    exact: false,
    group: "content",
  },
  {
    id: "analytics",
    label: "Analytics",
    href: "/admin/analytics",
    icon: Icons.barChart,
    exact: false,
    group: "reports",
  },
  {
    id: "reports",
    label: "Reports",
    href: "/admin/reports",
    icon: Icons.fileText,
    exact: false,
    group: "reports",
  },
];

// Define group labels
const groupLabels: Record<string, string> = {
  main: "Main",
  content: "Content Management",
  reports: "Analytics & Reports",
};

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Check if the user has a collapsed preference stored in localStorage
  useEffect(() => {
    setMounted(true);
    const savedCollapsed = localStorage.getItem('admin-sidebar-collapsed');
    if (savedCollapsed) {
      setCollapsed(savedCollapsed === 'true');
    }
  }, []);

  // Save collapsed state to localStorage and dispatch custom event
  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    if (mounted) {
      localStorage.setItem('admin-sidebar-collapsed', String(newState));
      // Dispatch a custom event that AdminLayout can listen for
      window.dispatchEvent(new CustomEvent('sidebar-toggle', { 
        detail: { collapsed: newState } 
      }));
    }
  };

  // Group navigation items by their group property
  const groupedNavItems: Record<string, typeof adminNavItems> = {};
  adminNavItems.forEach(item => {
    if (!groupedNavItems[item.group]) {
      groupedNavItems[item.group] = [];
    }
    groupedNavItems[item.group].push(item);
  });

  return (
    <>
      <aside 
        className={cn(
          "fixed left-0 top-0 h-screen border-r hidden md:flex md:flex-col transition-all duration-300 ease-in-out z-10 shadow-md",
          "bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:to-zinc-950 border-zinc-200 dark:border-zinc-800/60",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="h-full flex flex-col">
          {/* Logo section */}
          <div className="h-14 flex items-center px-4 border-b border-zinc-200 dark:border-zinc-800/60">
            <Link href="/admin" className="flex items-center gap-2">
              <Icons.logo className="h-6 w-6 text-primary" />
              {!collapsed && (
                <>
                  <span className="text-xl font-semibold text-zinc-900 dark:text-white">Caférayah</span>
                  <span className="text-md text-zinc-500 dark:text-zinc-400 font-medium">Admin</span>
                </>
              )}
            </Link>
          </div>
          
          {/* Toggle button */}
          <div className="flex justify-end p-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapsed}
              className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </Button>
          </div>
          
          {/* Navigation sections */}
          <nav className="h-full p-3 pt-1 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            <div className="flex flex-col space-y-6">
              {Object.entries(groupedNavItems).map(([groupKey, items]) => (
                <div key={groupKey} className="space-y-1">
                  {!collapsed && (
                    <h4 className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-500 font-semibold px-3 mb-2">
                      {groupLabels[groupKey]}
                    </h4>
                  )}
                  {items.map((item) => {
                    const isActive = item.exact 
                      ? pathname === item.href
                      : pathname.startsWith(item.href);
                    
                    return (
                      <TooltipProvider key={item.id} delayDuration={300}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              href={item.href}
                              className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
                                isActive
                                  ? "bg-zinc-100 dark:bg-gradient-to-r dark:from-zinc-800 dark:to-zinc-800/60 text-zinc-900 dark:text-white shadow-sm" 
                                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 hover:text-zinc-900 dark:hover:text-white",
                                collapsed && "justify-center px-2"
                              )}
                            >
                              <item.icon className={cn("h-4 w-4", isActive && "text-primary")} />
                              {!collapsed && <span>{item.label}</span>}
                              {isActive && !collapsed && (
                                <div className="absolute left-0 w-1 h-5 bg-primary rounded-r-full" />
                              )}
                            </Link>
                          </TooltipTrigger>
                          {collapsed && (
                            <TooltipContent side="right">
                              {item.label}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              ))}
            </div>
          </nav>
          
          {/* Footer with store link */}
          <div className="mt-auto border-t border-zinc-200 dark:border-zinc-800/60 p-3">
            <StoreLink 
              collapsed={collapsed} 
              className="text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 hover:text-zinc-900 dark:hover:text-white" 
            />
          </div>
        </div>
      </aside>
      
      {/* Mobile navigation at the bottom */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex overflow-x-auto p-2 bg-white dark:bg-gradient-to-r dark:from-zinc-950 dark:to-zinc-900 border-t border-zinc-200 dark:border-zinc-800/60 gap-1 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
        {adminNavItems.map((route) => {
          const isActive = route.exact 
            ? pathname === route.href
            : pathname.startsWith(route.href);
            
          return (
            <Link
              key={route.id}
              href={route.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <route.icon className={cn("h-4 w-4", isActive && "text-primary")} />
              <span className="text-xs">{route.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
} 