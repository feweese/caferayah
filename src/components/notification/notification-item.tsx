"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, Package, AlertTriangle, ShoppingBag, Star } from "lucide-react";
import { toast } from "sonner";

interface NotificationItemProps {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  createdAt: string;
  onMarkAsRead: (id: string) => Promise<boolean>;
}

export function NotificationItem({
  id,
  title,
  message,
  type,
  read,
  link,
  createdAt,
  onMarkAsRead,
}: NotificationItemProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const router = useRouter();
  
  // Debug logging
  console.log(`Notification ${id} data:`, { type, title, link });
  
  const handleClick = async (e: React.MouseEvent) => {
    if (link) {
      e.preventDefault(); // Prevent default link behavior
      
      // Mark as read if not already read
      let markReadSuccessful = true;
      if (!read) {
        setIsMarkingRead(true);
        try {
          console.log(`Starting to mark notification ${id} as read`);
          markReadSuccessful = await onMarkAsRead(id);
          if (!markReadSuccessful) {
            console.error(`Failed to mark notification ${id} as read`);
            toast.error("Could not mark notification as read", {
              description: "Please try again later",
              duration: 5000
            });
          } else {
            console.log(`Successfully marked notification ${id} as read`);
          }
        } catch (error) {
          console.error("Error marking notification as read:", error);
          markReadSuccessful = false;
          toast.error("Error updating notification", {
            description: error instanceof Error ? error.message : "Please try again later",
            duration: 5000
          });
        } finally {
          setIsMarkingRead(false);
        }
      }
      
      // Special case for "Order Ready for Pickup" notifications
      if (title === "Order Ready for Pickup" || title === "Test Ready for Pickup") {
        try {
          console.log("Processing Ready for Pickup notification:", link);
          
          // Try to extract order ID from message
          const messageMatch = message.match(/#([a-z0-9]+)/i);
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
    } else if (!read) {
      // For notifications without links, just mark as read
      setIsMarkingRead(true);
      await onMarkAsRead(id);
      setIsMarkingRead(false);
    }
  };

  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });
  
  const getIcon = () => {
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

  const content = (
    <div 
      className={`
        flex items-start p-3 gap-3 rounded-md transition-colors
        ${read ? 'bg-background' : 'bg-muted/30'}
        ${link ? 'cursor-pointer hover:bg-muted/50' : ''}
        ${isHovering ? 'bg-muted/50' : ''}
      `}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onClick={handleClick}
    >
      <div className="flex-shrink-0 mt-1">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium">{title}</p>
          {!read && <Badge variant="outline" className="bg-primary/10 text-primary text-xs">New</Badge>}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{message}</p>
        <p className="text-xs text-muted-foreground/70 mt-1">{timeAgo}</p>
      </div>
      {!read && isHovering && !isMarkingRead && (
        <button 
          className="flex-shrink-0 text-primary hover:text-primary/80 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onMarkAsRead(id);
          }}
        >
          <CheckCircle className="h-4 w-4" />
        </button>
      )}
      {isMarkingRead && (
        <div className="flex-shrink-0 animate-pulse">
          <div className="h-4 w-4 rounded-full bg-muted"></div>
        </div>
      )}
    </div>
  );

  if (link) {
    // We'll handle navigation programmatically through onClick
    // but keep the Link for proper accessibility
    return (
      <Link href={link} onClick={handleClick} className="block">
        {content}
      </Link>
    );
  }

  return content;
} 