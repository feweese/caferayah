"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useSession } from "next-auth/react";

interface StoreLinkProps {
  collapsed?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * A component for transitioning from admin to store view
 * This ensures we cleanly transition and handle notifications context
 */
export function StoreLink({ collapsed = false, className, onClick }: StoreLinkProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Clear any existing admin-specific state if needed
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('admin-to-store-transition', 'true');
    }
    
    // Trigger any additional callbacks
    if (onClick) onClick();
    
    // Navigate to store
    router.push('/');
    
    // Force reload after navigation to ensure clean state
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };
  
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link 
            href="/"
            onClick={handleClick}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
              collapsed && "justify-center px-2",
              className
            )}
          >
            <Icons.store className="h-4 w-4" />
            {!collapsed && <span>View Store</span>}
          </Link>
        </TooltipTrigger>
        {collapsed && (
          <TooltipContent side="right">
            View Store
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
} 