import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    // Get URL to extract category filter 
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    
    // Find products with optional category filter
    const products = await db.product.findMany({
      where: category
        ? {
            category: category,
          }
        : undefined,
      include: {
        reviews: {
          where: {
            approved: true, // Only fetch approved reviews
          },
        },
        addons: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Calculate average ratings
    const productsWithRating = products.map((product: any) => {
      // Only use approved reviews for calculations
      const totalRating = product.reviews.reduce((acc: number, review: any) => acc + review.rating, 0);
      const averageRating = product.reviews.length > 0 
        ? totalRating / product.reviews.length 
        : 0;
      
      return {
        ...product,
        averageRating,
        reviewCount: product.reviews.length,
      };
    });

    return NextResponse.json(productsWithRating);
  } catch (error) {
    console.error("Error fetching products:", error);
    return new NextResponse(
      JSON.stringify({ error: "Error fetching products" }),
      { status: 500 }
    );
  }
} 