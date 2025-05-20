"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Review } from "@/types/types";
import { StarRating } from "@/components/StarRating";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Extend the Review type to include order property
interface ExtendedReview extends Review {
  order?: {
    id: string;
    createdAt: Date | string;
  };
}

interface ProductReviewsProps {
  productId: string;
  reviews: ExtendedReview[];
}

export function ProductReviews({ productId, reviews }: ProductReviewsProps) {
  const { data: session } = useSession();
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [filteredReviews, setFilteredReviews] = useState<ExtendedReview[]>(reviews);
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 5;
  
  // Apply filtering and sorting when dependencies change
  useEffect(() => {
    let result = [...reviews];
    
    // Apply rating filter if selected
    if (filterRating !== null) {
      result = result.filter(review => review.rating === filterRating);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === "highest") {
        return b.rating - a.rating;
      } else if (sortBy === "lowest") {
        return a.rating - b.rating;
      }
      return 0;
    });
    
    setFilteredReviews(result);
    setCurrentPage(1); // Reset to first page when filters or sort changes
  }, [reviews, filterRating, sortBy]);
  
  // Calculate average rating
  const averageRating = reviews.length 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  // Calculate rating distribution
  const ratingCounts = [0, 0, 0, 0, 0]; // Index 0 = 1 star, Index 4 = 5 stars
  reviews.forEach(review => {
    if (review.rating >= 1 && review.rating <= 5) {
      ratingCounts[review.rating - 1]++;
    }
  });
  
  // Calculate percentages for distribution bars
  const ratingPercentages = ratingCounts.map(count => 
    reviews.length > 0 ? (count / reviews.length) * 100 : 0
  );
  
  const resetFilter = () => {
    setFilterRating(null);
    setSortBy("newest");
    setCurrentPage(1);
  };
  
  // Pagination calculations
  const totalPages = Math.ceil(filteredReviews.length / reviewsPerPage);
  const indexOfLastReview = currentPage * reviewsPerPage;
  const indexOfFirstReview = indexOfLastReview - reviewsPerPage;
  const currentReviews = filteredReviews.slice(indexOfFirstReview, indexOfLastReview);
  
  // Create an array of page numbers
  const pageNumbers = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }
  
  // Handle page change
  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
      // Scroll to top of reviews section
      window.scrollTo({ 
        top: document.getElementById('reviews-section')?.offsetTop || 0, 
        behavior: 'smooth' 
      });
    }
  };
  
  // Group reviews by user for display
  const groupedReviews = currentReviews.reduce((acc, review) => {
    const date = new Date(review.createdAt).toLocaleDateString('en-US', {
      timeZone: 'UTC'
    });
    return {
      ...acc,
      [review.user.name + date]: [...(acc[review.user.name + date] || []), review]
    };
  }, {} as Record<string, typeof currentReviews>);

  return (
    <div className="space-y-6" id="reviews-section">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold tracking-tight">Customer Reviews</h3>
        {(filterRating !== null || sortBy !== "newest") && (
          <div className="bg-muted/40 px-3 py-1 rounded-full text-sm flex items-center gap-1.5">
            {filterRating !== null && <span>Showing {filterRating}-star reviews</span>}
            {filterRating !== null && sortBy !== "newest" && <span className="mx-1">•</span>}
            {sortBy !== "newest" && (
              <span>
                Sorted by {sortBy === "oldest" ? "oldest" : sortBy === "highest" ? "highest rated" : "lowest rated"}
              </span>
            )}
            <button 
              onClick={resetFilter}
              className="rounded-full bg-muted/60 h-4 w-4 inline-flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Average rating display */}
            <div className="flex items-end gap-3">
              <span className="text-4xl font-bold leading-none">{averageRating.toFixed(1)}</span>
              <div className="flex flex-col pb-0.5">
                <StarRating rating={averageRating} size={18} />
                <span className="text-sm text-muted-foreground mt-1">{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</span>
              </div>
            </div>
            
            {/* Rating distribution */}
            <div className="flex-grow max-w-md">
              <h4 className="text-sm font-medium mb-2">Rating Distribution</h4>
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="flex items-center gap-2 mb-1.5">
                  <div className="flex items-center w-16">
                    <button 
                      onClick={() => setFilterRating(filterRating === star ? null : star)}
                      className={`text-sm mr-1 hover:underline flex items-center ${filterRating === star ? 'font-semibold text-primary' : ''}`}
                    >
                      {star}
                      <Icons.star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 ml-1" />
                    </button>
                  </div>
                  <div 
                    className="h-2 flex-grow bg-muted rounded-full overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setFilterRating(filterRating === star ? null : star)}
                  >
                    <div 
                      className="h-full bg-amber-400" 
                      style={{ width: `${ratingPercentages[star - 1]}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {ratingCounts[star - 1]}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Filter and sort controls */}
          <div className="mt-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium pt-1">Filter:</span>
              {[5, 4, 3, 2, 1].map(star => (
                <Button 
                  key={star}
                  variant={filterRating === star ? "default" : "outline"}
                  size="sm"
                  className="h-8 gap-1"
                  onClick={() => setFilterRating(filterRating === star ? null : star)}
                >
                  {star}-Star <Icons.star className={`h-3 w-3 ${filterRating === star ? "" : "text-amber-400 fill-amber-400"}`} />
                </Button>
              ))}
              {filterRating !== null && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => setFilterRating(null)}
                >
                  Clear Filter
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Sort by:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Sort reviews" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="highest">Highest Rated</SelectItem>
                  <SelectItem value="lowest">Lowest Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="h-px bg-border w-full mt-6"></div>
        </div>
      )}

      {filteredReviews.length > 0 ? (
        <>
          <div className="space-y-6">
            {Object.entries(groupedReviews).map(([key, userReviews]) => (
              <div key={key} className="space-y-4">
                {userReviews.map(review => (
                  <div key={review.id} className="border rounded-md p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        {review.user.image ? (
                          <AvatarImage src={review.user.image} alt={review.user.name} />
                        ) : (
                          <AvatarFallback>{review.user.name?.charAt(0)}</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{review.user.name}</p>
                          <StarRating rating={review.rating} size={16} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            timeZone: 'UTC'
                          })} at {new Date(review.createdAt).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                            timeZone: 'UTC'
                          })}
                        </p>
                      </div>
                    </div>
                    
                    {review.comment && (
                      <div className="text-sm leading-relaxed">{review.comment}</div>
                    )}
                    
                    {review.order && (
                      <div className="text-xs text-muted-foreground">
                        Order date: {new Date(review.order.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          timeZone: 'UTC'
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => paginate(currentPage - 1)}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                      size="default"
                    />
                  </PaginationItem>
                  
                  {pageNumbers.map(number => {
                    // Simple pagination for small number of pages
                    if (totalPages <= 5 || 
                        number === 1 || 
                        number === totalPages || 
                        (number >= currentPage - 1 && number <= currentPage + 1)) {
                      return (
                        <PaginationItem key={number}>
                          <PaginationLink 
                            isActive={number === currentPage}
                            onClick={() => paginate(number)}
                            size="default"
                          >
                            {number}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }
                    
                    // Add ellipsis for large pagination
                    if ((number === 2 && currentPage > 3) || 
                        (number === totalPages - 1 && currentPage < totalPages - 2)) {
                      return (
                        <PaginationItem key={number}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    
                    return null;
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => paginate(currentPage + 1)}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                      size="default"
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
          
          {/* Summary showing the current page info */}
          {totalPages > 1 && (
            <div className="text-center text-xs text-muted-foreground mt-2">
              Showing {indexOfFirstReview + 1}-{Math.min(indexOfLastReview, filteredReviews.length)} of {filteredReviews.length} reviews
            </div>
          )}
        </>
      ) : reviews.length > 0 ? (
        <div className="text-center py-10 border rounded-md">
          <p className="text-muted-foreground">No reviews match the selected filter.</p>
          <Button variant="link" onClick={resetFilter} className="mt-2">
            Clear filter and show all reviews
          </Button>
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No reviews yet. Reviews can be written after completing an order.</p>
        </div>
      )}
    </div>
  );
} 