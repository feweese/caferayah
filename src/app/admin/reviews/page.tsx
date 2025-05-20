"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Info, Star, ThumbsUp, ThumbsDown, Trash2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { AdminLayout } from "@/components/layout/admin-layout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import { Icons } from "@/components/icons";

// Types for reviews
interface ReviewUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface ReviewProduct {
  id: string;
  name: string;
  image: string | null;
  images?: string[] | null;
}

interface Review {
  id: string;
  userId: string;
  user: ReviewUser;
  productId: string;
  orderId: string;
  product: ReviewProduct;
  rating: number;
  comment: string | null;
  approved: boolean;
  rejected: boolean;
  createdAt: string;
  updatedAt: string;
  order?: {
    id: string;
    createdAt: string;
  };
}

export default function AdminReviewsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [reviews, setReviews] = useState<{
    pending: Review[],
    approved: Review[],
    rejected: Review[]
  }>({
    pending: [],
    approved: [],
    rejected: []
  });
  
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("pending");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [reviewDetailOpen, setReviewDetailOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Check for authentication
  useEffect(() => {
    if (status === "loading") return;
    
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    
    if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
      router.push("/");
      toast.error("You don't have permission to access this page");
      return;
    }
  }, [status, router, session]);

  // Fetch reviews data
  useEffect(() => {
    const fetchReviews = async () => {
      if (status !== "authenticated") return;
      if (session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") return;
      
      setLoading(true);
      try {
        // Fetch pending reviews
        const pendingRes = await fetch(`/api/admin/reviews?status=pending`, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        if (!pendingRes.ok) {
          const errorData = await pendingRes.json().catch(() => ({}));
          console.error("Error fetching pending reviews:", pendingRes.status, errorData);
          throw new Error(`Error fetching pending reviews: ${pendingRes.status} ${JSON.stringify(errorData)}`);
        }
        const pendingData = await pendingRes.json();
        
        // Fetch approved reviews
        const approvedRes = await fetch(`/api/admin/reviews?status=approved`, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        if (!approvedRes.ok) {
          const errorData = await approvedRes.json().catch(() => ({}));
          console.error("Error fetching approved reviews:", approvedRes.status, errorData);
          throw new Error(`Failed to fetch approved reviews: ${approvedRes.statusText}`);
        }
        const approvedData = await approvedRes.json();
        
        // Fetch rejected reviews
        const rejectedRes = await fetch(`/api/admin/reviews?status=rejected`, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        if (!rejectedRes.ok) {
          const errorData = await rejectedRes.json().catch(() => ({}));
          console.error("Error fetching rejected reviews:", rejectedRes.status, errorData);
          throw new Error(`Failed to fetch rejected reviews: ${rejectedRes.statusText}`);
        }
        const rejectedData = await rejectedRes.json();
        
        setReviews({
          pending: pendingData,
          approved: approvedData,
          rejected: rejectedData
        });
      } catch (error) {
        console.error("Error fetching reviews:", error);
        toast.error(error instanceof Error ? error.message : "Failed to load reviews");
      } finally {
        setLoading(false);
      }
    };
    
    fetchReviews();
  }, [status, refreshTrigger, session]);

  // Check for review ID in URL
  useEffect(() => {
    const handleUrlParam = async () => {
      // Get URL parameters using Next.js useSearchParams
      const reviewId = searchParams.get('id');
      
      if (reviewId && reviews) {
        // Find the review in any of the categories
        const foundReview = [...reviews.pending, ...reviews.approved, ...reviews.rejected]
          .find(review => review.id === reviewId);
        
        if (foundReview) {
          // Open the review details
          setSelectedReview(foundReview);
          setReviewDetailOpen(true);
          
          // Set the correct tab based on review status
          if (foundReview.approved) {
            setCurrentTab('approved');
          } else if (foundReview.rejected) {
            setCurrentTab('rejected');
          } else {
            setCurrentTab('pending');
          }
        }
      } else {
        // Close the dialog if no ID is in the URL
        setReviewDetailOpen(false);
      }
    };

    if (!loading && status === 'authenticated') {
      handleUrlParam();
    }
  }, [reviews, loading, status, searchParams]); // Use searchParams in dependency array

  // Handle review action (approve, reject, delete)
  const handleReviewAction = async (review: Review, action: "approve" | "reject" | "delete") => {
    if (!review) return;
    
    setActionLoading(true);
    try {
      const url = `/api/admin/reviews/${review.id}`;
      let method = "PATCH";
      let payload: any = { action }; 
      
      if (action === "reject" && rejectReason) {
        payload.reason = rejectReason;
      } else if (action === "delete") {
        method = "DELETE";
        payload = {}; // DELETE requests typically don't have a body
      }
      
      console.log(`Sending ${action} request for review ${review.id} with payload:`, JSON.stringify(payload));
      
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store"
        },
        body: method === "DELETE" ? undefined : JSON.stringify(payload),
      });
      
      let result;
      try {
        const text = await response.text(); // Get the raw text first
        console.log(`Response text:`, text);
        result = text ? JSON.parse(text) : {};
      } catch (e) {
        console.error("Error parsing response:", e);
        result = {};
      }
      
      if (!response.ok) {
        console.error(`Error ${action}ing review:`, result);
        const errorMessage = result.error || `Failed to ${action} review`;
        throw new Error(errorMessage);
      }
      
      // Show success toast
      toast.success(result.message || `Review ${action}ed successfully`);
      
      // Trigger a complete refresh instead of modifying the state directly
      // This ensures we get the proper data from the server
      setRefreshTrigger(prev => prev + 1);
      
      // Close any open dialogs
      setReviewDetailOpen(false);
      setRejectDialogOpen(false);
      setDeleteDialogOpen(false);
      setRejectReason("");
      
    } catch (error) {
      console.error(`Error ${action}ing review:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to ${action} review`);
    } finally {
      setActionLoading(false);
    }
  };
  
  // Open details dialog
  const openReviewDetails = (review: Review) => {
    setSelectedReview(review);
    setReviewDetailOpen(true);
  };
  
  // Open reject dialog
  const openRejectDialog = (review: Review) => {
    setSelectedReview(review);
    setRejectDialogOpen(true);
  };
  
  // Open delete dialog
  const openDeleteDialog = (review: Review) => {
    setSelectedReview(review);
    setDeleteDialogOpen(true);
  };
  
  // Render rating stars
  const renderRatingStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={`h-4 w-4 ${
              index < rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
            }`}
          />
        ))}
        <span className="ml-2 text-sm">{rating}/5</span>
      </div>
    );
  };

  // If still authenticating, show loading state
  if (status === "loading" || (status === "authenticated" && !session)) {
    return (
      <AdminLayout>
        <div className="container flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <h3 className="text-xl font-medium">Loading...</h3>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Block access for non-admins
  if (status === "authenticated" && session?.user?.role !== "ADMIN" && session?.user?.role !== "SUPER_ADMIN") {
    return null; // The user will be redirected by useEffect
  }

  return (
    <AdminLayout>
      <div className="container px-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Reviews</h1>
            <p className="text-muted-foreground mt-1">
              Manage and moderate customer reviews
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Refresh
          </Button>
        </div>

        <Tabs 
          defaultValue="pending" 
          className="mb-8"
          value={currentTab}
          onValueChange={setCurrentTab}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="pending" className="relative">
              Pending
              {reviews.pending.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-primary text-primary-foreground">
                  {reviews.pending.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved
              {reviews.approved.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {reviews.approved.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected
              {reviews.rejected.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {reviews.rejected.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          {/* PENDING REVIEWS */}
          <TabsContent value="pending">
            <div className="bg-card border rounded-lg overflow-hidden">
              {loading ? (
                <div className="p-4">
                  <ReviewTableSkeleton />
                </div>
              ) : reviews.pending.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Comment</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviews.pending.map((review) => (
                        <TableRow key={review.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={review.user.image || ""} alt={review.user.name} />
                                <AvatarFallback>
                                  {review.user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{review.user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{review.product.name}</TableCell>
                          <TableCell>{renderRatingStars(review.rating)}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            <div className="flex items-center gap-2">
                              <span className="truncate">{review.comment || "No comment"}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => openReviewDetails(review)}
                                className="h-6 w-6"
                              >
                                <Info className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(review.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              timeZone: 'UTC'
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900"
                                onClick={() => handleReviewAction(review, "approve")}
                                disabled={actionLoading}
                              >
                                {actionLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ThumbsUp className="h-3 w-3 mr-1" />}
                                Approve
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="bg-red-100 text-red-800 hover:bg-red-200 hover:text-red-900"
                                onClick={() => openRejectDialog(review)}
                                disabled={actionLoading}
                              >
                                {actionLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ThumbsDown className="h-3 w-3 mr-1" />}
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-16 text-center">
                  <p className="text-muted-foreground">No pending reviews to moderate</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* APPROVED REVIEWS */}
          <TabsContent value="approved">
            <div className="bg-card border rounded-lg overflow-hidden">
              {loading ? (
                <div className="p-4">
                  <ReviewTableSkeleton />
                </div>
              ) : reviews.approved.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Comment</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviews.approved.map((review) => (
                        <TableRow key={review.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={review.user.image || ""} alt={review.user.name} />
                                <AvatarFallback>
                                  {review.user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{review.user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{review.product.name}</TableCell>
                          <TableCell>{renderRatingStars(review.rating)}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            <div className="flex items-center gap-2">
                              <span className="truncate">{review.comment || "No comment"}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => openReviewDetails(review)}
                                className="h-6 w-6"
                              >
                                <Info className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(review.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              timeZone: 'UTC'
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="bg-red-50 text-red-800 hover:bg-red-100"
                              onClick={() => openDeleteDialog(review)}
                              disabled={actionLoading}
                            >
                              {actionLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-16 text-center">
                  <p className="text-muted-foreground">No approved reviews found</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          {/* REJECTED REVIEWS */}
          <TabsContent value="rejected">
            <div className="bg-card border rounded-lg overflow-hidden">
              {loading ? (
                <div className="p-4">
                  <ReviewTableSkeleton />
                </div>
              ) : reviews.rejected.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Comment</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviews.rejected.map((review) => (
                        <TableRow key={review.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={review.user.image || ""} alt={review.user.name} />
                                <AvatarFallback>
                                  {review.user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{review.user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{review.product.name}</TableCell>
                          <TableCell>{renderRatingStars(review.rating)}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            <div className="flex items-center gap-2">
                              <span className="truncate">{review.comment || "No comment"}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => openReviewDetails(review)}
                                className="h-6 w-6"
                              >
                                <Info className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(review.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              timeZone: 'UTC'
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="bg-green-50 text-green-800 hover:bg-green-100"
                                onClick={() => handleReviewAction(review, "approve")}
                                disabled={actionLoading}
                              >
                                {actionLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ThumbsUp className="h-3 w-3 mr-1" />}
                                Approve
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="bg-red-50 text-red-800 hover:bg-red-100"
                                onClick={() => openDeleteDialog(review)}
                                disabled={actionLoading}
                              >
                                {actionLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-16 text-center">
                  <p className="text-muted-foreground">No rejected reviews found</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Review Details Dialog */}
      <Dialog open={reviewDetailOpen} onOpenChange={(isOpen) => {
        setReviewDetailOpen(isOpen);
        if (!isOpen) {
          // When closing the dialog, remove the ID from the URL
          // without triggering a page reload
          const url = new URL(window.location.href);
          url.searchParams.delete('id');
          window.history.pushState({}, '', url);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
            <DialogDescription>
              View the complete details of this review
            </DialogDescription>
          </DialogHeader>
          
          {selectedReview && (
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedReview.user.image || ""} alt={selectedReview.user.name} />
                  <AvatarFallback>
                    {selectedReview.user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{selectedReview.user.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedReview.user.email}</p>
                </div>
              </div>
              
              <div className="grid gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">Product</h3>
                <div className="flex items-center gap-2">
                  {selectedReview.product.image ? (
                    <Image
                      src={selectedReview.product.image}
                      alt={selectedReview.product.name}
                      className="rounded-md object-cover"
                      width={40}
                      height={40}
                      unoptimized={selectedReview.product.image.startsWith('data:')}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
                      <Icons.coffee className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <p>{selectedReview.product.name}</p>
                </div>
              </div>
              
              <div className="grid gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">Order</h3>
                <p>Order ID: {selectedReview.orderId === "legacy" ? "Legacy Review" : selectedReview.orderId}</p>
                {selectedReview.order && selectedReview.order.id !== "legacy" && (
                  <p className="text-sm text-muted-foreground">
                    Order Date: {new Date(selectedReview.order.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Rating</h3>
                {renderRatingStars(selectedReview.rating)}
              </div>
              
              {selectedReview.comment && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Comment</h3>
                  <p className="text-sm whitespace-pre-wrap">{selectedReview.comment}</p>
                </div>
              )}
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Date Submitted</h3>
                <p>{new Date(selectedReview.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: 'UTC'
                })} at {new Date(selectedReview.createdAt).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                  timeZone: 'UTC'
                })}</p>
              </div>
            </div>
          )}
          
          <DialogFooter className="sm:justify-start mt-4 gap-2">
            <Button
              variant="default"
              onClick={() => {
                if (selectedReview) handleReviewAction(selectedReview, "approve");
              }}
              disabled={actionLoading || (selectedReview?.approved ?? false)}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ThumbsUp className="h-4 w-4 mr-2" />}
              {selectedReview?.approved ? "Approved" : "Approve"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setReviewDetailOpen(false);
                if (selectedReview) openRejectDialog(selectedReview);
              }}
              disabled={actionLoading || (selectedReview?.rejected ?? false)}
              className="text-red-600 hover:text-red-700"
            >
              <ThumbsDown className="h-4 w-4 mr-2" />
              {selectedReview?.rejected ? "Rejected" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reject Review Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Review</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this review?
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedReview) handleReviewAction(selectedReview, "reject");
              }}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reject Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Review Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedReview) handleReviewAction(selectedReview, "delete");
              }}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

// Skeleton loader for review tables
function ReviewTableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><div className="h-4 w-10 animate-pulse bg-muted rounded" /></TableHead>
            <TableHead><div className="h-4 w-16 animate-pulse bg-muted rounded" /></TableHead>
            <TableHead><div className="h-4 w-12 animate-pulse bg-muted rounded" /></TableHead>
            <TableHead><div className="h-4 w-20 animate-pulse bg-muted rounded" /></TableHead>
            <TableHead><div className="h-4 w-14 animate-pulse bg-muted rounded" /></TableHead>
            <TableHead><div className="h-4 w-16 animate-pulse bg-muted rounded ml-auto" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 3 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full animate-pulse bg-muted" />
                  <div className="h-4 w-20 animate-pulse bg-muted rounded" />
                </div>
              </TableCell>
              <TableCell><div className="h-4 w-24 animate-pulse bg-muted rounded" /></TableCell>
              <TableCell>
                <div className="flex items-center">
                  <div className="h-4 w-20 animate-pulse bg-muted rounded" />
                </div>
              </TableCell>
              <TableCell><div className="h-4 w-32 animate-pulse bg-muted rounded" /></TableCell>
              <TableCell><div className="h-4 w-16 animate-pulse bg-muted rounded" /></TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <div className="h-8 w-16 animate-pulse bg-muted rounded" />
                  <div className="h-8 w-16 animate-pulse bg-muted rounded" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 