"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  CheckCircle, 
  Package, 
  AlertTriangle, 
  ShoppingBag, 
  Loader2, 
  Star, 
  CheckCheck,
  Filter,
  Trash2,
  CheckSquare,
  Square,
  ChevronRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/components/providers/notification-provider";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export default function AdminNotificationsPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/login');
    },
  });
  const [activeTab, setActiveTab] = useState("all");
  const { notifications, loading, error, markAsRead, fetchNotifications, batchMarkAsRead, batchDeleteNotifications } = useNotifications();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPerformingBatchAction, setIsPerformingBatchAction] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const notificationsPerPage = 15; // Show more notifications per page for admin
  
  // Check if user is admin, if not redirect to customer notifications
  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
        router.push('/notifications');
        toast.error("You don't have permission to access admin notifications");
      }
    }
  }, [session, status, router]);
  
  // Filter notifications by read status only
  const filteredNotifications = notifications.filter(notification => {
    // Filter by read status
    if (activeTab === "unread" && notification.read) return false;
    if (activeTab === "read" && !notification.read) return false;
    
    return true;
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
  
  // Helper to get user-friendly type name
  const getTypeName = (type: string) => {
    switch (type) {
      case "ORDER_STATUS": return "Order Status";
      case "NEW_ORDER": return "Order Received"; // Changed from "New Order" to avoid confusion with unread status
      case "LOYALTY_POINTS": return "Loyalty Points";
      case "SYSTEM": return "System";
      default: return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    }
  };
  
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
    
    // Navigate to link (handle admin specific paths)
    router.push(link);
  };
  
  // Mark all visible notifications as read
  const handleMarkAllAsRead = async () => {
    const unreadNotifications = filteredNotifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;
    
    // Mark each unread notification as read
    for (const notification of unreadNotifications) {
      await markAsRead(notification.id);
    }
    
    toast.success(`Marked ${unreadNotifications.length} notifications as read`);
  };

  // Handle deletion of all notifications (would require a new API endpoint)
  const handleDeleteAllNotifications = async () => {
    try {
      setIsDeleting(true);
      
      // Call API to delete notifications (this endpoint needs to be created)
      const response = await fetch('/api/admin/notifications/delete-all', {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete notifications');
      }
      
      toast.success("All notifications deleted successfully");
      fetchNotifications(); // Refresh the list
      
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
      // Use admin endpoint for batch operations
      const response = await fetch('/api/admin/notifications/batch-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'markAsRead',
          notificationIds: unreadIds
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notifications as read');
      }
      
      toast.success(`Marked ${unreadIds.length} notifications as read`);
      setSelectedIds([]);
      fetchNotifications(); // Refresh the list
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      toast.error("Failed to mark notifications as read");
    } finally {
      setIsPerformingBatchAction(false);
    }
  };
  
  // Handle batch delete
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    
    setIsPerformingBatchAction(true);
    try {
      // Use admin endpoint for batch operations
      const response = await fetch('/api/admin/notifications/batch-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          notificationIds: selectedIds
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete notifications');
      }
      
      toast.success(`Deleted ${selectedIds.length} notifications`);
      setSelectedIds([]);
      fetchNotifications(); // Refresh the list
    } catch (error) {
      console.error("Error deleting notifications:", error);
      toast.error("Failed to delete notifications");
    } finally {
      setIsPerformingBatchAction(false);
      setShowBatchDeleteDialog(false);
    }
  };
  
  // Clear selection
  const clearSelection = () => {
    setSelectedIds([]);
  };
  
  if (status === "loading") {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin">
            <Loader2 className="h-8 w-8 text-primary" />
          </div>
        </div>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-muted-foreground mt-1">
              View and manage system notifications and alerts
            </p>
          </div>
          
          {hasSelected ? (
            <div className="flex flex-wrap gap-2">
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
                  <CheckCheck className="h-4 w-4 mr-2" />
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
            <div className="flex flex-wrap gap-2">
              {/* Mark all as read button */}
              {filteredNotifications.some(n => !n.read) && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={loading}
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark all as read
                </Button>
              )}
              
              {/* Delete all button */}
              <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete All Notifications</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete all your notifications.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAllNotifications}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete All'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
                      {filteredNotifications.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="unread">
                    Unread
                    <span className="ml-1.5 text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
                      {filteredNotifications.filter(n => !n.read).length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="read">
                    Read
                    <span className="ml-1.5 text-xs px-1.5 py-0.5 bg-muted rounded-full">
                      {filteredNotifications.filter(n => n.read).length}
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
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium">No notifications</h3>
                <p className="text-muted-foreground mt-1 max-w-md">
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
                  {currentNotifications.map((notification) => {
                    const timeAgo = formatTimeAgo(notification.createdAt);
                    return (
                      <div 
                        key={notification.id}
                        className={`
                          flex items-start p-4 gap-4 
                          ${notification.read ? 'bg-background hover:bg-muted/30' : 'bg-muted/30 hover:bg-muted/40'}
                          ${selectedIds.includes(notification.id) ? 'bg-primary/5 border-l-2 border-primary' : ''}
                          transition-colors duration-200
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`select-${notification.id}`}
                            checked={selectedIds.includes(notification.id)}
                            onCheckedChange={() => toggleSelect(notification.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="cursor-pointer"
                          />
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </div>
                        </div>
                        <div 
                          className={`flex flex-col flex-1 min-w-0 cursor-pointer p-2 rounded-md transition-colors ${notification.link ? 'hover:bg-muted/40' : ''}`}
                          onClick={(e) => notification.link && handleViewDetails(notification.id, notification.link, notification.type)}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center">
                              <p className="font-medium">{notification.title}</p>
                              {!notification.read && <Badge variant="outline" className="bg-primary/10 text-primary text-xs ml-2">New</Badge>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {getTypeName(notification.type)}
                              </Badge>
                              {notification.link && (
                                <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">{timeAgo}</span>
                            <div className="flex items-center gap-2">
                              {!notification.read && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="p-0 h-auto text-xs text-primary hover:text-primary/80"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Mark as read
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Pagination Controls */}
                {filteredNotifications.length > notificationsPerPage && (
                  <div className="py-4 flex justify-center border-t">
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
    </AdminLayout>
  );
} 