"use client";

import { useState } from "react";
import { Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number; 
  onChange?: (rating: number) => void;
  size?: number;
  className?: string;
  interactive?: boolean;
  halfStar?: boolean;
}

export function StarRating({
  rating,
  onChange,
  size = 20,
  className,
  interactive = false,
  halfStar = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [tempRating, setTempRating] = useState(0);

  const handleMouseEnter = (index: number) => {
    if (!interactive) return;
    setHoverRating(index);
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setHoverRating(0);
  };

  const handleClick = (index: number) => {
    if (!interactive || !onChange) return;
    
    // If clicking on the same star twice, reset it
    if (rating === index) {
      onChange(0);
      return;
    }
    
    onChange(index);
  };

  // Calculate the display rating (either the hover rating or the actual rating)
  const displayRating = hoverRating || rating;

  // Generate an array of 5 stars
  const stars = Array.from({ length: 5 }, (_, i) => i + 1);

  return (
    <div 
      className={cn("flex items-center", className)}
      onMouseLeave={handleMouseLeave}
    >
      {stars.map((star) => {
        const isFilled = star <= displayRating;
        const isHalfFilled = halfStar && star === Math.ceil(displayRating) && displayRating % 1 !== 0;
        
        return (
          <div
            key={star}
            className={cn(
              "relative cursor-default transition-transform", 
              interactive && "cursor-pointer hover:scale-110",
              "mr-0.5"
            )}
            onMouseEnter={() => handleMouseEnter(star)}
            onClick={() => handleClick(star)}
          >
            {isHalfFilled ? (
              <StarHalf 
                size={size} 
                className={cn(
                  "fill-primary stroke-primary",
                )}
              />
            ) : (
              <Star 
                size={size} 
                className={cn(
                  isFilled ? "fill-primary stroke-primary" : "stroke-muted-foreground",
                )}
              />
            )}
          </div>
        );
      })}
      
      {interactive && (
        <span className="ml-2 text-sm text-muted-foreground">
          {displayRating > 0 ? `${displayRating}/5` : "Select rating"}
        </span>
      )}
    </div>
  );
} 