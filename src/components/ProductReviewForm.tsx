"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/StarRating";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ProductReviewFormProps {
  productId: string;
  existingReview?: {
    id: string;
    rating: number;
    comment: string;
  };
}

export function ProductReviewForm({
  productId,
  existingReview,
}: ProductReviewFormProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to leave a review",
        variant: "destructive",
      });
      router.push("/login");
      return;
    }

    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a rating before submitting",
        variant: "destructive",
      });
      return;
    }

    if (comment.trim().length < 3) {
      toast({
        title: "Review too short",
        description: "Please write a more detailed review",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          rating,
          comment,
          reviewId: existingReview?.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit review");
      }

      const data = await response.json();
      
      toast({
        title: existingReview ? "Review updated" : "Review submitted",
        description: existingReview 
          ? "Your review has been updated and is pending approval" 
          : "Your review has been submitted and is pending approval",
      });
      
      // Clear form if it's a new review
      if (!existingReview) {
        setRating(0);
        setComment("");
      }
      
      // Refresh the page to show the pending review
      router.refresh();
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Something went wrong",
        description: error instanceof Error ? error.message : "Failed to submit review",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Write a Review</CardTitle>
          <CardDescription>
            Share your experience with this product
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please <Button variant="link" className="p-0" onClick={() => router.push("/login")}>sign in</Button> to leave a review
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{existingReview ? "Update Your Review" : "Write a Review"}</CardTitle>
        <CardDescription>
          {existingReview 
            ? "Update your experience with this product" 
            : "Share your experience with this product"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="rating" className="block text-sm font-medium">
              Rating
            </label>
            <StarRating 
              rating={rating} 
              onChange={setRating} 
              size={24} 
              interactive
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="comment" className="block text-sm font-medium">
              Review
            </label>
            <Textarea
              id="comment"
              placeholder="What did you like or dislike about this product?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              required
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Your review will be visible once approved by an admin
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            disabled={isSubmitting || rating === 0 || comment.trim().length < 3}
          >
            {isSubmitting 
              ? "Submitting..." 
              : existingReview 
                ? "Update Review" 
                : "Submit Review"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
} 