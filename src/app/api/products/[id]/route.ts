import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Ensure the URL path is processed correctly
  const url = request.nextUrl.pathname;
  const segments = url.split('/');
  const id = segments[segments.length - 1]; // Get the last segment as ID
  
  if (!id) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }
  
  try {    
    const product = await db.product.findUnique({
      where: {
        id,
      },
      include: {
        reviews: {
          include: {
            user: true,
          },
          where: {
            approved: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        addons: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json({ error: "Error fetching product" }, { status: 500 });
  }
} 