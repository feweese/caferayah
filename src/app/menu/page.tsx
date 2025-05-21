"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ProductCategory, Product, Review } from "@/types/types";
import { MainLayout } from "@/components/layout/main-layout";
import { ProductCard } from "@/components/product/product-card";
import { CategoryFilter } from "@/components/product/category-filter";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";

export type SearchParams = { [key: string]: string | string[] | undefined };

interface ProductWithRating extends Product {
  averageRating: number;
  reviewCount: number;
}

// Component that uses useSearchParams
function MenuContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  
  const [products, setProducts] = useState<ProductWithRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<ProductCategory | undefined>(undefined);

  useEffect(() => {
    async function loadProducts() {
      try {
        // Parse category from search params properly
        const categoryParam = searchParams.get('category');
        const categoryValue = categoryParam ? (categoryParam as ProductCategory) : undefined;
        setCategory(categoryValue);
        
        // Build API URL with category filter if needed
        const url = categoryValue 
          ? `/api/products?category=${categoryValue}` 
          : `/api/products`;
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to load products');
        }
        
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error("Error loading products:", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadProducts();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="container mx-auto py-16 px-4 sm:px-6 lg:px-8 flex justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin mb-4">
            <Icons.logo className="h-10 w-10 text-primary/70" />
          </div>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-16 px-4 sm:px-6 lg:px-8 animate-fadeIn">
      {/* Hero Section with background - admin dashboard style */}
      <div className="flex flex-col items-center mb-16 bg-gradient-to-r from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 p-6 rounded-lg shadow-sm">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 animate-fadeIn">Our Menu</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            Explore our handcrafted beverages, prepared with premium ingredients
            and passion
          </p>
        </div>
      </div>

      {/* Admin actions */}
      {isAdmin && (
        <div className="mb-6 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-4 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-medium">Admin Menu Actions:</span>
            <span className="ml-2 text-muted-foreground">Use these tools to manage your product catalog</span>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/products/new">
              <Button size="sm" variant="outline" className="h-8 gap-1">
                <Icons.plus className="h-3.5 w-3.5" />
                Add New Product
              </Button>
            </Link>
            <Link href="/admin/products">
              <Button size="sm" variant="outline" className="h-8 gap-1">
                <Icons.settings className="h-3.5 w-3.5" />
                Manage All Products
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Category filters */}
      <div className="mb-10">
        <h2 className="text-lg font-medium mb-4 text-center">Browse by Category</h2>
        <CategoryFilter selectedCategory={category} />
      </div>

      {/* Products grid with animation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.length > 0 ? (
          products.map((product: ProductWithRating, index) => (
            <div key={product.id} className="animate-fadeInUp" style={{ animationDelay: `${index * 0.1}s` }}>
              <ProductCard product={product} />
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-16 bg-card rounded-xl shadow-sm border">
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 rounded-full bg-muted">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-muted-foreground">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="11" y1="8" x2="11" y2="14"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </div>
              <p className="text-lg font-medium">No products found</p>
              <p className="text-muted-foreground">Please try a different category</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function MenuPage() {
  return (
    <MainLayout>
      <Suspense fallback={
        <div className="container mx-auto py-16 px-4 sm:px-6 lg:px-8 flex justify-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin mb-4">
              <Icons.logo className="h-10 w-10 text-primary/70" />
            </div>
            <p>Loading products...</p>
          </div>
        </div>
      }>
        <MenuContent />
      </Suspense>
    </MainLayout>
  );
} 