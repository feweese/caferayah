"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, Wifi, Trash2, Loader2 } from "lucide-react";
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
import { NotificationList } from "./notification-list";
import { useNotifications } from "@/components/providers/notification-provider";
import { useSocket } from "@/components/providers/socket-provider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function NotificationDropdown() {
  const [mounted, setMounted] = useState(false);
  const { notifications, unreadCount, loading, markAsRead, fetchNotifications, deleteAllNotifications } = useNotifications();
  const { isConnected } = useSocket();
  const router = useRouter();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
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
        
        // Force refresh notifications after a small delay to ensure session is loaded
        setTimeout(() => {
          fetchNotifications();
        }, 500);
      }
    }
  }, [fetchNotifications]);

  // Handle deletion of all notifications
  const handleDeleteAllNotifications = async () => {
    try {
      setIsDeleting(true);
      const success = await deleteAllNotifications();
      
      if (success) {
        toast.success("All notifications deleted successfully");
      } else {
        toast.error("Failed to delete notifications");
      }
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast.error('Failed to delete notifications');
    } finally {
      setIsDeleting(false);
      setShowDeleteAllDialog(false);
    }
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            <span className="sr-only">Notifications</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80" align="end" forceMount>
          <DropdownMenuLabel className="font-normal flex justify-between items-center">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
              {notifications.length > 0 && (
                <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive"
                      title="Clear all notifications"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all your notifications. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteAllNotifications}
                        disabled={isDeleting}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        {isDeleting && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Clear all
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <NotificationList 
              notifications={notifications} 
              loading={loading} 
              onMarkAsRead={markAsRead} 
            />
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="justify-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Link href="/notifications">
              View all notifications
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
} 