"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ReviewProductButtonProps {
  productId: string;
  orderId: string;
  reviewed: boolean;
  productName: string;
}

export default function ReviewProductButton({
  productId,
  orderId,
  reviewed,
  productName,
}: ReviewProductButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hoveredStar, setHoveredStar] = useState(0);
  const [isReviewed, setIsReviewed] = useState(reviewed);

  // If the reviewed prop changes, update our local state
  useEffect(() => {
    setIsReviewed(reviewed);
  }, [reviewed]);

  const handleOpenReviewDialog = async () => {
    try {
      setIsLoading(true);
      
      // Check if the user has already reviewed this product before opening the dialog
      const existingReviewResponse = await fetch(`/api/reviews/check?productId=${productId}&orderId=${orderId}`);
      const existingReviewData = await existingReviewResponse.json();
      
      if (existingReviewResponse.ok && existingReviewData.hasReviewed) {
        setIsReviewed(true);
        toast.info("You have already reviewed this product. Thank you for your feedback!");
        return;
      }
      
      // If no existing review, open the dialog
      setShowReviewDialog(true);
    } catch (error) {
      console.error("Error checking review status:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    try {
      setIsLoading(true);
      
      // First check if the user can review this product from this order
      const eligibilityResponse = await fetch(`/api/orders/completed?productId=${productId}&orderId=${orderId}`);
      const eligibilityData = await eligibilityResponse.json();
      
      if (!eligibilityResponse.ok) {
        toast.error("Failed to check review eligibility");
        setShowReviewDialog(false);
        return;
      }
      
      if (!eligibilityData.canReview) {
        toast.error("You can only review products from completed orders");
        setShowReviewDialog(false);
        return;
      }

      // Check if the user has already reviewed this product for this order
      const existingReviewResponse = await fetch(`/api/reviews/check?productId=${productId}&orderId=${orderId}`);
      const existingReviewData = await existingReviewResponse.json();
      
      if (existingReviewResponse.ok && existingReviewData.hasReviewed) {
        toast.info("You have already reviewed this product. Thank you for your feedback!");
        setIsReviewed(true);
        setShowReviewDialog(false);
        return;
      }

      // Submit the review with orderId
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          orderId,
          rating,
          comment,
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        data = { error: "Invalid response format" };
      }

      if (!response.ok) {
        if (data.error && data.error.includes("already reviewed")) {
          toast.info("You have already reviewed this product. Thank you for your feedback!");
          setIsReviewed(true);
          setShowReviewDialog(false);
          return;
        }
        
        toast.error(data.error || "Something went wrong with the submission");
        return;
      }

      toast.success("Review submitted successfully and pending approval!");
      setShowReviewDialog(false);
      setIsReviewed(true);
      
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (isReviewed) {
    return (
      <div className="w-full flex items-center justify-center py-1.5 px-3 rounded-md bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 shadow-sm">
        <div className="flex items-center justify-center space-x-1.5">
          <span className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center">
            <Icons.check className="h-3 w-3 text-green-600" />
          </span>
          <span className="text-sm font-medium text-green-700">Thanks for your feedback!</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Button 
        variant="default" 
        size="sm" 
        className="w-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 hover:text-amber-800 hover:border-amber-300 font-medium shadow-sm transition-colors"
        onClick={handleOpenReviewDialog}
        disabled={isLoading}
      >
        {isLoading ? (
          <Icons.spinner className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Icons.star className="h-4 w-4 mr-2 text-amber-500 fill-amber-400" />
        )}
        Review
      </Button>

      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 border-b">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-xl flex items-center">
                <Icons.star className="h-5 w-5 mr-2 text-amber-500 fill-amber-400" />
                <span className="text-amber-900 font-semibold">Review {productName}</span>
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Share your experience with this product. Your feedback helps us improve!
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Star Rating */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground/90">Your Rating</label>
              <div className="flex items-center justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="focus:outline-none transition-all duration-150 hover:scale-115"
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onClick={() => setRating(star)}
                  >
                    <Icons.star 
                      className={`h-9 w-9 transition-all duration-200 ${
                        star <= (hoveredStar || rating)
                          ? "text-amber-400 fill-amber-400 scale-110"
                          : "text-muted-foreground/40"
                      }`} 
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-center text-sm font-medium text-amber-600 pt-1">
                  {rating === 1 && "Poor"}
                  {rating === 2 && "Fair"}
                  {rating === 3 && "Good"}
                  {rating === 4 && "Very Good"}
                  {rating === 5 && "Excellent"}
                </p>
              )}
            </div>
            
            {/* Comment */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/90">Comment (Optional)</label>
              <Textarea
                placeholder="Tell us what you think about this product..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="resize-none border-muted/50 focus:border-amber-300"
              />
              <p className="text-xs text-muted-foreground italic mt-1">
                All reviews are subject to approval by our admin team before being published.
              </p>
            </div>
          </div>
          
          <DialogFooter className="p-4 bg-muted/5 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowReviewDialog(false)}
              disabled={isLoading}
              className="border-muted/70"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleReviewSubmit}
              disabled={isLoading || rating === 0}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isLoading ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 