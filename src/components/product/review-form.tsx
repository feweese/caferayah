"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Icons } from "@/components/icons";
import { StarRating } from "@/components/StarRating";

interface ReviewFormProps {
  productId: string;
  orderId: string;
  onCancel: () => void;
  onSuccess: () => void;
}

interface FormValues {
  rating: number;
  comment: string;
}

// Form validation schema
const formSchema = z.object({
  rating: z.number().min(1, "Please select a rating").max(5),
  comment: z.string().optional(),
});

export function ReviewForm({ productId, orderId, onCancel, onSuccess }: ReviewFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [isCheckingReview, setIsCheckingReview] = useState(true);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rating: 0,
      comment: "",
    },
  });

  const rating = form.watch("rating");

  // Check if user has already reviewed this product for this order when component mounts
  useEffect(() => {
    async function checkExistingReview() {
      try {
        setIsCheckingReview(true);
        const response = await fetch(`/api/reviews/check?productId=${productId}&orderId=${orderId}`);
        const data = await response.json();
        
        if (response.ok && data.hasReviewed) {
          setHasReviewed(true);
          toast.error("You have already reviewed this product for this order");
          onCancel(); // Close the form since user has already reviewed
        }
      } catch (error) {
        console.error("Error checking existing review:", error);
      } finally {
        setIsCheckingReview(false);
      }
    }
    
    checkExistingReview();
  }, [productId, orderId, onCancel]);

  async function onSubmit(values: FormValues) {
    if (!productId || !orderId) {
      toast.error("Missing required information");
      return;
    }

    if (hasReviewed) {
      toast.error("You have already reviewed this product for this order");
      onCancel();
      return;
    }

    setIsLoading(true);

    try {
      // First check if the user can review this product from this order
      const eligibilityResponse = await fetch(`/api/orders/completed?productId=${productId}&orderId=${orderId}`);
      const eligibilityData = await eligibilityResponse.json();
      
      if (!eligibilityResponse.ok) {
        throw new Error("Failed to check review eligibility");
      }
      
      if (!eligibilityData.canReview) {
        throw new Error("You can only review products from completed orders");
      }

      // Check if the user has already reviewed this product for this order again (double-check)
      const existingReviewResponse = await fetch(`/api/reviews/check?productId=${productId}&orderId=${orderId}`);
      const existingReviewData = await existingReviewResponse.json();
      
      if (existingReviewResponse.ok && existingReviewData.hasReviewed) {
        setHasReviewed(true);
        throw new Error("You have already reviewed this product for this order");
      }

      // Submit the review
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          orderId,
          rating: values.rating,
          comment: values.comment,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      toast.success("Review submitted successfully and pending approval");
      setHasReviewed(true); // Mark as reviewed after successful submission
      onSuccess();
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error(error instanceof Error ? error.message : "Failed to submit review");
    } finally {
      setIsLoading(false);
    }
  }

  if (isCheckingReview) {
    return (
      <div className="bg-card border rounded-lg p-6 flex flex-col items-center justify-center">
        <Icons.spinner className="animate-spin h-8 w-8 mb-4" />
        <p>Checking review status...</p>
      </div>
    );
  }

  if (hasReviewed) {
    return (
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Review Already Submitted</h3>
        <p>You have already submitted a review for this product. Thank you for your feedback!</p>
        <div className="mt-4">
          <Button onClick={onCancel}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Write a Review</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rating</FormLabel>
                <FormControl>
                  <StarRating 
                    rating={field.value} 
                    onChange={field.onChange}
                    size={24}
                    interactive={true}
                  />
                </FormControl>
                <FormDescription>
                  Select a rating from 1 to 5 stars
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="comment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comment (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Share your experience with this product (optional)..."
                    {...field}
                    disabled={isLoading}
                    rows={4}
                  />
                </FormControl>
                <FormDescription>
                  Your review will be visible once approved by an administrator
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || rating === 0}>
              {isLoading ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : "Submit Review"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
} 