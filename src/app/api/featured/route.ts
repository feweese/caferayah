import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Try to fetch products with featured flag first
    let featuredProducts = await db.product.findMany({
      where: {
        featured: true,
        inStock: true,
      },
      take: 3,
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // If no featured products, fall back to recent products
    if (featuredProducts.length === 0) {
      featuredProducts = await db.product.findMany({
        where: {
          inStock: true,
        },
        take: 3,
        orderBy: {
          updatedAt: 'desc'
        }
      });
    }

    return NextResponse.json(featuredProducts);
  } catch (error) {
    console.error("Error fetching featured products:", error);
    return NextResponse.json(
      { error: "Failed to fetch featured products" },
      { status: 500 }
    );
  }
} 