"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, Filter, Package, AlertTriangle, ShoppingBag, Star, Trash2, Loader2 } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/components/providers/notification-provider";
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

export function AdminNotificationDropdown() {
  const [mounted, setMounted] = useState(false);
  const { notifications, unreadCount, loading, markAsRead, deleteAllNotifications } = useNotifications();
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filter notifications by type
  const filteredNotifications = typeFilter
    ? notifications.filter(n => n.type === typeFilter).slice(0, 5)
    : notifications.slice(0, 5);
  
  // Get unique notification types for filters
  const notificationTypes = [...new Set(notifications.map(n => n.type))];
  
  // Set mounted state to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get icon for notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "ORDER_STATUS":
        return <ShoppingBag className="h-4 w-4 text-primary" />;
      case "NEW_ORDER":
        return <Package className="h-4 w-4 text-blue-500" />;
      case "LOYALTY_POINTS":
        return <Star className="h-4 w-4 text-yellow-500" />;
      case "SYSTEM":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Format time ago from date
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  };

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
        <DropdownMenuLabel className="font-normal">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold">Admin Notifications</span>
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
          </div>
        </DropdownMenuLabel>
        
        {/* Type filters */}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="flex gap-1 px-2 py-1.5 flex-wrap">
              <Button 
                variant={!typeFilter ? "secondary" : "outline"} 
                size="sm" 
                className="h-6 text-xs"
                onClick={() => setTypeFilter(null)}
              >
                All
              </Button>
              {notificationTypes.map(type => (
                <Button
                  key={type}
                  variant={typeFilter === type ? "secondary" : "outline"}
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setTypeFilter(type)}
                >
                  {getNotificationIcon(type)} {type === "NEW_ORDER" ? "Order Received" : type.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {loading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No {typeFilter ? typeFilter.toLowerCase().replace('_', ' ') : ''} notifications
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              {filteredNotifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`px-4 py-3 focus:bg-muted ${!notification.read ? 'bg-muted/30' : ''}`}
                  asChild
                >
                  <Link href={notification.link || "/admin/notifications"}>
                    <div className="flex flex-col gap-1 w-full" onClick={() => !notification.read && markAsRead(notification.id)}>
                      <div className="flex justify-between items-start">
                        <span className="font-medium text-sm">{notification.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                      <div className="flex justify-between items-center mt-1">
                        <span className="flex items-center text-xs">
                          {getNotificationIcon(notification.type)} 
                          <span className="ml-1 text-muted-foreground">
                            {notification.type === "NEW_ORDER" ? "Order Received" : notification.type.replace('_', ' ')}
                          </span>
                        </span>
                        {!notification.read && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </DropdownMenuItem>
              ))}
            </ScrollArea>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="justify-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Link href="/admin/notifications">
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 