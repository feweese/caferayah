"use client";

import { notFound } from "next/navigation";
import Image from "next/image";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { db } from "@/lib/db";
import { MainLayout } from "@/components/layout/main-layout";
import { Size, Temperature, Review, Product } from "@/types/types";
import { ProductReviews } from "@/components/product/product-reviews";
import { Button } from "@/components/ui/button";
import { AddToCartForm } from "@/components/product/add-to-cart-form";
import { SearchParams } from "../page";
import { StarRating } from "@/components/StarRating";
import { Icons } from "@/components/icons";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export type PageParams = {
  id: string;
};

interface ProductData {
  product: Product;
  productImages: string[];
  averageRating: number;
}

export default function ProductPage() {
  const { data: session } = useSession();
  const params = useParams();
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  const id = params.id as string;
  
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProduct() {
      try {
        const response = await fetch(`/api/products/${id}`);
        if (!response.ok) {
          throw new Error('Product not found');
        }
        
        const productData = await response.json();
        
        // Calculate average rating
        const totalRating = productData.reviews.reduce((acc, review) => acc + review.rating, 0);
        const averageRating = productData.reviews.length > 0 
          ? totalRating / productData.reviews.length 
          : 0;

        // Ensure product has at least one image
        const productImages = productData.images && productData.images.length > 0 
          ? productData.images 
          : ["/images/placeholder.jpg"];

        setProductData({
          product: productData,
          productImages,
          averageRating
        });
      } catch (error) {
        console.error("Failed to load product:", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadProduct();
  }, [id]);

  if (loading) {
    return (
      <MainLayout>
        <div className="container py-12 flex justify-center items-center min-h-[60vh]">
          <div className="flex flex-col items-center">
            <div className="animate-spin mb-4">
              <Icons.loader className="h-8 w-8 text-primary" />
            </div>
            <p>Loading product...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!productData) {
    return notFound();
  }

  const { product, productImages, averageRating } = productData;

  return (
    <MainLayout>
      <div className="container py-12 px-4 sm:px-6 lg:px-8">
        {isAdmin && (
          <div className="mb-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-4 flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium">Admin Actions:</span>
              <span className="ml-2 text-muted-foreground">Use these tools to manage this product</span>
            </div>
            <div className="flex gap-2">
              <Link href={`/admin/products/${product.id}`}>
                <Button size="sm" variant="outline" className="h-8 gap-1">
                  <Icons.pencil className="h-3.5 w-3.5" />
                  Edit Product
                </Button>
              </Link>
              <Link href={`/admin/reviews?productId=${product.id}`}>
                <Button size="sm" variant="outline" className="h-8 gap-1">
                  <Icons.messageSquare className="h-3.5 w-3.5" />
                  Manage Reviews
                </Button>
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main product image */}
            <div className="relative w-full h-[450px] rounded-lg overflow-hidden border shadow-md">
              <Image
                src={productImages[0]}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
                className="object-contain bg-white"
              />
            </div>
            
            {/* Additional images gallery - always show at least the main image thumbnail */}
            <div className="grid grid-cols-4 gap-2">
              {productImages.map((image, index) => (
                <div 
                  key={index} 
                  className="relative aspect-square rounded-md overflow-hidden border cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <Image
                    src={image}
                    alt={`${product.name} - image ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 25vw, 15vw"
                    className="object-contain bg-white"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Product Details */}
          <div>
            <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
            <div className="flex items-center mb-4">
              <StarRating rating={averageRating} size={20} halfStar={true} />
              <span className="ml-2 text-sm text-muted-foreground">
                {product.reviews.length} reviews
              </span>
            </div>
            <p className="text-2xl font-medium mb-4">₱{product.basePrice.toFixed(2)}</p>
            <p className="text-muted-foreground mb-6">{product.description}</p>

            <div className="space-y-4 mb-8">
              <div>
                <h3 className="font-medium mb-2">Available Sizes</h3>
                <div className="flex gap-2">
                  {product.sizes.map((size: any) => {
                    // Get size-specific price if available
                    let sizePrice = product.basePrice;
                    const priceDiff = 0;
                    
                    if (product.sizePricing && (product.sizePricing as Record<string, number>)[size]) {
                      sizePrice = (product.sizePricing as Record<string, number>)[size];
                    } else if (size === "TWENTY_TWO_OZ") {
                      sizePrice = product.basePrice + 30; // Default increase
                    }
                    
                    // Calculate price difference for 22oz
                    const priceDifference = size === "TWENTY_TWO_OZ" 
                      ? sizePrice - product.basePrice
                      : 0;
                    
                    return (
                      <div
                        key={size}
                        className="bg-muted px-3 py-1 rounded-full text-sm"
                      >
                        {size === "SIXTEEN_OZ" ? "16oz" : "22oz"} 
                        {size === "SIXTEEN_OZ" ? 
                          ` (₱${product.basePrice.toFixed(2)})` : 
                          ` (₱${sizePrice.toFixed(2)}${priceDifference > 0 ? `, +₱${priceDifference.toFixed(2)}` : ''})`}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">Temperature Options</h3>
                <div className="flex gap-2">
                  {product.temperatures.map((temp: any) => (
                    <div
                      key={temp}
                      className="bg-muted px-3 py-1 rounded-full text-sm"
                    >
                      {temp === "HOT" 
                        ? "Hot" 
                        : temp === "ICED" 
                          ? "Iced" 
                          : "Hot & Iced"}
                    </div>
                  ))}
                </div>
              </div>
              {product.addons.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Add-ons</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.addons.map((addon: any) => (
                      <div
                        key={addon.id}
                        className="bg-muted px-3 py-1 rounded-full text-sm"
                      >
                        {addon.name} (+₱{addon.price.toFixed(2)})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isAdmin ? (
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 rounded-md p-4 text-amber-800 dark:text-amber-300">
                <div className="flex items-center gap-2 mb-2">
                  <Icons.alertCircle className="h-4 w-4" />
                  <h3 className="font-medium">Admin Preview Mode</h3>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Ordering is disabled in admin preview mode. Return to admin dashboard to manage products.
                </p>
              </div>
            ) : (
              <AddToCartForm product={product} />
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-16">
          {isAdmin && (
            <div className="mb-4 text-right">
              <Link href={`/admin/reviews?productId=${product.id}`}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Icons.settings className="h-3.5 w-3.5" />
                  Manage All Reviews
                </Button>
              </Link>
            </div>
          )}
          <ProductReviews productId={product.id} reviews={product.reviews as Review[]} />
        </div>
      </div>
    </MainLayout>
  );
} 