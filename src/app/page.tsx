"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/main-layout";
import { Coffee, ShoppingBag, Star, Users, ArrowRight } from "lucide-react";
import { getImagePath } from "@/lib/products";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface Product {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  images: string[];
}

export default function Home() {
  const { data: session } = useSession();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch featured products from API
  useEffect(() => {
    const fetchFeaturedProducts = async () => {
      try {
        const response = await fetch('/api/featured');
        if (response.ok) {
          const data = await response.json();
          setFeaturedProducts(data);
        } else {
          console.error("Failed to fetch featured products");
          setFeaturedProducts([]);
        }
      } catch (error) {
        console.error("Error fetching featured products:", error);
        setFeaturedProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedProducts();
  }, []);

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="container px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Where Every Sip <br />
                <span className="text-primary">Brews a Story</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-md">
                Experience the finest coffee crafted with passion at Caférayah, your modern coffee destination in the Philippines.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <Link href="/menu">
                  <Button size="lg">View Menu</Button>
                </Link>
                <Link href="/about">
                  <Button variant="outline" size="lg">Learn More</Button>
                </Link>
              </div>
            </div>
            <div className="relative h-[300px] md:h-[500px] bg-gradient-to-br from-amber-50 to-amber-200 rounded-lg flex items-center justify-center">
              <Coffee className="h-32 w-32 text-amber-800 opacity-50" />
              <div className="absolute bottom-8 left-8 right-8 text-center bg-background/80 p-4 rounded-lg backdrop-blur-sm">
                <p className="text-amber-800 font-medium">Premium coffee, exceptional experience</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-muted/50">
        <div className="container px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Featured Products</h2>
            <p className="text-muted-foreground text-center max-w-2xl">
              Discover our most loved coffee creations, crafted with passion and precision
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {isLoading ? (
              // Loading placeholders
              Array.from({ length: 3 }).map((_, index) => (
                <div className="bg-background rounded-xl shadow-sm overflow-hidden border animate-pulse" key={index}>
                  <div className="aspect-[4/3] bg-gradient-to-br from-amber-100 to-amber-200 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-16 w-16 rounded-full bg-amber-800/20"></div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="h-6 bg-muted rounded-md mb-2 w-3/4"></div>
                    <div className="h-4 bg-muted rounded-md mb-2 w-full"></div>
                    <div className="h-4 bg-muted rounded-md mb-4 w-2/3"></div>
                    <div className="h-5 bg-muted rounded-md w-1/4"></div>
                  </div>
                </div>
              ))
            ) : featuredProducts.length > 0 ? (
              featuredProducts.map((product) => (
                <Link 
                  href={`/menu/${product.id}`} 
                  key={product.id} 
                  className="group relative bg-background rounded-xl shadow-sm overflow-hidden border hover:shadow-md transition-all duration-300 hover:translate-y-[-4px]"
                >
                  <div className="aspect-[4/3] bg-gradient-to-br from-amber-100 to-amber-200 relative overflow-hidden">
                    {product.images && product.images.length > 0 ? (
                      <>
                        <Image 
                          src={getImagePath(product.images[0])}
                          alt={product.name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Coffee className="h-20 w-20 text-amber-800 opacity-60" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <div className="bg-primary/90 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
                        Featured
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
                      <span className="font-medium text-primary whitespace-nowrap">₱{product.basePrice.toFixed(2)}</span>
                    </div>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {product.description}
                    </p>
                    <div className="mt-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {product.category.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                          ).join(' ')}
                        </span>
                        <span className="text-sm text-primary font-medium inline-flex items-center group-hover:translate-x-1 transition-transform duration-200">
                          View Details <ArrowRight className="ml-1 h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              // Display 3 placeholder products if no featured products are available
              Array.from({ length: 3 }).map((_, index) => (
                <div className="bg-background rounded-xl shadow-sm overflow-hidden border hover:shadow-md transition-all" key={index}>
                  <div className="aspect-[4/3] bg-gradient-to-br from-amber-100 to-amber-200 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Coffee className="h-20 w-20 text-amber-800 opacity-60" />
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <h3 className="font-semibold text-lg">
                        {index === 0 ? "Premium Latte" : index === 1 ? "Signature Mocha" : "Matcha Fusion"}
                      </h3>
                      <span className="font-medium text-primary">
                        ₱{index === 0 ? "150.00" : index === 1 ? "175.00" : "180.00"}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm mb-4">
                      {index === 0 
                        ? "Rich espresso blended with smooth steamed milk" 
                        : index === 1 
                          ? "Espresso with chocolate and steamed milk" 
                          : "Premium matcha with a hint of vanilla"}
                    </p>
                    <div className="mt-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {index === 0 ? "Coffee" : index === 1 ? "Coffee" : "Matcha Series"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-12 text-center">
            <Link href="/menu">
              <Button variant="secondary">View All Products</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16">
        <div className="container px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold">About Caférayah</h2>
            <p className="text-muted-foreground">
              Founded in March 2024 by Romiel Ambrosio & Aaliyah Aligada, Caférayah is a modern coffee shop located in Pateros, Metro Manila. We source the finest beans and ingredients to create exceptional coffee experiences.
            </p>
            <p className="text-muted-foreground">
              Our passion for quality and innovation drives us to craft beverages that delight and inspire our customers every day.
            </p>
            <div className="mx-auto mt-4">
              <Link href="/about">
                <Button variant="outline">Our Story</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Loyalty Program */}
      <section className="py-16 bg-primary/5">
        <div className="container px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Join Our Loyalty Program</h2>
            <p className="text-muted-foreground max-w-2xl">
              Earn points with every purchase and enjoy exclusive rewards and discounts
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="bg-background rounded-lg p-6 shadow-sm border">
              <div className="flex justify-center mb-4">
                <ShoppingBag className="h-10 w-10 text-primary/80" />
              </div>
              <h3 className="font-semibold text-lg mb-4 text-center">Earn Points</h3>
              <p className="text-muted-foreground text-center">
                ₱100 spent = 1 point added to your account automatically
              </p>
            </div>
            <div className="bg-background rounded-lg p-6 shadow-sm border">
              <div className="flex justify-center mb-4">
                <Star className="h-10 w-10 text-primary/80" />
              </div>
              <h3 className="font-semibold text-lg mb-4 text-center">Redeem Rewards</h3>
              <p className="text-muted-foreground text-center">
                Use your points for discounts on future purchases
              </p>
            </div>
          </div>
          <div className="mt-12 text-center">
            {session?.user ? (
              <Link href="/profile">
                <Button>My Rewards</Button>
              </Link>
            ) : (
              <Link href="/register">
                <Button>Join Now</Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
