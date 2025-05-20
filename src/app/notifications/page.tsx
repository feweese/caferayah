"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Icons } from "@/components/icons";
import { Bell, CheckCircle, Package, AlertTriangle, ShoppingBag, ArrowLeft, Loader2, Star, Trash2, CheckSquare, Square, ChevronRight } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState("all");
  const { notifications, loading, error, markAsRead, deleteAllNotifications, batchMarkAsRead, batchDeleteNotifications } = useNotifications();
  const router = useRouter();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPerformingBatchAction, setIsPerformingBatchAction] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const notificationsPerPage = 10;
  
  // Redirect admin users to the admin notifications page
  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN") {
        router.push('/admin/notifications');
      }
    }
  }, [session, status, router]);
  
  // Handle read/unread filtering
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === "unread") return !notification.read;
    if (activeTab === "read") return notification.read;
    return true; // "all" tab
  });
  
  // Get paginated notifications
  const indexOfLastNotification = currentPage * notificationsPerPage;
  const indexOfFirstNotification = indexOfLastNotification - notificationsPerPage;
  const currentNotifications = filteredNotifications.slice(indexOfFirstNotification, indexOfLastNotification);
  
  // Reset to page 1 when changing tabs
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);
  
  // Pagination change handler
  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  if (status === "loading") {
    return (
      <MainLayout>
        <div className="container py-12 flex justify-center">
          <div className="animate-spin">
            <Icons.logo className="h-8 w-8" />
          </div>
        </div>
      </MainLayout>
    );
  }
  
  if (status === "unauthenticated") {
    return (
      <MainLayout>
        <div className="container py-12">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">Sign in required</h1>
            <p className="text-muted-foreground mb-6">
              Please sign in to view your notifications.
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  // Helper to get icon for notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "ORDER_STATUS":
        return <ShoppingBag className="h-5 w-5 text-primary" />;
      case "NEW_ORDER":
        return <Package className="h-5 w-5 text-blue-500" />;
      case "LOYALTY_POINTS":
        return <Star className="h-5 w-5 text-yellow-500" />;
      case "SYSTEM":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };
  
  // Format time ago from date
  const formatTimeAgo = (date: string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };
  
  // Mark a notification as read and navigate if needed
  const handleViewDetails = async (id: string, link: string, type: string) => {
    if (!link) return;
    
    // Mark as read if necessary
    const notification = notifications.find(n => n.id === id);
    if (!notification) return;
    
    if (!notification.read) {
      await markAsRead(id);
    }
    
    // Special case for "Order Ready for Pickup" notifications
    if (notification.title === "Order Ready for Pickup" || notification.title === "Test Ready for Pickup") {
      try {
        console.log("Processing Ready for Pickup notification:", link);
        
        // Try to extract order ID from message
        const messageMatch = notification.message.match(/#([a-z0-9]+)/i);
        if (messageMatch && messageMatch[1]) {
          const shortId = messageMatch[1];
          console.log("Extracted short order ID from message:", shortId);
          
          // If we have a valid link path, use it directly
          if (link && link.includes('/orders/')) {
            console.log("Using link path:", link);
            router.push(link);
          } else {
            // Fallback - just go to orders page
            console.log("No valid link found, going to orders page");
            router.push('/orders');
          }
        } else {
          console.log("Could not extract order ID from message, using link directly");
          router.push(link);
        }
        return;
      } catch (error) {
        console.error("Error processing Ready for Pickup notification:", error);
        router.push('/orders');
        return;
      }
    }
    
    // Handle order-related notifications (for all other types)
    if ((type === "ORDER_STATUS" || type === "LOYALTY_POINTS") && link.includes('/orders/')) {
      try {
        console.log("Processing order notification link:", link);
        
        // Extract order ID from the link
        const matches = link.match(/\/orders\/([^\/\?]+)/);
        if (matches && matches[1]) {
          const orderId = matches[1];
          console.log("Extracted order ID:", orderId);
          
          // Direct navigation to order details
          router.push(`/orders/${orderId}`);
          return;
        } else {
          // Try one more extraction method - just in case
          const parts = link.split('/orders/');
          if (parts.length >= 2 && parts[1]) {
            const orderId = parts[1].split('/')[0];
            console.log("Alternate extraction - order ID:", orderId);
            
            if (orderId) {
              router.push(`/orders/${orderId}`);
              return;
            }
          }
          
          console.error("Could not extract order ID from link:", link);
          toast.error("Could not find order details");
          router.push('/orders');
        }
      } catch (error) {
        console.error("Error navigating to order:", error);
        toast.error("Error viewing order details");
        router.push('/orders');
      }
    } else {
      // For non-order notifications, just use the link directly
      router.push(link);
    }
  };
  
  // Keep the original handleMarkAsRead for other functionality
  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
  };

  // Mark all visible notifications as read
  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;
    
    // Mark each unread notification as read
    for (const notification of unreadNotifications) {
      await markAsRead(notification.id);
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
  
  // Handle selected notifications
  const hasSelected = selectedIds.length > 0;
  const allSelected = filteredNotifications.length > 0 && selectedIds.length === filteredNotifications.length;
  
  // Toggle select all notifications
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNotifications.map(n => n.id));
    }
  };
  
  // Toggle select individual notification
  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    // If an event was passed, stop propagation
    if (e) {
      e.stopPropagation();
    }
    
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id) 
        : [...prev, id]
    );
  };
  
  // Handle batch mark as read
  const handleBatchMarkAsRead = async () => {
    // Get only the unread notifications from the selected ones
    const unreadIds = notifications
      .filter(n => selectedIds.includes(n.id) && !n.read)
      .map(n => n.id);
    
    if (unreadIds.length === 0) {
      toast.info("No unread notifications selected");
      return;
    }
    
    setIsPerformingBatchAction(true);
    try {
      const success = await batchMarkAsRead(unreadIds);
      if (success) {
        toast.success(`Marked ${unreadIds.length} notifications as read`);
        setSelectedIds([]);
      } else {
        toast.error("Failed to mark notifications as read");
      }
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      toast.error("An error occurred");
    } finally {
      setIsPerformingBatchAction(false);
    }
  };
  
  // Handle batch delete
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    
    setIsPerformingBatchAction(true);
    try {
      const success = await batchDeleteNotifications(selectedIds);
      if (success) {
        toast.success(`Deleted ${selectedIds.length} notifications`);
        setSelectedIds([]);
      } else {
        toast.error("Failed to delete notifications");
      }
    } catch (error) {
      console.error("Error deleting notifications:", error);
      toast.error("An error occurred");
    } finally {
      setIsPerformingBatchAction(false);
      setShowBatchDeleteDialog(false);
    }
  };
  
  // Clear selection
  const clearSelection = () => {
    setSelectedIds([]);
  };
  
  return (
    <MainLayout>
      <div className="container py-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild className="group">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                Back
              </Link>
            </Button>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold">Notifications</h1>
              <p className="text-muted-foreground mt-1">
                Stay updated with your order status and other important information.
              </p>
            </div>
            
            {/* Selection mode indicator and actions */}
            {hasSelected ? (
              <div className="flex flex-wrap gap-2 self-start">
                <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm">
                  <span>{selectedIds.length} selected</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearSelection} 
                    className="h-6 px-1"
                  >
                    Clear
                  </Button>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBatchMarkAsRead}
                  disabled={isPerformingBatchAction || !selectedIds.some(id => 
                    !notifications.find(n => n.id === id)?.read
                  )}
                >
                  {isPerformingBatchAction ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Mark as read
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBatchDeleteDialog(true)}
                  disabled={isPerformingBatchAction}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  {isPerformingBatchAction ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 self-start">
                {notifications.some(n => !n.read) && (
                  <Button 
                    variant="outline" 
                    onClick={handleMarkAllAsRead}
                    disabled={loading}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark all as read
                  </Button>
                )}
                
                {notifications.length > 0 && (
                  <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear all
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
            )}
          </div>
          
          <Card>
            <CardHeader className="px-6">
              <div className="flex items-center justify-between">
                <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full md:w-auto grid-cols-3">
                    <TabsTrigger value="all">
                      All
                      <span className="ml-1.5 text-xs px-1.5 py-0.5 bg-muted rounded-full">
                        {notifications.length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="unread">
                      Unread
                      <span className="ml-1.5 text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
                        {notifications.filter(n => !n.read).length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value="read">
                      Read
                      <span className="ml-1.5 text-xs px-1.5 py-0.5 bg-muted rounded-full">
                        {notifications.filter(n => n.read).length}
                      </span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                
                {filteredNotifications.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={toggleSelectAll}
                    className="hidden md:flex"
                  >
                    {allSelected ? (
                      <>
                        <CheckSquare className="h-4 w-4 mr-2" />
                        Deselect all
                      </>
                    ) : (
                      <>
                        <Square className="h-4 w-4 mr-2" />
                        Select all
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <h3 className="font-medium text-lg mb-2">No notifications</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {activeTab === "unread"
                      ? "You don't have any unread notifications."
                      : activeTab === "read"
                      ? "You don't have any read notifications."
                      : "You don't have any notifications yet."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-border">
                    {currentNotifications.map(notification => (
                      <div 
                        key={notification.id}
                        className={`p-5 ${notification.read ? 'bg-background' : 'bg-muted/20'} ${
                          selectedIds.includes(notification.id) ? 'bg-primary/5 border-l-2 border-primary' : ''
                        } transition-colors duration-200`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={`select-${notification.id}`}
                              checked={selectedIds.includes(notification.id)}
                              onCheckedChange={() => toggleSelect(notification.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="cursor-pointer"
                            />
                            <div className="shrink-0 mt-1">
                              {getNotificationIcon(notification.type)}
                            </div>
                          </div>
                          <div 
                            className={`flex-1 min-w-0 cursor-pointer p-2 rounded-md transition-colors ${notification.link ? 'hover:bg-muted/40' : ''}`}
                            onClick={() => notification.link && handleViewDetails(notification.id, notification.link, notification.type)}
                          >
                            <div className="flex justify-between mb-1 items-start">
                              <div className="flex-1">
                                <h3 className="font-medium text-base">{notification.title}</h3>
                                <p className="text-muted-foreground text-sm mt-1">{notification.message}</p>
                                <div className="flex items-center gap-4 mt-2">
                                  <span className="text-xs text-muted-foreground">
                                    {formatTimeAgo(notification.createdAt)}
                                  </span>
                                  {!notification.read && (
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMarkAsRead(notification.id);
                                      }}
                                      className="p-0 h-auto text-xs text-primary hover:text-primary/80"
                                    >
                                      Mark as read
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {!notification.read && (
                                  <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full font-medium shrink-0">
                                    New
                                  </span>
                                )}
                                {notification.link && (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Pagination Controls */}
                  {filteredNotifications.length > notificationsPerPage && (
                    <div className="py-4 flex justify-center">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => paginate(currentPage - 1)}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                            />
                          </PaginationItem>
                          
                          {Array.from({ length: Math.ceil(filteredNotifications.length / notificationsPerPage) }).map((_, index) => {
                            const pageNumber = index + 1;
                            const totalPages = Math.ceil(filteredNotifications.length / notificationsPerPage);
                            
                            // Show first page, last page, and pages around current page
                            if (
                              totalPages <= 5 || 
                              pageNumber === 1 || 
                              pageNumber === totalPages || 
                              (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                            ) {
                              return (
                                <PaginationItem key={pageNumber}>
                                  <PaginationLink 
                                    isActive={pageNumber === currentPage}
                                    onClick={() => paginate(pageNumber)}
                                  >
                                    {pageNumber}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            }
                            
                            // Add ellipsis for gaps
                            if (
                              (pageNumber === 2 && currentPage > 3) || 
                              (pageNumber === totalPages - 1 && currentPage < totalPages - 2)
                            ) {
                              return (
                                <PaginationItem key={pageNumber}>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              );
                            }
                            
                            return null;
                          })}
                          
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => paginate(currentPage + 1)}
                              className={currentPage === Math.ceil(filteredNotifications.length / notificationsPerPage) ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                  
                  {/* Pagination summary */}
                  {filteredNotifications.length > notificationsPerPage && (
                    <div className="text-center text-xs text-muted-foreground pb-4">
                      Showing {indexOfFirstNotification + 1}-{Math.min(indexOfLastNotification, filteredNotifications.length)} of {filteredNotifications.length} notifications
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.length} selected notification{selectedIds.length !== 1 ? 's' : ''}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBatchDelete}
              disabled={isPerformingBatchAction}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isPerformingBatchAction && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
} 