"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Size, Temperature } from "@/types/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  images: string[];
  temperatures: Temperature[] | string[];
  sizes: Size[] | string[];
  averageRating: number;
  reviewCount: number;
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  
  const displayImage = product.images && product.images.length > 0 
    ? product.images[0] 
    : "/images/placeholder.jpg";

  // Handle case when averageRating is undefined
  const rating = product.averageRating || 0;
  const reviews = product.reviewCount || 0;

  return (
    <Card className="overflow-hidden flex flex-col h-full group transition-all duration-300 hover:shadow-lg border border-border/60 hover:border-primary/20 relative">
      {isAdmin && (
        <div className="absolute top-2 right-2 z-20">
          <Link href={`/admin/products/${product.id}`}>
            <Button variant="secondary" size="sm" className="h-8 gap-1 opacity-90 hover:opacity-100 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm shadow-sm">
              <Icons.pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
        </div>
      )}
      <Link href={`/menu/${product.id}`} className="block h-full">
        <div className="relative h-56 w-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <Image
            src={displayImage}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            priority
          />
          {/* Sale/New tag if needed - can be added back later */}
        </div>
        <CardContent className="flex-1 p-5">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">{product.name}</h3>
            <div className="flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-full">
              <span className="font-semibold text-sm">{rating.toFixed(1)}</span>
              <StarRating rating={rating} size={14} />
              <span className="text-xs text-muted-foreground ml-0.5">({reviews})</span>
            </div>
          </div>
          <p className="text-muted-foreground text-sm mt-2 mb-3 line-clamp-2 h-10">
            {product.description}
          </p>
          
          <div className="flex flex-wrap gap-1.5 mb-2">
            {product.temperatures && Array.isArray(product.temperatures) && (
              <>
                {product.temperatures.includes("HOT") && (
                  <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                    Hot
                  </span>
                )}
                {product.temperatures.includes("ICED") && (
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                    Iced
                  </span>
                )}
                {product.temperatures.includes("BOTH") && (
                  <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                    Hot & Iced
                  </span>
                )}
              </>
            )}
            {product.sizes && Array.isArray(product.sizes) && (
              <div className="flex gap-1">
                {product.sizes.map((size) => (
                  <span
                    key={size}
                    className="bg-muted text-xs px-2 py-0.5 rounded-full"
                  >
                    {size === "SIXTEEN_OZ" ? "16oz" : "22oz"}
                  </span>
                ))}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-0 pb-5 px-5 mt-auto flex justify-between items-center border-t border-border/40">
          <p className="font-bold text-lg">₱{product.basePrice.toFixed(2)}</p>
          <div className="bg-primary/10 group-hover:bg-primary text-primary group-hover:text-primary-foreground px-3 py-1.5 rounded-full text-sm transition-colors duration-300">
            View Details
          </div>
        </CardFooter>
      </Link>
    </Card>
  );
} 